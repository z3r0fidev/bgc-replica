# BGC Personals

A standalone personals/classifieds platform extracted from the BGC Replica project.

## Architecture

- **Frontend**: Next.js 16 with App Router (port 3001)
- **Backend**: FastAPI with Python (port 8001)
- **Database**: PostgreSQL (separate from main app)
- **Auth**: NextAuth with shared secrets for cross-app authentication

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL
- Redis

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8001
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Generate Prisma client
npx prisma generate

# Start dev server
npm run dev
```

Visit http://localhost:3001/personals to see the application.

## Environment Variables

### Frontend (.env.local)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:8001) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for Socket.io |
| `AUTH_SECRET` | NextAuth secret (MUST match main app for shared auth) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `DATABASE_URL` | PostgreSQL connection string |

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (asyncpg format) |
| `REDIS_URL` | Redis connection URL |
| `SECRET_KEY` | JWT signing key |
| `NEXTAUTH_SECRET` | NextAuth secret (MUST match frontend AUTH_SECRET) |

## Shared Authentication

This project uses shared authentication with the main BGC app. Both applications must use the same `AUTH_SECRET` / `NEXTAUTH_SECRET` to allow session cookies to work across both apps when hosted on the same domain.

## API Endpoints

- `GET /api/personals/categories` - List all categories
- `GET /api/personals/listings` - List profile-based listings
- `GET /api/personals/posts` - List social posts
- `POST /api/personals/posts` - Create a new post (auth required)
- `POST /api/personals/posts/{id}/follow` - Toggle follow (auth required)
- `GET /api/personals/posts/{id}/comments` - Get post comments
- `POST /api/personals/posts/{id}/comments` - Add comment (auth required)

## Real-time Features

Socket.io is used for real-time comment updates. Connect to the WebSocket endpoint at `/socket.io` and emit:

- `join_post` - Join a post's comment room
- `leave_post` - Leave a post's comment room

Listen for:
- `new_comment` - New comment added to the post

## Testing

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test

# E2E tests
cd frontend && npm run test:e2e
```

## Project Structure

```
bgc-personals/
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities and config
│   │   ├── services/         # API service layer
│   │   └── types/            # TypeScript types
│   ├── prisma/               # Prisma schema
│   └── public/               # Static assets
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes
│   │   ├── core/             # Config and utilities
│   │   ├── models/           # SQLAlchemy models
│   │   └── schemas/          # Pydantic schemas
│   ├── alembic/              # Database migrations
│   └── tests/                # Test suite
└── specs/                    # Feature specifications
```
