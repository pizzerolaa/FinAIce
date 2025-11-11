# Quick Setup Guide

## Step 1: Database Setup

1. Install PostgreSQL if you haven't already
2. Create the database:
```bash
createdb finaice_db
```

Or using psql:
```sql
CREATE DATABASE finaice_db;
```

## Step 2: Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt

# Copy and edit .env file
cp .env.example .env
# Edit .env with your database URL and OpenAI API key

# Run the server
python run.py
# Or: uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

## Step 3: Frontend Setup

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Step 4: First Use

1. Open `http://localhost:3000`
2. Register a new account
3. Upload a bank statement PDF
4. View your dashboard!

## Important Notes

- Make sure PostgreSQL is running
- You need an OpenAI API key for expense categorization
- The PDF parser works best with standard bank statement formats
- For production, change the SECRET_KEY in backend/.env

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in backend/.env
- Ensure database exists: `psql -l | grep finaice_db`

### OpenAI API Error
- Verify OPENAI_API_KEY in backend/.env
- Check your OpenAI account has credits

### Frontend Can't Connect to Backend
- Verify backend is running on port 8000
- Check NEXT_PUBLIC_API_URL in frontend/.env.local
- Check CORS settings in backend/app/main.py

