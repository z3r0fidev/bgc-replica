# BGCLive Production Deployment Guide

**Domain:** bgclive.online
**Stack:** Next.js 16 (Vercel) + FastAPI (Railway) + PostgreSQL (Supabase) + Redis (Upstash) + Socket.io
**Last updated:** 2026-06-07

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Infrastructure Setup](#2-infrastructure-setup)
3. [Environment Variables](#3-environment-variables)
4. [CI/CD Pipeline Setup](#4-cicd-pipeline-setup)
5. [Database Migration](#5-database-migration)
6. [First Deploy Checklist](#6-first-deploy-checklist)
7. [Monitoring & Maintenance](#7-monitoring--maintenance)

---

## 1. Prerequisites

### Required Accounts

| Service | Purpose | URL |
|---|---|---|
| GitHub | Source code, CI/CD via GitHub Actions | https://github.com |
| Railway | FastAPI backend + Celery worker hosting | https://railway.app |
| Vercel | Next.js frontend hosting | https://vercel.com |
| Supabase | Managed PostgreSQL database + storage bucket | https://supabase.com |
| Upstash | Serverless Redis (rate limiting + Socket.io pubsub) | https://upstash.com |
| Sentry | Error tracking and performance monitoring | https://sentry.io |
| Google Cloud Console | OAuth 2.0 credentials for social login | https://console.cloud.google.com |
| Resend | Transactional email (verification, password reset) | https://resend.com |
| Domain Registrar | DNS management for bgclive.online | (your registrar) |

### Required CLI Tools

```bash
# Verify installed versions meet minimums:
node --version        # >= 20.x
npm --version         # >= 10.x
python3 --version     # >= 3.12
railway --version     # latest (install below)
vercel --version      # latest (install below)

# Install Railway CLI
npm install -g @railway/cli

# Install Vercel CLI
npm install -g vercel

# Login to each CLI
railway login
vercel login
```

### Environment Variable Inventory

Before starting, collect these values. The sections below explain how to obtain each one.

**Backend (Railway) — 15 variables required:**
- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `NEXTAUTH_SECRET`
- `CORS_ORIGINS`
- `SENTRY_DSN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `MEDIA_BUCKET_NAME`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_URL`
- `DEBUG`

**Frontend (Vercel) — 8 variables required:**
- `NEXT_PUBLIC_API_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Infrastructure Setup

### 2.1 Supabase — Database + Storage

**Create the project:**

1. Go to https://supabase.com/dashboard and click **New Project**.
2. Choose your organization, set a project name (e.g. `bgclive-production`), a strong database password, and the region closest to your users.
3. Wait for provisioning (~2 minutes).

**Collect connection strings:**

After the project is ready:

1. Go to **Settings > Database**.
2. Copy the **Connection string** in "URI" format. It looks like:
   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   This is your `DATABASE_URL`. The backend uses `asyncpg`, so replace `postgresql://` with `postgresql+asyncpg://` when setting the backend variable.

3. Go to **Settings > API**.
4. Copy the **Project URL** — this is your `SUPABASE_URL`.
5. Copy the **service_role** key — this is your `SUPABASE_KEY` (backend only, never expose publicly).
6. Copy the **anon** key — this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend).

**Create the media storage bucket:**

1. In Supabase, go to **Storage**.
2. Click **New bucket**, name it `bgclive-media`, set it to **Public** (for profile images and gallery).
3. This name must match `MEDIA_BUCKET_NAME=bgclive-media`.

**Configure RLS (Row Level Security):**

The application manages access control at the API layer. Ensure the service_role key is used for all server-side Supabase operations so it bypasses RLS.

---

### 2.2 Upstash — Redis

1. Go to https://console.upstash.com and click **Create Database**.
2. Choose **Redis**, select the region closest to your Railway deployment, enable **TLS**.
3. After creation, copy the **Redis URL** from the **Details** tab. It will look like:
   ```
   rediss://default:<password>@<host>.upstash.io:6379
   ```
   This is your `REDIS_URL`.

> **Important:** Upstash enforces a connection limit. The Procfile starts uvicorn with `--workers 4` and a Celery worker, which each maintain Redis connections. The free tier (max 100 concurrent connections) is sufficient for initial launch. Upgrade to a paid tier when traffic grows.

---

### 2.3 Railway — Backend Service

**Create the project:**

1. Go to https://railway.app/dashboard and click **New Project**.
2. Select **Empty Project**, name it `bgclive`.

**Add the backend service:**

1. Inside the project, click **+ New Service > Empty Service**.
2. Name it `backend`.
3. Go to the service **Settings** tab:
   - **Source**: Connect to your GitHub repository (`bgc-replica`).
   - **Root Directory**: Set to `backend`.
   - **Watch Paths**: Set to `backend/**` so only backend changes trigger deploys.
   - **Start Command**: Leave empty — `backend/railway.json`'s `deploy.startCommand` runs `backend/start.sh` automatically.

**Add the Celery worker service (required — emails and feed fan-out silently no-op without it):**

> **Important:** `backend/railway.json`'s checked-in `startCommand` takes precedence over any Custom Start Command set in the Railway dashboard, even per-service — the dashboard override is silently ignored. Do not rely on setting a dashboard Start Command to differentiate this service from the web service. `backend/start.sh` branches on the auto-injected `RAILWAY_SERVICE_NAME` env var instead, so this only works if the new service is named exactly `celery-worker`.

1. Add another **Empty Service**, name it exactly `celery-worker`.
2. Connect it to the same GitHub repo, **Root Directory** set to `backend` (this must be set explicitly — a fresh service defaults to the repo root and fails to build with "Railpack could not determine how to build the app" since it sees the whole monorepo).
3. Copy over the same environment variables the `backend` service uses (`DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`, `SECRET_KEY`, `NEXTAUTH_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`, `MEDIA_BUCKET_NAME`) — Celery tasks import the same `app.core.config.settings`/`app.core.database` modules as the web app.
4. Leave **Start Command** empty (per the note above, it wouldn't take effect anyway) — deploying with `RAILWAY_SERVICE_NAME=celery-worker` set (Railway sets this automatically from the service name) is what makes `start.sh` run `celery -A app.services.tasks worker --loglevel=info --concurrency=2` instead of `uvicorn`.
5. Verify it's actually consuming tasks: check the service logs for the Celery worker startup banner (not a `uvicorn running on...` line — if you see that, the service picked up the wrong branch, usually because it isn't named exactly `celery-worker`).

**Collect your Railway project details:**

After connecting GitHub, Railway will show your project in the dashboard. To get the `RAILWAY_TOKEN` for CI/CD:

1. Go to **Account Settings > Tokens**.
2. Click **Create Token**, name it `github-actions-deploy`, copy the value immediately.

---

### 2.4 Vercel — Frontend Service

**Link the project:**

```bash
cd /path/to/bgc-replica/frontend
vercel link --repo
```

Follow the prompts:
- Select your Vercel team/account.
- When asked which project, either select an existing one or create a new one named `bgclive-frontend`.

**Collect Vercel project details (for CI/CD):**

```bash
# After linking, these values are in frontend/.vercel/project.json
cat frontend/.vercel/project.json
# Output will contain:
# { "projectId": "prj_xxx", "orgId": "team_xxx" }
```

- `VERCEL_PROJECT_ID` = the `projectId` value
- `VERCEL_ORG_ID` = the `orgId` value

**Configure the production domain in Vercel:**

1. Go to your project in the Vercel dashboard.
2. Navigate to **Settings > Domains**.
3. Add `bgclive.online` and `www.bgclive.online`.
4. Vercel will provide DNS records to add at your registrar (see Section 2.5).

---

### 2.5 Domain Configuration — bgclive.online

**Frontend (Vercel):**

Add these records at your domain registrar's DNS management panel:

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` (Vercel's IP — verify in Vercel dashboard) |
| CNAME | `www` | `cname.vercel-dns.com` |

**Backend API subdomain (Railway):**

1. In Railway, go to your `backend` service > **Settings > Networking**.
2. Click **Generate Domain** to get a Railway subdomain (e.g. `backend-production-xxxx.up.railway.app`).
3. Alternatively, add a custom subdomain `api.bgclive.online`:
   - In Railway, click **Custom Domain**, enter `api.bgclive.online`.
   - Railway will provide a CNAME target (e.g. `<your-service>.railway.app`).
   - At your registrar, add: `CNAME api <railway-provided-target>`

> After setting up the API domain, use it as `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS`.

**DNS propagation:**

DNS changes can take up to 48 hours but typically resolve within 30 minutes. Check propagation with:

```bash
dig bgclive.online A
dig api.bgclive.online CNAME
```

---

### 2.6 Sentry — Error Tracking

1. Go to https://sentry.io and create a new **Organization** (or use existing).
2. Create two projects:
   - **Project 1**: Platform = `Next.js`, name = `javascript-nextjs` (must match `next.config.ts` which references `project: "javascript-nextjs"` and `org: "openlogic-distribution-ltd"`).
   - **Project 2**: Platform = `Python / FastAPI`, name = `python-fastapi`.
3. For each project, go to **Settings > Client Keys (DSN)** and copy the DSN.
4. The Next.js DSN is embedded in the frontend via the Sentry Next.js SDK (already configured in `next.config.ts`).
5. The FastAPI DSN is `SENTRY_DSN` in the backend env.

**Upload source maps (frontend):**

The `next.config.ts` uses `withSentryConfig` which automatically uploads source maps during Vercel builds when `SENTRY_AUTH_TOKEN` is set. Add `SENTRY_AUTH_TOKEN` to Vercel environment variables:

1. In Sentry: **Settings > Account > API > Auth Tokens > Create New Token**.
2. Grant `project:releases` and `org:read` scopes.

---

### 2.7 Google OAuth Setup

1. Go to https://console.cloud.google.com.
2. Create or select a project.
3. Go to **APIs & Services > OAuth consent screen** — configure with `bgclive.online` as the authorized domain.
4. Go to **APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID**.
5. Application type: **Web application**.
6. Authorized redirect URIs:
   - `https://bgclive.online/api/auth/callback/google`
   - `https://www.bgclive.online/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**.

---

### 2.8 Resend — Email

1. Go to https://resend.com/signup and create an account.
2. Go to **Domains** and add `bgclive.online`. Follow the DNS verification steps (adds a TXT record at your registrar).
3. Go to **API Keys > Create API Key**, name it `bgclive-production`.
4. Copy the API key — this is `RESEND_API_KEY`.
5. Set `RESEND_FROM_EMAIL=noreply@bgclive.online` (or any verified address on your domain).

---

## 3. Environment Variables

### 3.1 Complete Variable Reference

| Variable | Service | How to Obtain | Example |
|---|---|---|---|
| `DATABASE_URL` | Backend | Supabase > Settings > Database > URI (use `postgresql+asyncpg://` prefix) | `postgresql+asyncpg://postgres.abc123:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres` |
| `REDIS_URL` | Backend | Upstash > Database > Details > Redis URL | `rediss://default:pass@abc.upstash.io:6379` |
| `SECRET_KEY` | Backend | Generate with openssl (see below) | `a1b2c3d4...` (64 hex chars) |
| `NEXTAUTH_SECRET` | Backend | Must match frontend `AUTH_SECRET` | Same value as `AUTH_SECRET` |
| `CORS_ORIGINS` | Backend | Your Vercel frontend URL(s), comma-separated | `https://bgclive.online,https://www.bgclive.online` |
| `DEBUG` | Backend | Set to `false` in production | `false` |
| `SENTRY_DSN` | Backend | Sentry > Project > Settings > Client Keys | `https://abc@o123.ingest.sentry.io/456` |
| `GOOGLE_CLIENT_ID` | Backend | Google Cloud Console > Credentials | `123456789-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Backend | Google Cloud Console > Credentials | `GOCSPX-abc123` |
| `SUPABASE_URL` | Backend | Supabase > Settings > API > Project URL | `https://abc123.supabase.co` |
| `SUPABASE_KEY` | Backend | Supabase > Settings > API > service_role key | `eyJhbGciOiJIUzI1...` |
| `MEDIA_BUCKET_NAME` | Backend | Set to the bucket name you created | `bgclive-media` |
| `RESEND_API_KEY` | Backend | Resend > API Keys | `re_abc123` |
| `RESEND_FROM_EMAIL` | Backend | Your verified Resend domain address | `noreply@bgclive.online` |
| `APP_URL` | Backend | Your production frontend URL | `https://bgclive.online` |
| `NEXT_PUBLIC_API_URL` | Frontend | Your Railway backend URL | `https://api.bgclive.online` |
| `AUTH_SECRET` | Frontend | Generate with openssl (see below) | Base64 string (44 chars) |
| `AUTH_GOOGLE_ID` | Frontend | Same as `GOOGLE_CLIENT_ID` | `123456789-abc.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Frontend | Same as `GOOGLE_CLIENT_SECRET` | `GOCSPX-abc123` |
| `DATABASE_URL` | Frontend | Supabase > Settings > Database > URI (standard `postgresql://` prefix, for Prisma) | `postgresql://postgres.abc123:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres` |
| `NEXTAUTH_URL` | Frontend | Your production frontend URL | `https://bgclive.online` |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | Supabase > Settings > API > Project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Supabase > Settings > API > anon key | `eyJhbGciOiJIUzI1...` |
| `SENTRY_AUTH_TOKEN` | Frontend | Sentry > Account > API > Auth Tokens | `sntrys_abc123` |

### 3.2 Generate Secrets

```bash
# Generate SECRET_KEY for FastAPI JWT signing (backend)
openssl rand -hex 32
# Output: 64-character hex string — use as SECRET_KEY

# Generate AUTH_SECRET for NextAuth v5 (frontend + must match NEXTAUTH_SECRET in backend)
openssl rand -base64 33
# Output: 44-character base64 string — use as AUTH_SECRET and NEXTAUTH_SECRET
```

> **Critical:** `AUTH_SECRET` (frontend) and `NEXTAUTH_SECRET` (backend) must be **identical** values. The FastAPI backend validates JWT tokens issued by NextAuth using this shared secret.

### 3.3 Add Variables to Railway (Backend)

```bash
# Login and link to your project
railway login
railway link   # select your bgclive project and backend service

# Set all variables at once using a .env file approach
# Create a temporary local file (do NOT commit it):
cat > /tmp/railway-env.txt << 'EOF'
DATABASE_URL=postgresql+asyncpg://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:6543/postgres
REDIS_URL=rediss://default:<pass>@<host>.upstash.io:6379
SECRET_KEY=<your-generated-hex-key>
NEXTAUTH_SECRET=<your-auth-secret>
CORS_ORIGINS=https://bgclive.online,https://www.bgclive.online
DEBUG=false
SENTRY_DSN=<your-backend-sentry-dsn>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_KEY=<your-service-role-key>
MEDIA_BUCKET_NAME=bgclive-media
RESEND_API_KEY=re_<your-key>
RESEND_FROM_EMAIL=noreply@bgclive.online
APP_URL=https://bgclive.online
EOF

# Set each variable (Railway CLI reads one var at a time):
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  railway variables set "$key=$value"
done < /tmp/railway-env.txt

# Remove the temp file
rm /tmp/railway-env.txt
```

Alternatively, set them in the Railway dashboard:
1. Open your project > `backend` service > **Variables** tab.
2. Click **+ New Variable** for each entry.

### 3.4 Add Variables to Vercel (Frontend)

```bash
cd /path/to/bgc-replica/frontend

# Add production environment variables via Vercel CLI:
vercel env add NEXT_PUBLIC_API_URL production
# (paste value when prompted)

vercel env add AUTH_SECRET production
vercel env add AUTH_GOOGLE_ID production
vercel env add AUTH_GOOGLE_SECRET production
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SENTRY_AUTH_TOKEN production
```

Or add them in the Vercel dashboard:
1. Open your project > **Settings > Environment Variables**.
2. Add each variable, selecting **Production** environment.

---

## 4. CI/CD Pipeline Setup

### 4.1 Architecture Overview

```
Push to main (backend/**)  →  backend-ci.yml quality check  →  deploy-backend.yml  →  Railway
Push to main (frontend/**) →  frontend-ci.yml quality check →  deploy-frontend.yml →  Vercel
Pull Request to main       →  pr-validation.yml (lint, test, build check)
```

Both deploy workflows gate on their respective `quality-check` job passing. A failed lint or test run blocks deployment automatically.

The backend deploy uses the official Railway CLI Docker image (`ghcr.io/railwayapp/cli:latest`) and runs `railway up --service backend` from the `./backend` directory.

The frontend deploy uses the Vercel CLI three-step pattern: `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod`.

### 4.2 Required GitHub Repository Secrets

Go to your GitHub repository > **Settings > Secrets and variables > Actions > New repository secret** and add all of the following:

| Secret Name | Value | Used By Workflow |
|---|---|---|
| `RAILWAY_TOKEN` | Railway account token (from Railway > Account Settings > Tokens) | `deploy-backend.yml` |
| `VERCEL_TOKEN` | Vercel account token (from Vercel > Account Settings > Tokens) | `deploy-frontend.yml` |
| `VERCEL_ORG_ID` | From `frontend/.vercel/project.json` → `orgId` | `deploy-frontend.yml` |
| `VERCEL_PROJECT_ID` | From `frontend/.vercel/project.json` → `projectId` | `deploy-frontend.yml` |
| `NEXT_PUBLIC_API_URL` | Your production API URL (e.g. `https://api.bgclive.online`) | `deploy-frontend.yml` (build step) |
| `DATABASE_URL` | Supabase connection string (for PR validation runs) | `pr-validation.yml` (optional) |
| `REDIS_URL` | Upstash Redis URL | `pr-validation.yml` (optional) |
| `SECRET_KEY` | Backend JWT secret | `pr-validation.yml` (optional) |
| `NEXTAUTH_SECRET` | Shared auth secret | `pr-validation.yml` (optional) |

> The `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, and `NEXTAUTH_SECRET` secrets in GitHub are used only by the PR validation workflow as fallbacks. The actual production values are stored directly in Railway and Vercel, not in GitHub.

### 4.3 Branch Strategy

```
feature/*  →  PR  →  pr-validation.yml runs
             ↓
           main   →  deploy-backend.yml (if backend/** changed)
                  →  deploy-frontend.yml (if frontend/** changed)
```

- **`main`** is the production branch. Merging to `main` triggers deployment.
- **Path filtering** ensures only relevant services redeploy when files change. A commit touching only `frontend/**` will not re-deploy the backend.
- Use `workflow_dispatch` in the GitHub Actions UI to trigger a manual deployment of either service without a code push.

### 4.4 How to Trigger a Manual Deploy

**Backend:**
```bash
# Via GitHub CLI:
gh workflow run deploy-backend.yml --ref main

# Or in GitHub UI: Actions tab > "Deploy Backend" > "Run workflow" > select main branch
```

**Frontend:**
```bash
gh workflow run deploy-frontend.yml --ref main
```

---

## 5. Database Migration

### 5.1 Run Alembic Migrations Against Production

`backend/start.sh` (invoked via `railway.json`'s `deploy.startCommand`) runs `alembic upgrade head` automatically on every deploy of the web service, before starting `uvicorn`:

```sh
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
```

(The `celery-worker` service, running the same script, skips this and runs the Celery worker command instead — see 2.3 above.)

This means migrations run automatically when Railway deploys the backend. However, for manual migration runs or troubleshooting:

```bash
cd /path/to/bgc-replica/backend

# Activate your virtual environment
source venv/bin/activate   # Unix
# or: .\venv\Scripts\activate  (Windows)

# Export the production DATABASE_URL
export DATABASE_URL="postgresql+asyncpg://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:6543/postgres"

# Check current migration state
alembic current

# Apply all pending migrations
alembic upgrade head

# View migration history
alembic history --verbose

# Roll back one migration (use with caution in production)
alembic downgrade -1
```

### 5.2 Migration File Order

The migration chain as of the current codebase (apply in this order, though `alembic upgrade head` handles this automatically):

1. `3fc18fd104d4` — Initial schema
2. `09dd80fcee38` — Add is_personal to profile
3. `4bf83210bf86` — Add 2FA fields to users
4. `5c39ba489184` — Forum hierarchy and stats
5. `5e91d72c83a1` — Notification preferences
6. `6a8aa043491d` — Advanced profile attributes
7. `7d3e52af91c2` — Device info to sessions
8. `8c4f19ae72b3` — Auth logs table
9. `8f54cf5f0ff8` — Expand profile schema
10. `92c9bfa12002` — Personal posts and follows
11. `96be264b314b` — Created at to profile
12. `9f2b83cd41a7` — Group chats
13. `a1b2c3d4e5f6` — Verification badges
14. `a1b2c3d4e5f7` — Gallery media and albums
15. `b2c3d4e5f6a7` — Performance indexes
16. `c3d4e5f6a7b8` — Admin action logs
17. `ef5bf3554d9e` — Merge gallery and admin branches
18. `20251220` — Partition messages

### 5.3 Seed Data

To populate the database with the 150+ test personas (PHL/NJ metro area profiles):

```bash
cd /path/to/bgc-replica/backend

export DATABASE_URL="postgresql+asyncpg://..."

python scripts/seed_profiles.py
```

> Seed data is intended for staging environments. Do not run against a live production database with real users unless the seed script explicitly handles deduplication.

### 5.4 Prisma Schema Sync (Frontend)

The frontend uses Prisma 7 with the `@prisma/adapter-pg` driver for NextAuth's database adapter. After any schema changes:

```bash
cd /path/to/bgc-replica/frontend

# Generate Prisma client (also runs in CI automatically)
npx prisma generate

# If you need to push Prisma schema changes to the DB (use Alembic for production migrations):
npx prisma db push --skip-generate
```

---

## 6. First Deploy Checklist

Work through this checklist in order. Each step depends on the ones before it.

### Phase 1: Accounts and Credentials

- [ ] Create Supabase project and note Project URL, service_role key, anon key, and database URI
- [ ] Create Upstash Redis database and note Redis URL
- [ ] Create Railway project and `backend` service, connect to GitHub repo
- [ ] Link frontend to Vercel with `vercel link --repo` from `frontend/` directory
- [ ] Configure Google OAuth consent screen and create OAuth 2.0 credentials with production redirect URIs
- [ ] Create Resend account, verify `bgclive.online` domain, create API key
- [ ] Create Sentry organization with `openlogic-distribution-ltd` slug, create `javascript-nextjs` project and a FastAPI project
- [ ] Generate `SECRET_KEY` with `openssl rand -hex 32`
- [ ] Generate `AUTH_SECRET` with `openssl rand -base64 33`
- [ ] Confirm `AUTH_SECRET` value will be used as both frontend `AUTH_SECRET` and backend `NEXTAUTH_SECRET`

### Phase 2: Environment Variables

- [ ] Set all 15 backend environment variables in Railway dashboard or CLI
- [ ] Verify `DEBUG=false` is set in Railway
- [ ] Verify `CORS_ORIGINS` includes both `https://bgclive.online` and `https://www.bgclive.online`
- [ ] Set all 9 frontend environment variables in Vercel dashboard or CLI
- [ ] Confirm `NEXTAUTH_URL=https://bgclive.online` in Vercel
- [ ] Confirm `NEXT_PUBLIC_API_URL` points to your Railway backend URL

### Phase 3: GitHub Secrets

- [ ] Add `RAILWAY_TOKEN` to GitHub repository secrets
- [ ] Add `VERCEL_TOKEN` to GitHub repository secrets
- [ ] Add `VERCEL_ORG_ID` to GitHub repository secrets
- [ ] Add `VERCEL_PROJECT_ID` to GitHub repository secrets
- [ ] Add `NEXT_PUBLIC_API_URL` to GitHub repository secrets

### Phase 4: Database

- [ ] Run `alembic upgrade head` locally against the production Supabase URL to verify all 18 migrations apply cleanly
- [ ] Confirm Supabase storage bucket `bgclive-media` exists and is set to public access
- [ ] Run `npx prisma generate` to verify Prisma schema compiles against the database

### Phase 5: Initial Deploy

- [ ] Push or merge any pending changes to the `main` branch
- [ ] Monitor the **Deploy Backend** workflow in GitHub Actions — confirm `quality-check` and `deploy` jobs pass
- [ ] Monitor the **Deploy Frontend** workflow in GitHub Actions — confirm all three Vercel steps pass
- [ ] Confirm Railway shows the `backend` service as **Active** with a green deploy status

### Phase 6: DNS and Domain

- [ ] Add Vercel A record (`76.76.21.21`) and CNAME (`www`) at your registrar
- [ ] Add Railway CNAME for `api.bgclive.online` at your registrar (if using custom API domain)
- [ ] Add Resend DNS verification records (TXT/MX) at your registrar
- [ ] Wait for DNS propagation and verify with `dig bgclive.online A`

### Phase 7: Health Checks

Verify these URLs return expected responses after deployment:

| URL | Expected Response |
|---|---|
| `https://bgclive.online` | Next.js app loads in browser |
| `https://bgclive.online/api/auth/session` | JSON response (empty `{}` or session object) |
| `https://api.bgclive.online/health` | `{"status":"ok","checks":{"database":"up","redis":"up"}}` |
| `https://api.bgclive.online/docs` | FastAPI Swagger UI |
| `https://api.bgclive.online/metrics` | Prometheus metrics text output |

```bash
# Quick health check from terminal:
curl -s https://api.bgclive.online/health | python3 -m json.tool

# Expected:
# {
#   "status": "ok",
#   "checks": {
#     "database": "up",
#     "redis": "up"
#   }
# }
```

### Phase 8: Sentry Verification

- [ ] Open Sentry and confirm the `javascript-nextjs` project is receiving events
- [ ] Trigger a test error by visiting `https://bgclive.online/api/sentry-example-api` (if the Sentry example route exists) or by temporarily throwing an error in a route handler
- [ ] Confirm the FastAPI Sentry DSN is active by checking for startup events in the Python project
- [ ] Verify source maps are uploaded — click on a frontend error in Sentry and confirm stack traces show original TypeScript source lines (not minified bundle)

### Phase 9: Functional Smoke Test

- [ ] Register a new user account at `https://bgclive.online`
- [ ] Verify email confirmation arrives (Resend delivery)
- [ ] Log in with Google OAuth
- [ ] Upload a profile photo (tests Supabase storage)
- [ ] Send a direct message (tests Socket.io + Redis pubsub)
- [ ] Post in a forum (tests database write path)
- [ ] Verify the PWA install prompt appears on mobile

---

## 7. Monitoring & Maintenance

### 7.1 Log Access

**Railway backend logs:**

```bash
# Stream live logs for the backend service
railway logs --service backend --follow

# View last 200 lines
railway logs --service backend --lines 200
```

Or in the Railway dashboard: open your project > `backend` service > **Observability** tab.

**Vercel frontend logs:**

```bash
# List recent deployments
vercel ls

# View runtime logs for production deployment
vercel logs bgclive.online --prod
```

Or in the Vercel dashboard: open your project > **Deployments** tab > click a deployment > **Runtime Logs**.

### 7.2 Sentry Dashboard

- **Frontend errors:** https://sentry.io/organizations/openlogic-distribution-ltd/projects/javascript-nextjs/
- **Backend errors:** https://sentry.io/organizations/openlogic-distribution-ltd/projects/python-fastapi/

Key views to monitor:
- **Issues** — unhandled exceptions grouped by fingerprint
- **Performance** — P50/P95 response times per route (backend captures 10% of transactions via `traces_sample_rate=0.1`)
- **Releases** — correlate error spikes with deployment timestamps

### 7.3 Prometheus Metrics

The FastAPI backend exposes Prometheus metrics at `/metrics`. To scrape them:

```bash
curl https://api.bgclive.online/metrics
```

If you set up a Grafana Cloud or self-hosted Prometheus instance, configure a scrape job pointing to `https://api.bgclive.online/metrics` with appropriate auth.

### 7.4 Rollback Procedure

**Backend rollback (Railway):**

1. Go to Railway dashboard > `backend` service > **Deployments** tab.
2. Find the last known-good deployment.
3. Click the **...** menu next to it and select **Redeploy**.

Railway will redeploy that exact commit without running a new build.

Via CLI:
```bash
# List recent deployments
railway deployments --service backend

# Rollback to a specific deployment ID
railway rollback <deployment-id> --service backend
```

**Frontend rollback (Vercel):**

1. Go to Vercel dashboard > your project > **Deployments** tab.
2. Find the last known-good deployment (look for the previous **Production** badge).
3. Click the **...** menu and select **Promote to Production**.

Via CLI:
```bash
# List deployments
vercel ls

# Promote a previous deployment URL to production
vercel promote <deployment-url>
```

**Database rollback:**

```bash
# Roll back one Alembic migration:
export DATABASE_URL="postgresql+asyncpg://..."
alembic downgrade -1

# Roll back to a specific revision:
alembic downgrade <revision-id>
```

> Always take a Supabase database backup before rolling back a migration. In Supabase dashboard: **Settings > Backups > Create Backup**.

### 7.5 Scaling Considerations

| Component | Current Config | When to Scale |
|---|---|---|
| Uvicorn | 4 workers | Add Railway replicas when CPU > 70% sustained |
| Celery | 2 concurrent tasks | Increase `--concurrency` when task queue backs up |
| PostgreSQL | Supabase managed | Upgrade Supabase plan when connection pool is saturated |
| Redis | Upstash serverless | Upgrade tier when hitting connection or command limits |
| Frontend | Vercel Edge Network | Automatic (no action needed) |

To add more Railway replicas for the backend:

1. Railway dashboard > `backend` service > **Settings > Replicas**.
2. Increase the replica count. Railway load-balances across replicas automatically.

> Socket.io requires sticky sessions or a shared Redis adapter when running multiple backend replicas. The application is already configured to use `initialize_redis_manager()` at startup, which enables Socket.io's Redis pubsub adapter for multi-instance operation.

---

*This guide was generated based on the actual configuration files in the repository as of 2026-06-07. Review and update it when infrastructure or dependencies change.*
