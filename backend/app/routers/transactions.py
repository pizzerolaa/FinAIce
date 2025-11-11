from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Optional
from app.database import get_db
from app.models import Transaction, User, FixedExpense
from app.schemas import TransactionResponse, DashboardResponse, CategorySummary, TopTransaction, UpcomingPayment
from app.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transactions with filters"""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if category:
        query = query.filter(Transaction.category == category)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    transactions = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    return transactions

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    months: int = Query(6, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard data with summaries and trends"""
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=months * 30)
    
    # Get all transactions in range
    transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date <= end_date
        )
    ).all()
    
    # Calculate totals
    total_income = sum(t.amount for t in transactions if t.transaction_type == "income")
    total_expenses = sum(t.amount for t in transactions if t.transaction_type == "expense")
    net_balance = total_income - total_expenses
    
    # Category summary
    category_totals = {}
    category_counts = {}
    for trans in transactions:
        if trans.transaction_type == "expense" and trans.category:
            category_totals[trans.category] = category_totals.get(trans.category, 0) + trans.amount
            category_counts[trans.category] = category_counts.get(trans.category, 0) + 1
    
    category_summary = [
        CategorySummary(category=cat, total=total, count=category_counts.get(cat, 0))
        for cat, total in category_totals.items()
    ]
    
    # Monthly trend
    monthly_data = {}
    for trans in transactions:
        month_key = trans.date.strftime("%Y-%m")
        if month_key not in monthly_data:
            monthly_data[month_key] = {"income": 0, "expenses": 0}
        if trans.transaction_type == "income":
            monthly_data[month_key]["income"] += trans.amount
        else:
            monthly_data[month_key]["expenses"] += trans.amount
    
    monthly_trend = [
        {
            "month": month,
            "income": data["income"],
            "expenses": data["expenses"],
            "net": data["income"] - data["expenses"]
        }
        for month, data in sorted(monthly_data.items())
    ]
    
    # Top 10 largest expenses
    top_expenses = sorted(
        [t for t in transactions if t.transaction_type == "expense"],
        key=lambda x: x.amount,
        reverse=True
    )[:10]
    
    top_expenses_list = [
        TopTransaction(
            description=t.description[:50],  # Limit description length
            amount=t.amount,
            date=t.date,
            category=t.category
        )
        for t in top_expenses
    ]
    
    # Calculate upcoming payments from fixed expenses
    fixed_expenses = db.query(FixedExpense).filter(
        FixedExpense.user_id == current_user.id,
        FixedExpense.active == True
    ).all()
    
    upcoming_payments = []
    today = datetime.utcnow().date()
    
    for expense in fixed_expenses:
        if expense.recurring == "monthly" and expense.day_of_month:
            # Calculate next payment date
            current_month = today.month
            current_year = today.year
            
            # Try to create date for this month
            try:
                payment_date = datetime(current_year, current_month, expense.day_of_month).date()
                if payment_date < today:
                    # If date has passed, move to next month
                    if current_month == 12:
                        payment_date = datetime(current_year + 1, 1, expense.day_of_month).date()
                    else:
                        payment_date = datetime(current_year, current_month + 1, expense.day_of_month).date()
            except ValueError:
                # Handle invalid dates (e.g., Feb 30) - use last day of month
                if current_month == 12:
                    next_month = 1
                    next_year = current_year + 1
                else:
                    next_month = current_month + 1
                    next_year = current_year
                
                # Get last day of next month
                if next_month == 12:
                    last_day = 31
                elif next_month in [4, 6, 9, 11]:
                    last_day = 30
                elif next_month == 2:
                    last_day = 29 if (next_year % 4 == 0 and next_year % 100 != 0) or (next_year % 400 == 0) else 28
                else:
                    last_day = 31
                
                payment_date = datetime(next_year, next_month, min(expense.day_of_month, last_day)).date()
            
            days_until = (payment_date - today).days
            if days_until <= 60:  # Show payments within next 60 days
                upcoming_payments.append(UpcomingPayment(
                    name=expense.name,
                    amount=expense.amount,
                    due_date=payment_date.strftime("%Y-%m-%d"),
                    days_until=days_until,
                    category=expense.category
                ))
        elif expense.recurring == "weekly":
            # For weekly, show next 4 weeks
            for week in range(4):
                payment_date = today + timedelta(days=7 * (week + 1))
                days_until = (payment_date - today).days
                upcoming_payments.append(UpcomingPayment(
                    name=expense.name,
                    amount=expense.amount,
                    due_date=payment_date.strftime("%Y-%m-%d"),
                    days_until=days_until,
                    category=expense.category
                ))
        elif expense.recurring == "yearly":
            # For yearly, show next payment
            payment_date = datetime(current_year, 1, 1).date()
            if payment_date < today:
                payment_date = datetime(current_year + 1, 1, 1).date()
            days_until = (payment_date - today).days
            if days_until <= 365:
                upcoming_payments.append(UpcomingPayment(
                    name=expense.name,
                    amount=expense.amount,
                    due_date=payment_date.strftime("%Y-%m-%d"),
                    days_until=days_until,
                    category=expense.category
                ))
    
    # Sort by days until (soonest first)
    upcoming_payments.sort(key=lambda x: x.days_until)
    upcoming_payments = upcoming_payments[:10]  # Limit to top 10
    
    return DashboardResponse(
        total_income=total_income,
        total_expenses=total_expenses,
        net_balance=net_balance,
        category_summary=category_summary,
        monthly_trend=monthly_trend,
        top_expenses=top_expenses_list,
        upcoming_payments=upcoming_payments
    )

