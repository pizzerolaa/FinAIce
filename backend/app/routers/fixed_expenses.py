from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import FixedExpense, User
from app.schemas import FixedExpenseCreate, FixedExpenseUpdate, FixedExpenseResponse
from app.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=FixedExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_fixed_expense(
    expense_data: FixedExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new fixed expense"""
    # Validate day_of_month if provided
    if expense_data.day_of_month is not None:
        if expense_data.day_of_month < 1 or expense_data.day_of_month > 31:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="day_of_month must be between 1 and 31"
            )
    
    db_expense = FixedExpense(
        user_id=current_user.id,
        name=expense_data.name,
        amount=expense_data.amount,
        category=expense_data.category,
        recurring=expense_data.recurring,
        day_of_month=expense_data.day_of_month
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.get("/", response_model=List[FixedExpenseResponse])
async def get_fixed_expenses(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all fixed expenses for current user"""
    query = db.query(FixedExpense).filter(FixedExpense.user_id == current_user.id)
    if active_only:
        query = query.filter(FixedExpense.active == True)
    expenses = query.all()
    return expenses

@router.get("/{expense_id}", response_model=FixedExpenseResponse)
async def get_fixed_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific fixed expense"""
    expense = db.query(FixedExpense).filter(
        FixedExpense.id == expense_id,
        FixedExpense.user_id == current_user.id
    ).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fixed expense not found"
        )
    return expense

@router.put("/{expense_id}", response_model=FixedExpenseResponse)
async def update_fixed_expense(
    expense_id: int,
    expense_data: FixedExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a fixed expense"""
    expense = db.query(FixedExpense).filter(
        FixedExpense.id == expense_id,
        FixedExpense.user_id == current_user.id
    ).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fixed expense not found"
        )
    
    if expense_data.name is not None:
        expense.name = expense_data.name
    if expense_data.amount is not None:
        expense.amount = expense_data.amount
    if expense_data.category is not None:
        expense.category = expense_data.category
    if expense_data.recurring is not None:
        expense.recurring = expense_data.recurring
    if expense_data.day_of_month is not None:
        if expense_data.day_of_month < 1 or expense_data.day_of_month > 31:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="day_of_month must be between 1 and 31"
            )
        expense.day_of_month = expense_data.day_of_month
    if expense_data.active is not None:
        expense.active = expense_data.active
    
    db.commit()
    db.refresh(expense)
    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fixed_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a fixed expense"""
    expense = db.query(FixedExpense).filter(
        FixedExpense.id == expense_id,
        FixedExpense.user_id == current_user.id
    ).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fixed expense not found"
        )
    db.delete(expense)
    db.commit()
    return None

@router.get("/monthly/total")
async def get_monthly_fixed_expenses_total(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate total monthly fixed expenses"""
    expenses = db.query(FixedExpense).filter(
        FixedExpense.user_id == current_user.id,
        FixedExpense.active == True
    ).all()
    
    total = 0.0
    for expense in expenses:
        if expense.recurring == "monthly":
            total += expense.amount
        elif expense.recurring == "weekly":
            total += expense.amount * 4.33  # Average weeks per month
        elif expense.recurring == "yearly":
            total += expense.amount / 12
    
    return {"total_monthly": total, "expenses": len(expenses)}

