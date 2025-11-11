from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Statement schemas
class StatementCreate(BaseModel):
    filename: str

class StatementResponse(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    processed: bool
    
    class Config:
        from_attributes = True

# Transaction schemas
class TransactionCreate(BaseModel):
    date: datetime
    description: str
    amount: float
    transaction_type: str
    category: Optional[str] = None
    original_text: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    date: datetime
    description: str
    amount: float
    transaction_type: str
    category: Optional[str]
    
    class Config:
        from_attributes = True

# Goal schemas
class GoalCreate(BaseModel):
    name: str
    target_amount: float
    deadline: Optional[datetime] = None

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[datetime] = None
    active: Optional[bool] = None

class GoalResponse(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    deadline: Optional[datetime]
    created_at: datetime
    active: bool
    
    class Config:
        from_attributes = True

# Fixed Expense schemas
class FixedExpenseCreate(BaseModel):
    name: str
    amount: float
    category: str
    recurring: str = "monthly"
    day_of_month: Optional[int] = None  # Day of month (1-31) for monthly expenses

class FixedExpenseUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    recurring: Optional[str] = None
    day_of_month: Optional[int] = None
    active: Optional[bool] = None

class FixedExpenseResponse(BaseModel):
    id: int
    name: str
    amount: float
    category: str
    recurring: str
    day_of_month: Optional[int] = None
    active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Dashboard schemas
class CategorySummary(BaseModel):
    category: str
    total: float
    count: int

class TopTransaction(BaseModel):
    description: str
    amount: float
    date: datetime
    category: Optional[str] = None

class UpcomingPayment(BaseModel):
    name: str
    amount: float
    due_date: str  # Date as string
    days_until: int
    category: Optional[str] = None

class DashboardResponse(BaseModel):
    total_income: float
    total_expenses: float
    net_balance: float
    category_summary: List[CategorySummary]
    monthly_trend: List[dict]
    top_expenses: List[TopTransaction] = []
    upcoming_payments: List[UpcomingPayment] = []

# Recommendation schemas
class RecommendationResponse(BaseModel):
    message: str
    category: str
    current_spending: float
    suggested_saving: float
    impact: str

