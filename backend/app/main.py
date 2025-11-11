from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, statements, transactions, goals, fixed_expenses, recommendations
from app.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinAIce API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(statements.router, prefix="/api/statements", tags=["statements"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(fixed_expenses.router, prefix="/api/fixed-expenses", tags=["fixed-expenses"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])

@app.get("/")
async def root():
    return {"message": "FinAIce API is running"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

