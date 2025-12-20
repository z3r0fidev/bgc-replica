# Quickstart: Real-Time Chat & Messaging

## 1. Backend Setup

### Dependencies
Ensure the following are installed in the `backend` virtual environment:
```bash
pip install python-socketio[asyncio] redis
```

### Environment Variables
Add to `backend/.env`:
```env
# WebSocket Adapter
REDIS_URL="redis://localhost:6379/0"
```

## 2. Frontend Setup

### Dependencies
Install the client library in the `frontend` directory:
```bash
npm install socket.io-client
```

## 3. Database Initialization
Run the migrations to create the chat tables:
```bash
cd backend
$env:PYTHONPATH="."
.\venv\Scripts\alembic revision --autogenerate -m "Add chat and message models"
.\venv\Scripts\alembic upgrade head
```

## 4. Default Data
You can seed the initial rooms using the FastAPI interactive docs or a script:
- POST `/api/chat/rooms` with: `{"name": "The Lounge", "category": "General"}`
- POST `/api/chat/rooms` with: `{"name": "NYC", "category": "Regional"}`
