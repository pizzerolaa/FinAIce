from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Statement, Transaction, User
from app.schemas import StatementResponse, TransactionResponse
from app.auth import get_current_user
from app.services.pdf_parser import PDFParser
from app.services.ai_categorizer import AICategorizer
from typing import List
import csv
import io

router = APIRouter()

@router.post("/upload", response_model=StatementResponse, status_code=status.HTTP_201_CREATED)
async def upload_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process a bank statement PDF"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Read PDF file
    pdf_content = await file.read()
    
    # Create statement record
    db_statement = Statement(
        user_id=current_user.id,
        filename=file.filename,
        processed=False
    )
    db.add(db_statement)
    db.commit()
    db.refresh(db_statement)
    
    try:
        # Parse PDF
        parser = PDFParser()
        transactions_data = parser.parse_statement(pdf_content)
        
        # Categorize transactions - use keyword-based (fast, free, no quota issues)
        # Set use_openai=False to avoid quota problems, or True to enhance with AI
        categorizer = AICategorizer(use_openai=False)  # Changed to False to avoid quota issues
        transactions_data = categorizer.categorize_batch(transactions_data, use_ai=False)
        
        # Save transactions to database (with additional validation)
        valid_count = 0
        for trans_data in transactions_data:
            # Additional validation before saving
            amount = trans_data.get("amount", 0)
            description = trans_data.get("description", "")
            
            # Skip if amount is invalid or description is too short
            if amount < 1 or amount > 10000000 or len(description) < 5:
                continue
            
            # Skip if description is mostly numbers
            num_chars = sum(c.isdigit() for c in description)
            if num_chars > len(description) * 0.7:
                continue
            
            db_transaction = Transaction(
                statement_id=db_statement.id,
                user_id=current_user.id,
                date=trans_data["date"],
                description=description,
                amount=amount,
                transaction_type=trans_data["transaction_type"],
                category=trans_data.get("category"),
                original_text=trans_data.get("original_text", "")[:200]  # Limit length
            )
            db.add(db_transaction)
            valid_count += 1
        
        # Mark statement as processed
        db_statement.processed = True
        db.commit()
        db.refresh(db_statement)
        
        return db_statement
    
    except Exception as e:
        db_statement.processed = False
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing PDF: {str(e)}"
        )

@router.get("/", response_model=List[StatementResponse])
async def get_statements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all statements for current user"""
    statements = db.query(Statement).filter(Statement.user_id == current_user.id).all()
    return statements

@router.delete("/{statement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_statement(
    statement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a statement and all its transactions"""
    statement = db.query(Statement).filter(
        Statement.id == statement_id,
        Statement.user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Statement not found"
        )
    
    # Delete all transactions first
    db.query(Transaction).filter(Transaction.statement_id == statement_id).delete()
    
    # Delete the statement
    db.delete(statement)
    db.commit()
    
    return None

@router.get("/{statement_id}/csv")
async def export_to_csv(
    statement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export statement transactions to CSV"""
    statement = db.query(Statement).filter(
        Statement.id == statement_id,
        Statement.user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Statement not found"
        )
    
    transactions = db.query(Transaction).filter(
        Transaction.statement_id == statement_id
    ).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Amount", "Type", "Category"])
    
    for trans in transactions:
        writer.writerow([
            trans.date.strftime("%Y-%m-%d"),
            trans.description,
            trans.amount,
            trans.transaction_type,
            trans.category or ""
        ])
    
    return {
        "filename": f"{statement.filename.replace('.pdf', '')}.csv",
        "content": output.getvalue()
    }

