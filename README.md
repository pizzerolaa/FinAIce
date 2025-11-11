# FinAIce - Intelligent Financial Analysis Platform

An intelligent web application that analyzes bank statements (PDFs) and automatically transforms them into visual financial reports, categorizing expenses with AI and helping you meet savings goals through personalized suggestions and reminders.

## Features

- 📄 **PDF Bank Statement Upload**: Upload statements from major Mexican banks (BBVA, Santander, Banorte, etc.)
- 🤖 **AI-Powered Categorization**: Automatically categorizes expenses using OpenAI
- 📊 **Visual Dashboard**: Interactive charts showing expenses by category, income vs expenses, and monthly trends
- 💰 **Savings Goals**: Set and track savings goals with progress visualization
- 📋 **Fixed Expenses Management**: Track recurring expenses (rent, utilities, subscriptions)
- 💡 **Personalized Recommendations**: Get AI-powered suggestions to improve your finances
- 🧮 **Savings Simulator**: See how much you could save by reducing spending in specific categories
- 📥 **CSV Export**: Export your transactions to CSV format

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Relational database
- **OpenAI API**: AI-powered expense categorization
- **pdfplumber**: PDF parsing and text extraction
- **SQLAlchemy**: ORM for database operations
- **JWT**: Authentication

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Beautiful chart library
- **Axios**: HTTP client

## Project Structure

```
FinAIce/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── database.py           # Database configuration
│   │   ├── models.py             # SQLAlchemy models
│   │   ├── schemas.py             # Pydantic schemas
│   │   ├── auth.py               # Authentication utilities
│   │   ├── routers/              # API routes
│   │   │   ├── auth.py
│   │   │   ├── statements.py
│   │   │   ├── transactions.py
│   │   │   ├── goals.py
│   │   │   ├── fixed_expenses.py
│   │   │   └── recommendations.py
│   │   └── services/             # Business logic
│   │       ├── pdf_parser.py
│   │       └── ai_categorizer.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/                      # Next.js app directory
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/
│   │   ├── register/
│   │   ├── dashboard/
│   │   ├── statements/
│   │   ├── goals/
│   │   ├── fixed-expenses/
│   │   └── recommendations/
│   ├── components/
│   │   └── Layout.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   └── api.ts
│   ├── package.json
│   └── .env.example
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL 12+
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up PostgreSQL database:
```bash
createdb finaice_db
```

5. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

6. Update `.env` with your configuration:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/finaice_db
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key-here
```

7. Run the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Register/Login**: Create an account or sign in
2. **Upload Statement**: Upload your bank statement PDF
3. **View Dashboard**: See your financial overview with charts
4. **Set Goals**: Create savings goals and track progress
5. **Manage Fixed Expenses**: Add recurring expenses
6. **Get Recommendations**: View personalized financial advice
7. **Simulate Savings**: See potential savings by reducing spending

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Statements
- `POST /api/statements/upload` - Upload PDF statement
- `GET /api/statements/` - Get all statements
- `GET /api/statements/{id}/csv` - Export to CSV

### Transactions
- `GET /api/transactions/` - Get transactions with filters
- `GET /api/transactions/dashboard` - Get dashboard data

### Goals
- `POST /api/goals/` - Create goal
- `GET /api/goals/` - Get all goals
- `PUT /api/goals/{id}` - Update goal
- `DELETE /api/goals/{id}` - Delete goal

### Fixed Expenses
- `POST /api/fixed-expenses/` - Create fixed expense
- `GET /api/fixed-expenses/` - Get all fixed expenses
- `GET /api/fixed-expenses/monthly/total` - Get monthly total
- `PUT /api/fixed-expenses/{id}` - Update fixed expense
- `DELETE /api/fixed-expenses/{id}` - Delete fixed expense

### Recommendations
- `GET /api/recommendations/` - Get recommendations
- `POST /api/recommendations/simulate` - Simulate savings

## Database Schema

- **users**: User accounts
- **statements**: Uploaded bank statements
- **transactions**: Extracted transactions from statements
- **goals**: Savings goals
- **fixed_expenses**: Recurring expenses

## Development

### Backend
- The backend uses FastAPI with automatic API documentation at `http://localhost:8000/docs`
- Database migrations can be handled with Alembic (not included, but recommended for production)

### Frontend
- Uses Next.js App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Recharts for data visualization

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
