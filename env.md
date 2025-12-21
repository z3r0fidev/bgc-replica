# BGCLive Replica: Environment Variables Guide

This document provides a comprehensive list of environment variables required for the BGCLive Replica project, along with detailed summaries and step-by-step guides for their retrieval and setup.

---

## 1. Frontend Domain (`frontend/.env.local`)

### Variable Summary
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | The public URL of the FastAPI backend. | `http://localhost:8000` |
| `AUTH_SECRET` | Secret used to sign NextAuth.js tokens. | (Generate via CLI) |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID. | `...apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret. | `GOCSPX-...` |
| `DATABASE_URL` | Prisma connection string (PostgreSQL). | `postgresql://...` |

### Step-by-Step Setup Guide

#### A. Generating `AUTH_SECRET`
NextAuth.js (Auth.js v5) requires a 32-character random string.
1.  Open your terminal.
2.  Run: `openssl rand -base64 33`
3.  Copy the output and assign it to `AUTH_SECRET`.

#### B. Google OAuth (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project named "BGCLive Replica".
3.  Navigate to **APIs & Services > Credentials**.
4.  Click **Create Credentials > OAuth client ID**.
5.  Select **Web application**.
6.  Add Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7.  Copy the **Client ID** and **Client Secret**.

#### C. Frontend `DATABASE_URL`
Since the frontend uses Prisma for the adapter, it needs direct DB access.
1.  Use the same PostgreSQL URL as the backend (see Database section).

---

## 2. Backend Domain (`backend/.env`)

### Variable Summary
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connection string (async). | `postgresql+asyncpg://...` |
| `REDIS_URL` | Connection string for Redis. | `redis://localhost:6379/0` |
| `SECRET_KEY` | Secret for signing Backend JWTs. | (Generate via CLI) |
| `NEXTAUTH_SECRET` | Shared secret with Frontend for unified auth. | (Matches `AUTH_SECRET`) |
| `SENTRY_DSN` | Sentry project DSN for error tracking. | `https://...@sentry.io/...` |
| `SUPABASE_URL` | Supabase project API URL. | `https://[id].supabase.co` |
| `SUPABASE_KEY` | Supabase Service Role or Anon Key. | `eyJh...` |
| `MEDIA_BUCKET_NAME` | Name of the Supabase Storage bucket. | `bgclive-media` |

### Step-by-Step Setup Guide

#### A. Backend `SECRET_KEY`
1.  Run: `openssl rand -hex 32`
2.  Assign to `SECRET_KEY`.

#### B. Sentry Setup (`SENTRY_DSN`)
1.  Sign up at [Sentry.io](https://sentry.io).
2.  Create a new project: **Python > FastAPI**.
3.  Go to **Project Settings > Client Keys (DSN)**.
4.  Copy the DSN URL.

#### C. Supabase Integration (`SUPABASE_URL`, `SUPABASE_KEY`)
1.  Go to [Supabase Dashboard](https://app.supabase.com/).
2.  Create a new project.
3.  Navigate to **Project Settings > API**.
4.  Copy the `Project URL` (`SUPABASE_URL`) and `service_role` key (`SUPABASE_KEY`).
5.  Go to **Storage**, create a new public bucket named `bgclive-media`.

---

## 3. Database Domain (Infrastructure)

### Variable Summary
| Variable | Description | Pattern |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string. | `postgresql://user:pass@host:port/db` |

### Step-by-Step Setup Guide

#### A. PostgreSQL (Local or Managed)
**For Managed (Supabase/RDS):**
1.  Copy the connection string from your provider's dashboard.
2.  **Crucial**: For FastAPI (SQLAlchemy Async), prefix with `postgresql+asyncpg://`.
3.  **Crucial**: For Prisma (Frontend), use standard `postgresql://`.

#### B. Redis (Local or Managed)
1.  **Local**: Use `redis://localhost:6379/0`.
2.  **Production**: Use [Upstash](https://upstash.com) or a managed Redis instance.
3.  Copy the URL which usually looks like `redis://default:password@host:port`.

---

## 4. Compiled `.env` Templates

### `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=your_32_char_secret
AUTH_GOOGLE_ID=your_google_id
AUTH_GOOGLE_SECRET=your_google_secret
DATABASE_URL=postgresql://postgres:[pass]@[host]:5432/postgres
```

### `backend/.env`
```env
DATABASE_URL=postgresql+asyncpg://postgres:[pass]@[host]:5432/postgres
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your_hex_secret
NEXTAUTH_SECRET=your_32_char_secret (matches AUTH_SECRET)
SENTRY_DSN=your_sentry_dsn
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
MEDIA_BUCKET_NAME=bgclive-media
DEBUG=True
```
