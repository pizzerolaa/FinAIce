from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Goal, User
from app.schemas import GoalCreate, GoalUpdate, GoalResponse
from app.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new savings goal"""
    db_goal = Goal(
        user_id=current_user.id,
        name=goal_data.name,
        target_amount=goal_data.target_amount,
        deadline=goal_data.deadline,
        current_amount=0.0
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all goals for current user"""
    query = db.query(Goal).filter(Goal.user_id == current_user.id)
    if active_only:
        query = query.filter(Goal.active == True)
    goals = query.all()
    return goals

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific goal"""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    return goal

@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a goal"""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    if goal_data.name is not None:
        goal.name = goal_data.name
    if goal_data.target_amount is not None:
        goal.target_amount = goal_data.target_amount
    if goal_data.current_amount is not None:
        goal.current_amount = goal_data.current_amount
    if goal_data.deadline is not None:
        goal.deadline = goal_data.deadline
    if goal_data.active is not None:
        goal.active = goal_data.active
    
    db.commit()
    db.refresh(goal)
    return goal

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a goal"""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    db.delete(goal)
    db.commit()
    return None

