# BGCLive Production Staging & Deployment Guide

**Version**: 1.0.0
**Domain**: `bgclive.online`
**Last Updated**: February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Prerequisites](#prerequisites)
4. [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
5. [Phase 2: Database Configuration (Supabase)](#phase-2-database-configuration-supabase)
6. [Phase 3: Redis Configuration (Upstash)](#phase-3-redis-configuration-upstash)
7. [Phase 4: Monitoring Setup (Sentry)](#phase-4-monitoring-setup-sentry)
8. [Phase 5: Backend Deployment](#phase-5-backend-deployment)
9. [Phase 6: Frontend Deployment](#phase-6-frontend-deployment)
10. [Phase 7: DNS & SSL Configuration](#phase-7-dns--ssl-configuration)
11. [Phase 8: Post-Deployment Verification](#phase-8-post-deployment-verification)
12. [Environment Variables Reference](#environment-variables-reference)
13. [Troubleshooting](#troubleshooting)

---

## Overview

### Production Stack

| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend | Vercel | Next.js 15 hosting with edge functions |
| Backend | Railway | FastAPI with async workers |
| Database | Supabase | PostgreSQL with connection pooling |
| Cache | Upstash | Managed Redis with TLS |
| Storage | Supabase Storage | Media files (images, videos) |
| Monitoring | Sentry | Error tracking & performance |
| Email | Resend | Transactional emails |
| DNS | Cloudflare | DNS management & CDN |

### Domain Structure

| Subdomain | Purpose | Target |
|-----------|---------|--------|
| `bgclive.online` | Frontend (Next.js) | Vercel |
| `api.bgclive.online` | Backend (FastAPI) | Railway |
| `www.bgclive.online` | Redirect to apex | Vercel |

---

## Architecture Diagram

```
                         ┌─────────────────┐
                         │   Cloudflare    │
                         │   (DNS + CDN)   │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
     ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
     │  bgclive.online │ │api.bgclive.online│ │ Storage CDN    │
     │    (Vercel)     │ │   (Railway)      │ │  (Supabase)    │
     │   Next.js 15    │ │    FastAPI       │ │                │
     └────────┬────────┘ └────────┬────────┘ └─────────────────┘
              │                   │
              │                   │
              │          ┌────────▼────────┐
              │          │    Services     │
              │          ├─────────────────┤
              │          │ Supabase (DB)   │
              │          │ Upstash (Redis) │
              │          │ Sentry (Logs)   │
              │          │ Resend (Email)  │
              └──────────┴─────────────────┘
```

---

## Prerequisites

### Required Accounts

- [ ] **Vercel** account (https://vercel.com)
- [ ] **Railway** account (https://railway.app)
- [ ] **Supabase** account (https://supabase.com)
- [ ] **Upstash** account (https://upstash.com)
- [ ] **Sentry** account (https://sentry.io)
- [ ] **Resend** account (https://resend.com)
- [ ] **Cloudflare** account (https://cloudflare.com)
- [ ] **GitHub** repository access

### Required Tools (Local)

```bash
# Node.js 20+
node --version  # v20.x.x

# Python 3.11+
python --version  # 3.11.x

# CLI Tools
npm install -g vercel
npm install -g railway
```

### Domain Registration Confirmed

- Domain: `bgclive.online`
- Registrar: [Your registrar]
- Nameservers: Will point to Cloudflare

---

## Phase 1: Infrastructure Setup

### Step 1.1: Cloudflare DNS Setup

1. **Add site to Cloudflare**:
   - Log in to Cloudflare Dashboard
   - Click "Add a Site" → Enter `bgclive.online`
   - Select Free plan (or Pro for advanced features)
   - Copy the Cloudflare nameservers provided

2. **Update nameservers at registrar**:
   - Log in to your domain registrar
   - Replace existing nameservers with Cloudflare's:
     ```
     ns1.cloudflare.com
     ns2.cloudflare.com
     ```
   - Wait 24-48 hours for propagation (usually faster)

3. **Configure SSL/TLS**:
   - Go to SSL/TLS → Overview
   - Set encryption mode to **Full (strict)**
   - Enable "Always Use HTTPS"

4. **Add DNS records** (after services are deployed):
   ```
   Type    Name    Content                 Proxy
   ─────────────────────────────────────────────────
   A       @       76.76.21.21             Proxied  (Vercel)
   CNAME   www     cname.vercel-dns.com    Proxied  (Vercel)
   CNAME   api     [railway-url]           Proxied  (Railway)
   ```

### Step 1.2: GitHub Repository Setup

1. Ensure repository is accessible:
   ```bash
   git clone https://github.com/z3r0fidev/bgc-replica.git
   cd bgc-replica
   ```

2. Create production branch (optional):
   ```bash
   git checkout -b production
   git push origin production
   ```

---

## Phase 2: Database Configuration (Supabase)

### Step 2.1: Create Supabase Project

1. Log in to Supabase Dashboard (https://app.supabase.com)
2. Click **New Project**
3. Configure:
   - **Organization**: Select or create
   - **Project name**: `bgclive-production`
   - **Database password**: Generate strong password (save securely!)
   - **Region**: Select closest to target users (e.g., `us-west-2`)
   - **Plan**: Pro (recommended for production)

4. Wait for project provisioning (~2 minutes)

### Step 2.2: Get Connection Strings

Navigate to **Project Settings** → **Database**

**Connection Strings Tab**:

| Use Case | Connection Type | Port |
|----------|-----------------|------|
| Railway (FastAPI) | Session Mode Pooler | 5432 |
| Migrations (Alembic) | Direct Connection | 5432 |
| Vercel (if needed) | Transaction Mode Pooler | 6543 |

**Copy these values**:

```bash
# For FastAPI (Session Mode - recommended for long-running)
DATABASE_URL=postgresql+asyncpg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# For Alembic migrations (Direct)
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Step 2.3: Run Database Migrations

```bash
# From your local machine with direct connection
cd backend

# Set direct connection for migrations
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Activate virtual environment
source venv/bin/activate  # Unix
.\venv\Scripts\activate   # Windows

# Run migrations
alembic upgrade head

# Verify tables created
# Check Supabase Dashboard → Table Editor
```

### Step 2.4: Configure Supabase Storage

1. Navigate to **Storage** in Supabase Dashboard

2. Create bucket:
   - Click **New Bucket**
   - Name: `bgclive-media`
   - Public bucket: **No** (unchecked)
   - File size limit: `104857600` (100MB)
   - Allowed MIME types:
     ```
     image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm, video/quicktime
     ```

3. Apply RLS policies via SQL Editor:
   ```sql
   -- Run the contents of: scripts/setup-supabase-storage.sql
   ```

4. Configure CORS:
   - Go to **Storage** → **Settings**
   - Add configuration:
   ```json
   {
     "allowedOrigins": [
       "http://localhost:3000",
       "https://bgclive.online"
     ],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedHeaders": ["Authorization", "Content-Type", "x-upsert"],
     "maxAge": 3600
   }
   ```

### Step 2.5: Get API Keys

Navigate to **Project Settings** → **API**

Copy these values:
```bash
# Project URL
SUPABASE_URL=https://[PROJECT-REF].supabase.co

# Service Role Key (KEEP SECRET - backend only)
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anon Key (can be public - frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Phase 3: Redis Configuration (Upstash)

### Step 3.1: Create Upstash Redis Database

1. Log in to Upstash Console (https://console.upstash.com)
2. Click **Create Database**
3. Configure:
   - **Name**: `bgclive-prod-redis`
   - **Type**: Regional
   - **Primary Region**: `us-west-2` (match Supabase region)
   - **Read Regions**: Add if needed for geo-distribution
   - **TLS**: **Enabled** (required)
   - **Eviction**: **No eviction** (or LRU if memory constrained)

4. Click **Create**

### Step 3.2: Get Connection Details

After creation, click on the database and copy:

```bash
# REST API (for serverless)
UPSTASH_REDIS_REST_URL=https://big-jennet-37167.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZEvAAIncDE...

# Redis Protocol (for FastAPI)
REDIS_URL=rediss://default:[PASSWORD]@big-jennet-37167.upstash.io:6379

# Note: Use 'rediss://' (with double 's') for TLS
```

### Step 3.3: Verify Connection

```bash
# Test from command line
redis-cli --tls -u "rediss://default:[PASSWORD]@big-jennet-37167.upstash.io:6379" ping
# Expected: PONG
```

### Best Practices

- **Always use TLS** (`rediss://` protocol)
- **Set appropriate TTLs** for cached data
- **Monitor memory usage** in Upstash dashboard
- **Enable eviction policy** if approaching memory limits

---

## Phase 4: Monitoring Setup (Sentry)

### Step 4.1: Create Sentry Projects

1. Log in to Sentry (https://sentry.io)
2. Create organization (if new): `bgclive`

3. **Create Frontend Project**:
   - Click **Create Project**
   - Platform: **Next.js**
   - Project name: `bgclive-frontend`
   - Team: Default

4. **Create Backend Project**:
   - Click **Create Project**
   - Platform: **FastAPI**
   - Project name: `bgclive-backend`
   - Team: Default

### Step 4.2: Get DSN Values

For each project, go to **Settings** → **Client Keys (DSN)**:

```bash
# Frontend DSN
NEXT_PUBLIC_SENTRY_DSN=https://[key]@o[org].ingest.us.sentry.io/[project]

# Backend DSN
SENTRY_DSN=https://[key]@o[org].ingest.us.sentry.io/[project]
```

### Step 4.3: Configure Frontend Sentry

The project is already configured with Sentry. Verify files exist:

```bash
# Check configuration files
ls frontend/sentry.*.config.ts
# Should show: sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts

ls frontend/instrumentation.ts
# Should exist
```

Update `frontend/.env.local`:
```bash
SENTRY_DSN=https://[your-dsn]
SENTRY_AUTH_TOKEN=[your-auth-token]  # For source map uploads
```

### Step 4.4: Configure Backend Sentry

Backend Sentry is initialized in `backend/app/main.py`. Verify:

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment="production",
    traces_sample_rate=0.1,  # 10% sampling
    profiles_sample_rate=0.1,
    send_default_pii=True,
    integrations=[
        StarletteIntegration(middleware_spans=True),
        FastApiIntegration(middleware_spans=True),
    ],
)
```

### Step 4.5: Create Auth Token (for source maps)

1. Go to **Settings** → **Auth Tokens**
2. Click **Create New Token**
3. Scopes: `project:releases`, `org:read`
4. Copy token for `SENTRY_AUTH_TOKEN`

---

## Phase 5: Backend Deployment

### Step 5.1: Railway Project Setup

1. Log in to Railway (https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select repository: `z3r0fidev/bgc-replica`
4. Select root directory: `/backend`

### Step 5.2: Configure Railway Service

1. Click on the service → **Settings**

2. **Build Configuration**:
   ```
   Root Directory: /backend
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

3. **Environment Variables** (Add all):

   ```bash
   # Database (Supabase Session Mode)
   DATABASE_URL=postgresql+asyncpg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

   # Redis (Upstash with TLS)
   REDIS_URL=rediss://default:[PASSWORD]@[endpoint].upstash.io:6379

   # Security
   SECRET_KEY=[generate: openssl rand -hex 32]
   NEXTAUTH_SECRET=[same as frontend AUTH_SECRET]
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30

   # OAuth
   GOOGLE_CLIENT_ID=[your-google-client-id]
   GOOGLE_CLIENT_SECRET=[your-google-client-secret]

   # Supabase Storage
   SUPABASE_URL=https://[PROJECT-REF].supabase.co
   SUPABASE_KEY=[service-role-key]
   MEDIA_BUCKET_NAME=bgclive-media

   # Email
   RESEND_API_KEY=re_[your-key]
   RESEND_FROM_EMAIL=noreply@bgclive.online

   # Monitoring
   SENTRY_DSN=https://[key]@sentry.io/[project]
   SENTRY_ENVIRONMENT=production

   # App Config
   APP_URL=https://bgclive.online
   CORS_ORIGINS=["https://bgclive.online","https://www.bgclive.online"]
   DEBUG=False
   ```

### Step 5.3: Configure Custom Domain

1. In Railway service → **Settings** → **Networking**
2. Click **Generate Domain** (get initial Railway URL)
3. Click **Custom Domain** → Add `api.bgclive.online`
4. Copy the CNAME target provided
5. Add CNAME record in Cloudflare:
   ```
   Type: CNAME
   Name: api
   Target: [railway-provided-target]
   Proxy: Yes (orange cloud)
   ```

### Step 5.4: Deploy and Verify

1. Push to trigger deployment:
   ```bash
   git push origin main
   ```

2. Monitor deployment logs in Railway dashboard

3. Verify health endpoint:
   ```bash
   curl https://api.bgclive.online/health
   # Expected: {"status":"ok","checks":{"database":"up","redis":"up"}}
   ```

---

## Phase 6: Frontend Deployment

### Step 6.1: Vercel Project Setup

1. Log in to Vercel (https://vercel.com)
2. Click **Add New** → **Project**
3. Import from GitHub: `z3r0fidev/bgc-replica`
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 6.2: Configure Environment Variables

In Vercel project → **Settings** → **Environment Variables**:

```bash
# API
NEXT_PUBLIC_API_URL=https://api.bgclive.online

# Authentication
AUTH_SECRET=[generate: openssl rand -base64 33]
AUTH_GOOGLE_ID=[your-google-client-id].apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-[your-secret]
AUTH_URL=https://bgclive.online

# Database (for NextAuth adapter if used)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Supabase (optional - for direct client access)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://[key]@sentry.io/[project]
SENTRY_AUTH_TOKEN=[auth-token]
SENTRY_ORG=bgclive
SENTRY_PROJECT=bgclive-frontend
```

### Step 6.3: Configure Custom Domain

1. In Vercel project → **Settings** → **Domains**
2. Add domains:
   - `bgclive.online` (apex)
   - `www.bgclive.online`
3. Copy the verification records
4. Add in Cloudflare:
   ```
   Type: A
   Name: @
   Content: 76.76.21.21
   Proxy: Yes

   Type: CNAME
   Name: www
   Target: cname.vercel-dns.com
   Proxy: Yes
   ```

### Step 6.4: Update Google OAuth

1. Go to Google Cloud Console → **APIs & Services** → **Credentials**
2. Edit OAuth 2.0 Client
3. Add Authorized redirect URIs:
   ```
   https://bgclive.online/api/auth/callback/google
   ```
4. Add Authorized JavaScript origins:
   ```
   https://bgclive.online
   ```

### Step 6.5: Deploy and Verify

1. Push to trigger deployment:
   ```bash
   git push origin main
   ```

2. Monitor build in Vercel dashboard

3. Verify:
   ```bash
   curl -I https://bgclive.online
   # Expected: HTTP/2 200
   ```

---

## Phase 7: DNS & SSL Configuration

### Step 7.1: Final DNS Records (Cloudflare)

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | @ | 76.76.21.21 | Proxied | Auto |
| CNAME | www | cname.vercel-dns.com | Proxied | Auto |
| CNAME | api | [railway-cname-target] | Proxied | Auto |
| TXT | @ | [vercel-verification] | DNS only | Auto |

### Step 7.2: SSL/TLS Settings (Cloudflare)

1. **SSL/TLS** → **Overview**:
   - Encryption mode: **Full (strict)**

2. **SSL/TLS** → **Edge Certificates**:
   - Always Use HTTPS: **On**
   - Minimum TLS Version: **TLS 1.2**
   - Opportunistic Encryption: **On**
   - TLS 1.3: **On**
   - Automatic HTTPS Rewrites: **On**

3. **SSL/TLS** → **Origin Server**:
   - Origin Certificates: Not needed (Vercel/Railway handle)

### Step 7.3: Security Headers (Cloudflare)

1. Go to **Rules** → **Transform Rules** → **Modify Response Headers**
2. Add rule:
   - Name: `Security Headers`
   - Expression: `(http.host eq "bgclive.online") or (http.host eq "api.bgclive.online")`
   - Headers to set:
     ```
     X-Content-Type-Options: nosniff
     X-Frame-Options: DENY
     Referrer-Policy: strict-origin-when-cross-origin
     Permissions-Policy: camera=(), microphone=(), geolocation=()
     ```

### Step 7.4: Page Rules

1. **Caching** (Cloudflare → Rules → Page Rules):
   ```
   URL: bgclive.online/api/*
   Setting: Cache Level = Bypass
   ```

2. **Always HTTPS**:
   ```
   URL: *bgclive.online/*
   Setting: Always Use HTTPS
   ```

---

## Phase 8: Post-Deployment Verification

### Step 8.1: Health Checks

```bash
# Backend health
curl https://api.bgclive.online/health
# Expected: {"status":"ok","checks":{"database":"up","redis":"up"}}

# Frontend
curl -I https://bgclive.online
# Expected: HTTP/2 200

# API responsiveness
curl -w "\nTotal time: %{time_total}s\n" https://api.bgclive.online/health
# Expected: < 500ms
```

### Step 8.2: Authentication Flow

1. Visit https://bgclive.online
2. Click "Sign Up" / "Log In"
3. Test Google OAuth flow
4. Test email/password registration
5. Verify session persistence (refresh page)

### Step 8.3: Feature Verification Checklist

- [ ] Landing page loads correctly
- [ ] PWA install prompt appears on mobile
- [ ] Google OAuth login works
- [ ] Email/password registration works
- [ ] Profile page loads
- [ ] User search works
- [ ] Chat messaging works
- [ ] Gallery upload works
- [ ] Forums display correctly
- [ ] Personals section accessible

### Step 8.4: Performance Verification

```bash
# Lighthouse audit (install lighthouse globally first)
npx lighthouse https://bgclive.online --view

# Core Web Vitals targets:
# - LCP: < 2.5s
# - FID: < 100ms
# - CLS: < 0.1
# - PWA Score: > 90
```

### Step 8.5: Monitoring Verification

1. **Sentry**: Trigger test error:
   - Visit https://bgclive.online/sentry-example-page
   - Verify error appears in Sentry dashboard

2. **Check dashboards**:
   - Sentry: No new errors
   - Railway: CPU/Memory normal
   - Upstash: Redis connections healthy
   - Supabase: Database connections within limits

---

## Environment Variables Reference

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |
| `AUTH_SECRET` | Yes | NextAuth secret (32+ chars) |
| `AUTH_URL` | Yes | Frontend URL for auth |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth Client Secret |
| `DATABASE_URL` | Conditional | If using NextAuth DB adapter |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Sentry DSN for frontend |
| `SENTRY_AUTH_TOKEN` | Yes | For source map uploads |
| `SENTRY_ORG` | Yes | Sentry organization slug |
| `SENTRY_PROJECT` | Yes | Sentry project slug |

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection (asyncpg) |
| `REDIS_URL` | Yes | Redis connection (with TLS) |
| `SECRET_KEY` | Yes | JWT signing key (64 hex chars) |
| `NEXTAUTH_SECRET` | Yes | Shared with frontend |
| `ALGORITHM` | Yes | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | Token TTL (default: 30) |
| `GOOGLE_CLIENT_ID` | Yes | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth Client Secret |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Service role key |
| `MEDIA_BUCKET_NAME` | Yes | Storage bucket name |
| `RESEND_API_KEY` | Yes | Email service API key |
| `RESEND_FROM_EMAIL` | Yes | Sender email address |
| `SENTRY_DSN` | Yes | Sentry DSN for backend |
| `SENTRY_ENVIRONMENT` | Yes | `production` or `staging` |
| `APP_URL` | Yes | Frontend URL |
| `CORS_ORIGINS` | Yes | Allowed origins (JSON array) |
| `DEBUG` | Yes | `False` for production |

---

## Troubleshooting

### Database Connection Issues

**Symptom**: `connection refused` or timeout errors

**Solutions**:
1. Verify DATABASE_URL format includes `postgresql+asyncpg://`
2. Check Supabase is using Session Mode pooler (port 5432)
3. Verify IP is not blocked in Supabase network restrictions
4. Test connection locally first:
   ```bash
   python -c "import asyncpg; import asyncio; asyncio.run(asyncpg.connect('...'))"
   ```

### Redis Connection Issues

**Symptom**: `NOAUTH` or TLS errors

**Solutions**:
1. Ensure using `rediss://` (double 's') for TLS
2. Verify password is URL-encoded if contains special chars
3. Check Upstash dashboard for connection status
4. Test:
   ```bash
   redis-cli --tls -u "$REDIS_URL" ping
   ```

### OAuth Redirect Errors

**Symptom**: `redirect_uri_mismatch` from Google

**Solutions**:
1. Add exact redirect URI to Google Console:
   - `https://bgclive.online/api/auth/callback/google`
2. Ensure no trailing slashes
3. Wait 5-10 minutes for Google changes to propagate
4. Clear browser cookies and retry

### CORS Errors

**Symptom**: `Access-Control-Allow-Origin` errors in console

**Solutions**:
1. Verify `CORS_ORIGINS` includes frontend URL (with https)
2. Check no trailing slash in origins
3. For Supabase Storage, update CORS config in dashboard

### 502/504 Gateway Errors

**Symptom**: Intermittent 502 or 504 errors

**Solutions**:
1. Check Railway logs for crash loops
2. Verify memory/CPU limits not exceeded
3. Check database connection pool exhaustion
4. Review Sentry for unhandled exceptions

### SSL Certificate Errors

**Symptom**: Certificate warnings in browser

**Solutions**:
1. Ensure Cloudflare SSL set to "Full (strict)"
2. Verify DNS records are proxied (orange cloud)
3. Wait for SSL certificate provisioning (up to 24h)
4. Check Vercel/Railway have SSL enabled

---

## Rollback Procedures

### Frontend Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find last known good deployment
3. Click "..." → "Promote to Production"

### Backend Rollback (Railway)

1. Go to Railway Dashboard → Deployments
2. Find last known good deployment
3. Click "Rollback to this deployment"

### Database Rollback (Alembic)

```bash
# View migration history
alembic history

# Downgrade one version
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade abc123
```

---

## Support Contacts

| Role | Contact | Response Time |
|------|---------|---------------|
| DevOps Lead | [TBD] | 4 hours |
| Backend Lead | [TBD] | 4 hours |
| Frontend Lead | [TBD] | 4 hours |
| Emergency Escalation | [TBD] | 1 hour |

---

## Appendix A: Generate Secrets

```bash
# AUTH_SECRET (for NextAuth)
openssl rand -base64 33

# SECRET_KEY (for backend JWT)
openssl rand -hex 32

# Example output:
# AUTH_SECRET: 8dvV/BfEgQ4ntQSgncL6wAAlgc4S4NjcD2xTaEezHf07
# SECRET_KEY: 98aaafe4d6fa9330c1bcb7b259e9f69ecb84ed66d4a48a232f5fa17a82064095
```

## Appendix B: Verify TLS Connections

```bash
# Check frontend SSL
openssl s_client -connect bgclive.online:443 -servername bgclive.online < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Check API SSL
openssl s_client -connect api.bgclive.online:443 -servername api.bgclive.online < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

## Appendix C: Quick Health Check Script

```bash
#!/bin/bash
# save as check-health.sh

echo "=== BGCLive Health Check ==="

echo -n "Frontend: "
curl -s -o /dev/null -w "%{http_code}" https://bgclive.online
echo ""

echo -n "API: "
curl -s https://api.bgclive.online/health | jq -r '.status'

echo -n "Database: "
curl -s https://api.bgclive.online/health | jq -r '.checks.database'

echo -n "Redis: "
curl -s https://api.bgclive.online/health | jq -r '.checks.redis'

echo "=== Done ==="
```

---

*Document prepared for BGCLive DevOps Team - February 2026*
