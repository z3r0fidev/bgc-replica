# Redis Setup Guide

The BGCLive Replica uses Redis for **Rate Limiting**, **Real-time Presence tracking**, and **Geospatial User Indexing**.

## Troubleshooting "Connection Refused" (Errno 10061)

If you see a warning that `FastAPILimiter` could not be initialized, it means the backend cannot reach Redis at `localhost:6379`.

## Installation Options

### 1. Using Docker (Recommended)
This is the fastest way to get a production-parity Redis instance running.
```powershell
docker run --name bgc-redis -p 6379:6379 -d redis
```

### 2. Using WSL2 (Windows Subsystem for Linux)
If you have Ubuntu on WSL:
```bash
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### 3. Using Upstash (Cloud/Serverless)
If you don't want to run Redis locally:
1. Create a free database at [Upstash.com](https://upstash.com).
2. Copy the `REDIS_URL`.
3. Update your `backend/.env`:
   ```ini
   REDIS_URL="redis://:yourpassword@your-endpoint.upstash.io:6379"
   ```

## Verifying the Connection
Once Redis is started, you can verify it by running:
```powershell
# From the backend directory using the venv
.\venv\Scripts\python.exe -c "import redis; r = redis.from_url('redis://localhost:6379/0'); print(r.ping())"
```
It should return `True`.
