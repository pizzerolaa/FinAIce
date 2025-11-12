# FinAIce - Intelligent Financial Analysis Platform

An intelligent web application that analyzes bank statements (PDFs) and automatically transforms them into visual financial reports, categorizing expenses with AI and helping you meet savings goals through personalized suggestions and reminders.

## Features

### 📄 Statement Analysis
- **PDF Bank Statement Upload**: Upload statements from major Mexican banks (BBVA, Santander, Banorte, etc.)
- **Intelligent Parsing**: Automatically extracts transactions, dates, amounts, and descriptions
- **CSV Export**: Export your transactions to CSV format for external analysis

### 🤖 Smart Categorization
- **Hybrid AI System**: Combines keyword-based categorization with optional OpenAI integration
- **Mexican Market Focus**: Optimized for Mexican merchants and transaction patterns
- **10+ Categories**: Food & Dining, Transportation, Entertainment, Shopping, Bills, Health, Education, and more
- **Automatic Classification**: Categorizes expenses instantly upon upload

### 📊 Visual Dashboard
- **Real-Time Metrics**: Net Balance, Total Income, Total Expenses with period-over-period comparison
- **Interactive Charts**: 
  - Expenses by category (Pie Chart)
  - Income vs Expenses trends (Bar Chart)
  - Monthly spending patterns
- **Period Filtering**: View data by month, quarter, or custom date range

### 💰 Smart Savings Goals
- **Goal Tracking**: Create multiple savings goals with target amounts and deadlines
- **Visual Progress**: Progress bars showing completion percentage
- **Balance Validation**: Only allows contributions when Net Balance is positive
- **Available Balance**: Real-time calculation considering existing goal allocations
- **Add/Withdraw Funds**: Flexible management of goal contributions
- **Goal Alerts**: Visual indicators when approaching target dates

### 📋 Fixed Expenses Management
- **Recurring Expense Tracking**: Monitor monthly bills, rent, subscriptions, and utilities
- **Payment Status Tracking**: Mark expenses as paid with timestamp
- **Due Date Reminders**: Visual alerts for upcoming and overdue payments
  - 🟢 Paid (this period)
  - 🟡 Due Soon (≤7 days)
  - 🔴 Overdue (past due date)
- **Edit Functionality**: Update expense details without deleting
- **Monthly Totals**: Automatic calculation of total fixed obligations
- **Category Organization**: Group by expense type for better visibility

### 💡 Intelligent Recommendations
- **Mathematical Analysis**: Rule-based recommendations analyzing last 30 days of spending
- **High-Impact Alerts**: Identifies categories with >20% spending increase
- **Budget Warnings**: Flags categories consuming >30% of total expenses
- **Smart Percentage Display**: Shows absolute amounts for extreme increases (>500%)
- **Contextual Insights**: "From $X to $Y" comparisons for better understanding
- **Debug Mode**: Transaction statistics for troubleshooting

### 🧮 Savings Simulator
- **What-If Scenarios**: Model potential savings by reducing specific categories
- **Visual Impact**: See immediate effect on monthly savings potential
- **Multiple Categories**: Simulate changes across different expense types simultaneously
- **Actionable Insights**: Concrete numbers to guide spending decisions

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
OPENAI_API_KEY=your-openai-api-key-here  # Optional: Only needed if using AI categorization
```

7. Run the backend server:
```bash
python run.py
# Or use uvicorn directly:
# uvicorn app.main:app --reload --port 8000
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

## Usage Guide

### Getting Started
1. **Register/Login**: Create an account or sign in with your credentials
2. **Upload Statement**: Upload your first bank statement PDF from the Statements page
3. **View Dashboard**: Navigate to the Dashboard to see your financial overview

### Managing Finances
4. **Analyze Transactions**: 
   - View categorized transactions
   - Filter by date range, type, or category
   - Export to CSV for external analysis

5. **Set Savings Goals**:
   - Click "Add Goal" on the Goals page
   - Enter name, target amount, and optional deadline
   - Add money when Net Balance is positive
   - Track progress with visual progress bars

6. **Track Fixed Expenses**:
   - Add recurring expenses (rent, bills, subscriptions)
   - Set due dates for monthly expenses
   - Mark as paid when you pay them
   - Visual status indicators show what needs attention

7. **Get Recommendations**:
   - Review spending patterns and alerts
   - Identify high-impact categories for reduction
   - Use the savings simulator to model budget changes

### Pro Tips
- 📤 **Upload Regularly**: Upload new statements monthly for accurate tracking
- 💚 **Check Net Balance**: Ensure positive balance before adding to goals
- ⚠️ **Monitor Alerts**: Pay attention to overdue fixed expenses
- 📊 **Use Simulator**: Test different scenarios before committing to changes
- 📅 **Set Realistic Goals**: Break large savings targets into smaller milestones

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user and return JWT token
- `GET /api/auth/me` - Get current user profile

### Statements
- `POST /api/statements/upload` - Upload PDF bank statement (multipart/form-data)
- `GET /api/statements/` - Get all user statements with metadata
- `GET /api/statements/{id}/csv` - Export statement transactions to CSV

### Transactions
- `GET /api/transactions/` - Get transactions with filters (date range, type, category)
- `GET /api/transactions/dashboard` - Get dashboard metrics (income, expenses, net balance, charts)
- `GET /api/transactions/categories` - Get list of available expense categories

### Goals
- `POST /api/goals/` - Create new savings goal
- `GET /api/goals/` - Get all user goals with progress
- `PUT /api/goals/{id}` - Update goal (add/withdraw money, edit details)
- `DELETE /api/goals/{id}` - Delete goal
- `POST /api/goals/{id}/add` - Add money to specific goal (validates available balance)
- `POST /api/goals/{id}/withdraw` - Withdraw money from goal

