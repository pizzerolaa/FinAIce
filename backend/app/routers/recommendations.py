from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List
from app.database import get_db
from app.models import Transaction, User, FixedExpense
from app.schemas import RecommendationResponse
from app.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[RecommendationResponse])
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized financial recommendations"""
    recommendations = []
    
    # Get transactions from last 2 months for comparison
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=60)
    
    current_month_start = datetime(end_date.year, end_date.month, 1)
    previous_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    
    # Current month transactions
    current_transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= current_month_start,
            Transaction.transaction_type == "expense"
        )
    ).all()
    
    # Previous month transactions
    previous_transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= previous_month_start,
            Transaction.date < current_month_start,
            Transaction.transaction_type == "expense"
        )
    ).all()
    
    # Calculate spending by category for both months
    current_spending = {}
    previous_spending = {}
    
    for trans in current_transactions:
        if trans.category:
            current_spending[trans.category] = current_spending.get(trans.category, 0) + trans.amount
    
    for trans in previous_transactions:
        if trans.category:
            previous_spending[trans.category] = previous_spending.get(trans.category, 0) + trans.amount
    
    # Generate recommendations
    for category in current_spending:
        current = current_spending[category]
        previous = previous_spending.get(category, 0)
        
        if previous > 0:
            increase_percent = ((current - previous) / previous) * 100
            
            # If spending increased significantly
            if increase_percent > 20:
                suggested_saving = current * 0.2  # Suggest 20% reduction
                recommendations.append(RecommendationResponse(
                    message=f"This month you spent {increase_percent:.0f}% more on {category}. If you reduce spending by 20%, you would save ${suggested_saving:.2f} MXN.",
                    category=category,
                    current_spending=current,
                    suggested_saving=suggested_saving,
                    impact="high"
                ))
            elif increase_percent > 10:
                suggested_saving = current * 0.15
                recommendations.append(RecommendationResponse(
                    message=f"Your {category} spending increased by {increase_percent:.0f}%. Consider reducing by 15% to save ${suggested_saving:.2f} MXN.",
                    category=category,
                    current_spending=current,
                    suggested_saving=suggested_saving,
                    impact="medium"
                ))
    
    # Check for high spending categories
    total_expenses = sum(current_spending.values())
    for category, amount in current_spending.items():
        percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
        if percentage > 30 and amount > 1000:  # More than 30% of expenses and over 1000 MXN
            suggested_saving = amount * 0.2
            recommendations.append(RecommendationResponse(
                message=f"{category} represents {percentage:.0f}% of your expenses. Reducing by 20% could save ${suggested_saving:.2f} MXN this month.",
                category=category,
                current_spending=amount,
                suggested_saving=suggested_saving,
                impact="high"
            ))
    
    return recommendations

@router.post("/simulate")
async def simulate_savings(
    category: str,
    reduction_percent: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Simulate savings if reducing spending in a category"""
    # Get current month spending for category
    current_month_start = datetime.utcnow().replace(day=1)
    
    transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= current_month_start,
            Transaction.transaction_type == "expense",
            Transaction.category == category
        )
    ).all()
    
    current_spending = sum(t.amount for t in transactions)
    potential_saving = current_spending * (reduction_percent / 100)
    
    # Calculate remaining money after fixed expenses
    fixed_expenses = db.query(FixedExpense).filter(
        FixedExpense.user_id == current_user.id,
        FixedExpense.active == True
    ).all()
    
    monthly_fixed = 0.0
    for expense in fixed_expenses:
        if expense.recurring == "monthly":
            monthly_fixed += expense.amount
        elif expense.recurring == "weekly":
            monthly_fixed += expense.amount * 4.33
        elif expense.recurring == "yearly":
            monthly_fixed += expense.amount / 12
    
    # Get income
    income_transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= current_month_start,
            Transaction.transaction_type == "income"
        )
    ).all()
    monthly_income = sum(t.amount for t in income_transactions)
    
    # Calculate available money
    all_expenses = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= current_month_start,
            Transaction.transaction_type == "expense"
        )
    ).all()
    total_expenses = sum(t.amount for t in all_expenses)
    
    new_total_expenses = total_expenses - potential_saving
    available_after_reduction = monthly_income - monthly_fixed - new_total_expenses
    current_available = monthly_income - monthly_fixed - total_expenses
    
    return {
        "category": category,
        "current_spending": current_spending,
        "reduction_percent": reduction_percent,
        "potential_saving": potential_saving,
        "current_available": current_available,
        "available_after_reduction": available_after_reduction,
        "improvement": available_after_reduction - current_available
    }

