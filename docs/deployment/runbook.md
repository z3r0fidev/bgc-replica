# Deployment Runbook

## Overview

This runbook covers deployment procedures for the BGCLive application, including health checks, verification steps, and rollback procedures.

## Architecture

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (Reverse   │
                    │   Proxy)    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Next.js    │ │   FastAPI   │ │   Celery    │
    │  Frontend   │ │   Backend   │ │   Worker    │
    │  :3000      │ │   :8000     │ │             │
    └─────────────┘ └──────┬──────┘ └──────┬──────┘
                           │               │
                    ┌──────▼───────────────▼──────┐
                    │          Redis              │
                    │  (Cache, Sessions, Queue)   │
                    │          :6379              │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │        PostgreSQL           │
                    │         :5432               │
                    └─────────────────────────────┘
```

---

## Health Check Endpoints

### Public Health Check

**Endpoint:** `GET /health`

**Purpose:** Basic liveness probe for load balancers

**Response (healthy):**
```json
{
  "status": "ok",
  "checks": {
    "database": "up",
    "redis": "up"
  }
}
```

**Response (unhealthy):**
```json
{
  "status": "error",
  "checks": {
    "database": "down",
    "redis": "up"
  }
}
```

**Usage:**
```bash
curl http://localhost:8000/health
```

---

### Admin Health Endpoints (Authenticated)

Requires `Authorization: Bearer <admin_token>` header.

#### Comprehensive Health
**Endpoint:** `GET /api/admin/health`

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "database": {
    "status": "up",
    "connections": 5,
    "max_connections": 100,
    "pool_size": 10,
    "cache_hit_ratio": 98.5
  },
  "redis": {
    "status": "up",
    "memory_used": "128M",
    "ops_per_sec": 1250,
    "connected_clients": 12,
    "uptime_seconds": 86400
  },
  "error_count_24h": 3,
  "uptime_seconds": 172800,
  "checked_at": "2024-02-06T12:00:00Z"
}
```

**Status Definitions:**
- `healthy` - All services up, no significant errors
- `degraded` - Services up but errors detected
- `unhealthy` - Critical service(s) down

#### Database Health
**Endpoint:** `GET /api/admin/health/database`

**Response:**
```json
{
  "status": "up",
  "connections": 5,
  "max_connections": 100,
  "pool_size": 10,
  "cache_hit_ratio": 98.5
}
```

**Healthy Thresholds:**
- Connections: < 80% of max_connections
- Cache hit ratio: > 90%

#### Redis Health
**Endpoint:** `GET /api/admin/health/redis`

**Response:**
```json
{
  "status": "up",
  "memory_used": "128M",
  "ops_per_sec": 1250,
  "connected_clients": 12,
  "uptime_seconds": 86400
}
```

#### Cache Statistics
**Endpoint:** `GET /api/admin/health/cache`

**Response:**
```json
{
  "status": "up",
  "overall_hit_ratio": 82.5,
  "keyspace_hits": 15234,
  "keyspace_misses": 3210,
  "pattern_stats": {
    "blocks": {"key_count": 150, "pattern": "blocks:*"},
    "friendship": {"key_count": 320, "pattern": "friendship:*"},
    "sessions": {"key_count": 45, "pattern": "session:*"},
    "rate_limits": {"key_count": 89, "pattern": "fastapi-limiter:*"}
  },
  "memory": {
    "used": "128M",
    "peak": "156M",
    "usage_percent": 12.5
  },
  "evictions": {
    "evicted_keys": 0,
    "expired_keys": 1523
  },
  "targets": {
    "blocks_hit_ratio": ">80%",
    "friendship_hit_ratio": ">70%",
    "overall_hit_ratio": ">75%"
  },
  "checked_at": "2024-02-06T12:00:00Z"
}
```

**Target Thresholds:**
- Overall hit ratio: > 75%
- Block cache effectiveness: > 80%
- Friendship cache effectiveness: > 70%

---

## Pre-Deployment Checklist