### Fixed Expenses
- `POST /api/fixed-expenses/` - Create fixed expense
- `GET /api/fixed-expenses/` - Get all fixed expenses (with active filter)
- `GET /api/fixed-expenses/monthly/total` - Get total monthly fixed expenses
- `PUT /api/fixed-expenses/{id}` - Update fixed expense details
- `POST /api/fixed-expenses/{id}/mark-paid` - Mark expense as paid for current period
- `DELETE /api/fixed-expenses/{id}` - Delete fixed expense

### Recommendations
- `GET /api/recommendations/` - Get personalized recommendations (analyzes last 30 days)
- `POST /api/recommendations/simulate` - Simulate savings with category reductions
- `GET /api/recommendations/debug` - Debug endpoint for transaction statistics

## Database Schema

### Users
- `id`: Primary key
- `email`: Unique email address
- `hashed_password`: Bcrypt hashed password
- `created_at`: Registration timestamp

### Statements
- `id`: Primary key
- `user_id`: Foreign key to users
- `filename`: Original PDF filename
- `upload_date`: Upload timestamp
- `month`, `year`: Statement period

### Transactions
- `id`: Primary key
- `user_id`: Foreign key to users
- `statement_id`: Foreign key to statements
- `date`: Transaction date
- `description`: Transaction description
- `amount`: Transaction amount (positive for income, negative for expenses)
- `transaction_type`: 'income' or 'expense'
- `category`: Auto-assigned category (Food & Dining, Transportation, etc.)
- `created_at`: Record creation timestamp

### Goals
- `id`: Primary key
- `user_id`: Foreign key to users
- `name`: Goal name/description
- `target_amount`: Target savings amount
- `current_amount`: Current saved amount
- `target_date`: Optional deadline
- `created_at`: Goal creation timestamp

### Fixed Expenses
- `id`: Primary key
- `user_id`: Foreign key to users
- `name`: Expense name (e.g., "Rent", "Netflix")
- `amount`: Monthly amount
- `category`: Expense category
- `recurring`: Frequency ('monthly', 'weekly', 'yearly', 'one-time')
- `day_of_month`: Due date (1-31) for monthly expenses
- `last_paid_date`: Timestamp of last payment marking
- `active`: Boolean flag for soft deletion
- `created_at`: Record creation timestamp

## Development

### Backend
- **FastAPI Framework**: Modern, fast Python web framework
- **Automatic API Documentation**: Available at `http://localhost:8000/docs` (Swagger UI)
- **Database ORM**: SQLAlchemy with PostgreSQL
- **Authentication**: JWT tokens with bcrypt password hashing
- **PDF Processing**: pdfplumber for text extraction
- **AI Integration**: Optional OpenAI GPT-3.5 for categorization

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling with custom color scheme
- **Recharts**: Interactive charts and data visualization
- **Axios**: HTTP client with interceptors for auth
- **Context API**: Global state management for authentication

### Key Algorithms

#### Available Balance Calculation
```javascript
Available Balance = Net Balance - Total in All Goals
```
- Prevents over-allocation of funds across multiple savings goals
- Real-time validation on goal contribution

#### Recommendation Engine
```python
- Analyzes last 30 days of spending (not calendar month)
- Flags >20% increase in any category (Medium Alert)
- Flags >30% of total expenses in one category (High Alert)
- Shows absolute amounts for >500% increases
```

#### Payment Status Logic
```javascript
- Paid: last_paid_date in current month
- Due Soon: 0-7 days until due_date
- Overdue: past due_date and not paid
- Pending: >7 days until due_date
```

### Code Quality
- **Type Safety**: TypeScript on frontend, Pydantic schemas on backend
- **Error Handling**: Comprehensive HTTP error responses with detail messages
- **Validation**: Input validation on both client and server side
- **Security**: Password hashing, JWT tokens, SQL injection prevention via ORM

## Roadmap

### Upcoming Features
- [ ] Email notifications for overdue expenses
- [ ] Multi-bank statement comparison
- [ ] Budget planning and alerts
- [ ] Mobile app (React Native)
- [ ] Investment tracking
- [ ] Bill splitting for shared expenses
- [ ] Recurring goal contributions (auto-save)
- [ ] Custom category creation
- [ ] Data backup and export

## Troubleshooting

### Backend won't start
- Ensure PostgreSQL is running: `pg_ctl status`
- Check database connection string in `.env`
- Verify all dependencies installed: `pip list`

### No recommendations showing
- Upload at least one statement with transactions
- Check debug endpoint: `GET /api/recommendations/debug`
- Ensure transactions have categories assigned

### Can't add money to goals
- Verify Net Balance is positive
- Check Available Balance (Net Balance - Total in Goals)
- Review dashboard metrics

### Fixed expenses not showing status
- Ensure `last_paid_date` column exists in database
- Run migration: `psql -U postgres -d finaice_db -c "ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS last_paid_date TIMESTAMP;"`

## Performance

- **PDF Processing**: ~2-5 seconds per statement
- **Transaction Categorization**: 
  - Keyword-based: Instant (<100ms)
  - OpenAI: ~1-2 seconds per transaction
- **Dashboard Load**: <500ms with 1000+ transactions
- **Database Queries**: Optimized with proper indexing on user_id and date fields

## Security

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ SQL injection prevention via SQLAlchemy ORM
- ✅ CORS configuration for production
- ✅ Input validation with Pydantic
- ⚠️ Remember to change `SECRET_KEY` in production
- ⚠️ Use HTTPS in production
- ⚠️ Set up rate limiting for API endpoints

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

## Acknowledgments

- Built with FastAPI and Next.js
- PDF parsing powered by pdfplumber
- Charts created with Recharts
- AI categorization by OpenAI
- Designed for the Mexican banking market
