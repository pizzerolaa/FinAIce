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

@router.get("/debug")
async def debug_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check transaction data"""
    total_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).count()
    
    transactions_with_category = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category.isnot(None)
    ).count()
    
    expense_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == "expense"
    ).count()
    
    return {
        "total_transactions": total_transactions,
        "transactions_with_category": transactions_with_category,
        "expense_transactions": expense_transactions,
        "has_data": total_transactions > 0
    }

@router.get("/", response_model=List[RecommendationResponse])
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized financial recommendations"""
    recommendations = []
    
    # Get transactions from last 60 days (instead of just current month)
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=60)
    
    # Current period: last 30 days
    current_period_start = end_date - timedelta(days=30)
    # Previous period: 30-60 days ago
    previous_period_start = end_date - timedelta(days=60)
    previous_period_end = end_date - timedelta(days=30)
    
    # Current period transactions (last 30 days)
    current_transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= current_period_start,
            Transaction.date <= end_date,
            Transaction.transaction_type == "expense"
        )
    ).all()
    
    # Previous period transactions (30-60 days ago)
    previous_transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= previous_period_start,
            Transaction.date < previous_period_end,
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
    
    # Track categories already recommended to avoid duplicates
    recommended_categories = set()
    
    # Generate recommendations based on spending increases
    for category in current_spending:
        current = current_spending[category]
        previous = previous_spending.get(category, 0)
        increase_amount = current - previous
        
        if previous > 0 and previous >= 100:  # Only compare if previous spending was significant (>100 MXN)
            increase_percent = ((current - previous) / previous) * 100
            
            # If spending increased significantly
            if increase_percent > 500:  # Extreme increase - mention absolute amount instead
                suggested_saving = current * 0.2
                recommendations.append(RecommendationResponse(
                    message=f"Your {category} spending increased significantly in the last 30 days (from ${previous:.2f} to ${current:.2f} MXN, +${increase_amount:.2f}). Consider reducing by 20% to save ${suggested_saving:.2f} MXN.",
                    category=category,
                    current_spending=current,
                    suggested_saving=suggested_saving,
                    impact="high"
                ))
                recommended_categories.add(category)
            elif increase_percent > 50:  # Significant increase
                suggested_saving = current * 0.2
                recommendations.append(RecommendationResponse(
                    message=f"Your {category} spending increased by {increase_percent:.0f}% in the last 30 days (from ${previous:.2f} to ${current:.2f} MXN). If you reduce spending by 20%, you would save ${suggested_saving:.2f} MXN.",
                    category=category,
                    current_spending=current,
                    suggested_saving=suggested_saving,
                    impact="high"
                ))
                recommended_categories.add(category)
            elif increase_percent > 20:
                suggested_saving = current * 0.15
                recommendations.append(RecommendationResponse(
                    message=f"Your {category} spending increased by {increase_percent:.0f}% in the last 30 days. Consider reducing by 15% to save ${suggested_saving:.2f} MXN.",
                    category=category,
                    current_spending=current,
                    suggested_saving=suggested_saving,
                    impact="medium"
                ))
                recommended_categories.add(category)
        elif previous == 0 and current > 500:  # New spending category with significant amount
            suggested_saving = current * 0.15
            recommendations.append(RecommendationResponse(
                message=f"You started spending on {category} in the last 30 days (${current:.2f} MXN). Monitor this new expense and consider reducing by 15% to save ${suggested_saving:.2f} MXN if needed.",
                category=category,
                current_spending=current,
                suggested_saving=suggested_saving,
                impact="medium"
            ))
            recommended_categories.add(category)
    
    # Check for high spending categories (only if not already recommended)
    total_expenses = sum(current_spending.values())
    for category, amount in current_spending.items():
        if category in recommended_categories:
            continue  # Skip if already recommended
            
        percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
        if percentage > 35 and amount > 1000:  # More than 35% of expenses and over 1000 MXN
            suggested_saving = amount * 0.2
            recommendations.append(RecommendationResponse(
                message=f"{category} represents {percentage:.0f}% of your expenses in the last 30 days (${amount:.2f} MXN). Reducing by 20% could save ${suggested_saving:.2f} MXN.",
                category=category,
                current_spending=amount,
                suggested_saving=suggested_saving,
                impact="high"
            ))
            recommended_categories.add(category)
    
    # If no recommendations yet, generate basic recommendations based on current spending
    if len(recommendations) == 0 and len(current_spending) > 0:
        # Sort categories by spending amount
        sorted_categories = sorted(current_spending.items(), key=lambda x: x[1], reverse=True)
        
        # Generate recommendations for top 3 spending categories (only if not already recommended)
        for i, (category, amount) in enumerate(sorted_categories[:3]):
            if category in recommended_categories:
                continue  # Skip if already recommended
                
            if amount > 500:  # Only if spending is significant (over 500 MXN)
                suggested_saving = amount * 0.15  # Suggest 15% reduction
                percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
                
                impact = "high" if i == 0 else "medium" if i == 1 else "low"
                
                recommendations.append(RecommendationResponse(
                    message=f"{category} is one of your top spending categories in the last 30 days (${amount:.2f} MXN, {percentage:.0f}% of expenses). Consider reducing by 15% to save ${suggested_saving:.2f} MXN.",
                    category=category,
                    current_spending=amount,
                    suggested_saving=suggested_saving,
                    impact=impact
                ))
                recommended_categories.add(category)
    
    # If still no recommendations, check if user has any transactions at all
    if len(recommendations) == 0:
        all_transactions = db.query(Transaction).filter(
            Transaction.user_id == current_user.id
        ).count()
        
        if all_transactions > 0:
            # User has transactions but not in last 30 days or no expenses
            recommendations.append(RecommendationResponse(
                message="Upload more recent bank statements to receive personalized recommendations based on your current spending patterns. We need transactions from the last 30 days.",
                category="General",
                current_spending=0.0,
                suggested_saving=0.0,
                impact="low"
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
    # Get last 30 days spending for category
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
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
    
    # Get income from last 30 days
    income_transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.transaction_type == "income"
        )
    ).all()
    monthly_income = sum(t.amount for t in income_transactions)
    
    # Calculate available money from last 30 days
    all_expenses = db.query(Transaction).filter(
        and_(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
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

