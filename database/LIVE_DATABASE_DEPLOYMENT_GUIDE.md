# Live Database Deployment Guide: BGCLive Replica

## 1. Executive Summary
This guide provides a production-ready roadmap for deploying and maintaining the PostgreSQL and Redis infrastructure for the BGCLive Replica application. The strategy transitions the project from a development-local setup to an enterprise-grade managed environment (e.g., Supabase, AWS RDS, or Azure Database for PostgreSQL) with a focus on **high availability, sub-100ms query performance, and multi-layered security**.

### Core Architecture
- **Primary Database**: PostgreSQL 15+ (Managed)
- **Caching Layer**: Redis 7.0+ (Upstash or Managed Redis Cluster)
- **Connection Management**: PgBouncer (Transaction mode)
- **Indexing Strategy**: GIN (JSONB), BRIN (Time-series), and B-Tree (FKs)

---

## 2. Supporting Research & Implementation Logic

### 2.1 Connection Pooling (PgBouncer vs. SQLAlchemy)
Research into high-concurrency FastAPI applications indicates that application-side pooling (SQLAlchemy) is insufficient for 10k+ concurrent users. 
- **Decision**: Deploy a managed connection pooler (like Supabase's built-in PgBouncer) in `transaction` mode to allow thousands of client connections without exhausting PostgreSQL's process limit.
- **Config**: `pool_size=20`, `max_overflow=50`, `pool_pre_ping=True`.

### 2.2 Advanced Indexing for Social Workloads
The BGCLive Replica relies heavily on JSONB metadata and rapid feed scrolling.
- **GIN Indexes**: Essential for the `metadata_json` column in `Users` and `interests/roles` in `Profiles`. Without GIN, metadata filtering requires sequential scans.
- **BRIN Indexes**: Implemented on `Message.created_at`. BRIN is 100x smaller than B-Tree for time-ordered data, significantly reducing I/O for historical chat logs.

### 2.3 Cache-Aside Strategy
To meet the SC-003 success criteria (sub-100ms response times), a Redis cache-aside layer is implemented for:
1.  **User Sessions**: 24h TTL.
2.  **User Profiles**: 1h TTL, invalidated on `PUT /api/profiles/me`.
3.  **Global Feed IDs**: Real-time ZSET updates.

---

## 3. Step-by-Step Implementation Guide

### Step 1: Provision Production Infrastructure
1.  **PostgreSQL**: Provision a managed instance with at least 2 vCPUs and 4GB RAM (e.g., Supabase Pro tier).
2.  **Redis**: Provision a Redis instance with persistence enabled (e.g., Upstash Redis for global low-latency).
3.  **Networking**: Enable "Enforce SSL" on the database provider and whitelist only the backend application's IP addresses (or use a VPC).

### Step 2: Configure Environment Variables
Update the production `.env` file with the high-performance connection strings:
```bash
# Production Database (Note the +asyncpg and pgbouncer port 6543)
DATABASE_URL="postgresql+asyncpg://postgres:[PASS]@[HOST]:6543/postgres?ssl=require&prepared_statements=false"

# Production Redis
REDIS_URL="redis://:[PASS]@[HOST]:[PORT]/0"
```

### Step 3: Schema Migration & Initial Seeding
Run Alembic migrations from a CI/CD pipeline or a jump box to apply production indexes:
```bash
cd backend
# Run migration to create tables and GIN/BRIN indexes
export PYTHONPATH=.
alembic upgrade head

# Seed initial system categories (if needed)
python app/core/seed_forums.py
```

### Step 4: Performance Tuning (SQL Parameters)
Execute the following tuning parameters on the live database to optimize for social networking traffic:
```sql
-- Increase worker processes for index maintenance
ALTER SYSTEM SET max_parallel_maintenance_workers = 4;
-- Optimize for read-heavy workloads
ALTER SYSTEM SET random_page_cost = 1.1; 
-- Enable query performance tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Step 5: Implement Automated Backups (SecOps)
1.  **WAL Archiving**: Enable Write-Ahead Logging (WAL) for Point-in-Time Recovery (PITR).
2.  **Verification**: Schedule the `backend/scripts/verify_backups.py` script to run via GitHub Actions or Cron after the daily backup completes.

### Step 6: Enable Monitoring & Observability
1.  **Prometheus**: Ensure the backend is instrumented (`Instrumentator().instrument(app).expose(app)`).
2.  **Grafana**: Import the "PostgreSQL Database" dashboard and connect it to your Prometheus data source.
3.  **Alerting**: Set alerts for:
    - CPU Usage > 80%
    - Connection count > 90% of pool
    - Average Query Latency > 200ms

---

## 4. Operational Maintenance
- **Weekly**: Run `REINDEX TABLE messages;` if BRIN performance degrades.
- **Monthly**: Review `pg_stat_statements` to identify N+1 queries that escaped Phase 6 optimizations.
- **Quarterly**: Audit Database Row Level Security (RLS) policies to ensure data isolation.