### 1. Environment Verification
- [ ] All environment variables are set in target environment
- [ ] Database connection string is correct
- [ ] Redis connection is accessible
- [ ] Resend API key is valid (for email)
- [ ] Sentry DSN is configured

### 2. Database Readiness
- [ ] All migrations are applied: `alembic upgrade head`
- [ ] No pending migrations in codebase
- [ ] Database backup is recent (< 24h)

### 3. Health Pre-Check
```bash
# Verify current production is healthy
curl https://api.bgclive.com/health

# Expected: {"status": "ok", ...}
```

### 4. Build Verification
```bash
# Backend
cd backend
pip install -r requirements.txt
pytest --tb=short

# Frontend
cd frontend
npm install
npm run build
npm run lint
```

---

## Deployment Steps

### 1. Blue-Green Deployment (Recommended)

```bash
# Deploy to green environment
./deploy.sh green

# Verify green health
curl https://green.bgclive.com/health

# If healthy, switch traffic
./switch-traffic.sh green

# Monitor for 5 minutes
watch -n 5 'curl -s https://api.bgclive.com/health | jq .'

# If issues, rollback
./switch-traffic.sh blue
```

### 2. Rolling Deployment

```bash
# Update containers one at a time
docker-compose up -d --no-deps --scale api=2 api

# Wait for health check
sleep 30

# Verify
curl http://localhost:8000/health

# Scale down old
docker-compose up -d --no-deps --scale api=1 api
```

---

## Post-Deployment Verification

### Immediate (< 30 seconds)

```bash
# 1. Basic health check
curl https://api.bgclive.com/health
# Expected: status "ok"

# 2. API responsiveness
curl -w "@curl-format.txt" https://api.bgclive.com/api/health
# Expected: < 500ms

# 3. Frontend loads
curl -I https://bgclive.com
# Expected: 200 OK
```

### Short-term (5 minutes)

```bash
# Get admin token
TOKEN=$(curl -s -X POST https://api.bgclive.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bgclive.com","password":"..."}' | jq -r .access_token)

# Comprehensive health
curl -H "Authorization: Bearer $TOKEN" \
  https://api.bgclive.com/api/admin/health

# Expected: status "healthy"
```

### Monitoring (30 minutes)

- [ ] Check Sentry for new errors
- [ ] Review Prometheus `/metrics` for anomalies
- [ ] Verify P95 latency is within baseline
- [ ] Check Redis memory usage
- [ ] Verify database connection count

---

## Rollback Procedures

### Trigger Conditions
- `/health` returns "error" for > 30 seconds
- P95 latency > 2x baseline
- Error rate > 5%
- Critical functionality broken

### Rollback Steps

```bash
# 1. Switch traffic back (blue-green)
./switch-traffic.sh blue

# OR revert containers
docker-compose up -d --force-recreate api

# 2. Verify rollback
curl https://api.bgclive.com/health

# 3. Investigate issue in green/staging
```

### Database Rollback
If migration caused issues:
```bash
# Identify bad migration
alembic history

# Downgrade to previous version
alembic downgrade -1

# Verify
alembic current
```

---

## Monitoring & Alerts

### Prometheus Metrics

**Endpoint:** `GET /metrics`

Key metrics to monitor:
- `http_requests_total` - Request count by status
- `http_request_duration_seconds` - Latency histogram
- `python_gc_objects_collected_total` - GC activity

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate (5xx) | > 1% | > 5% |
| P95 latency | > 500ms | > 2000ms |
| DB connections | > 60% | > 80% |
| Redis memory | > 70% | > 90% |

### Sentry Integration

- Transaction sampling: 10%
- Profile sampling: 10%
- Check Sentry dashboard for new issues after deploy

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | Slack: #oncall |
| Database Admin | dba@bgclive.com |
| Infrastructure | infra@bgclive.com |

---

## Appendix

### curl-format.txt
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### Environment Variables Reference

```bash
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=<32-char hex>
NEXTAUTH_SECRET=<base64 secret>

# Email
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@bgclive.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# Optional
APP_URL=https://bgclive.com
LOG_LEVEL=INFO
```
