# SubTrack - Subscription Management System Backend
Brightloop Software (Odoo Hackathon)

## Stack
- **Framework**: Python FastAPI
- **ORM & Database**: SQLAlchemy + SQLite (`subtrack.db`)
- **Authentication**: JWT Bearer Tokens with Role-Based Access Control (`admin`, `internal`, `portal`)
- **Password Security**: Bcrypt hashing with policy enforcement
- **Validation**: Pydantic v2
- **Testing**: Pytest + FastAPI TestClient

---

## Directory Structure
```
backend/
├── app/
│   ├── core/           # Configuration, database engine, security & JWT, dependencies
│   ├── models/         # SQLAlchemy ORM models (User, etc.)
│   ├── schemas/        # Pydantic request/response validation schemas
│   ├── services/       # Business logic (AuthService, UserService, etc.)
│   ├── routers/        # FastAPI endpoints (/api/auth, /api/users, etc.)
│   ├── init_db.py      # Database bootstrap & admin seeder
│   └── main.py         # FastAPI application entry point & CORS configuration
├── tests/              # Pytest test suite
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules (.venv, .env, *.db)
├── pytest.ini          # Pytest configuration
├── requirements.txt    # Project dependencies
└── README.md           # Documentation
```

---

## Setup & Running Locally

### 1. Create and Activate Virtual Environment
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux/macOS:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Seed Admin & Run Server
When starting the server, `init_db` automatically verifies and provisions the default seed admin:
- **Email**: `admin@brightloop.com`
- **Password**: `Admin@1234`
- **Role**: `admin`

Start server:
```bash
uvicorn backend.app.main:app --reload --port 8000
```
Interactive API documentation: `http://localhost:8000/docs`

---

## Implemented Endpoints (Step 1: Auth & User Management)

### Auth (`/api/auth`)
- `POST /api/auth/signup`: Customer/portal user registration. Validates email uniqueness and password policy (>8 chars + uppercase + lowercase + special character).
- `POST /api/auth/login`: Authenticates credentials, returns JWT token with user role.
- `POST /api/auth/forgot-password`: Generates reset token and prints demo reset URL to console.
- `POST /api/auth/reset-password`: Resets password using token, enforcing the password policy.
- `GET /api/auth/me`: Retrieves current authenticated user profile.

### Users (`/api/users`)
- `POST /api/users`: Admin-only endpoint to create `internal`, `admin`, or `portal` users. Protected with role guards.
- `GET /api/users`: Admin-only endpoint to list all users.

---

## Running Tests
```bash
pytest -c backend/pytest.ini backend/tests
```
