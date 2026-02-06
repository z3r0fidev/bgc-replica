# Admin Dashboard User Guide

## Overview

The Admin Dashboard provides comprehensive tools for managing users, monitoring system health, and analyzing platform metrics. Access requires the `is_superuser` flag on your account.

**URL:** `/admin`

## Dashboard Sections

### 1. Stats Overview

The main dashboard displays key metrics at a glance:

| Metric | Description |
|--------|-------------|
| Total Users | All registered accounts |
| Active Users | Users who have logged in within 30 days |
| Suspended Users | Temporarily restricted accounts |
| Banned Users | Permanently restricted accounts |
| Admin Users | Accounts with superuser privileges |
| New Today | Registrations in the last 24 hours |
| New This Week | Registrations in the last 7 days |
| New This Month | Registrations in the last 30 days |

Stats auto-refresh every 30 seconds.

---

### 2. User Management

#### Searching Users
- **Quick Search:** Enter username or email in the search bar
- **Filters:**
  - Status: Active, Inactive, Suspended, Banned
  - Role: Regular User, Admin
- **Sorting:** By name, email, created date, last login

#### Viewing User Details
Click any user row to view:
- Profile information (if available)
- Account status and dates
- Suspension/ban history
- Login activity

#### User Actions

| Action | Description | Rate Limit |
|--------|-------------|------------|
| **Edit User** | Update name, email, active status | 10/min |
| **Suspend** | Temporarily restrict access with reason | 5/min |
| **Ban** | Permanently restrict access with reason | 5/min |
| **Restore** | Remove suspension or ban | 5/min |
| **Grant Admin** | Give superuser privileges | 5/min |
| **Revoke Admin** | Remove superuser privileges | 5/min |

##### Suspending a User
1. Click the user row
2. Select "Suspend" from actions
3. Enter a reason (required, 5-500 characters)
4. Optionally set duration (1-8760 hours)
5. Confirm action

If no duration is set, suspension is indefinite until manually restored.

##### Banning a User
1. Click the user row
2. Select "Ban" from actions
3. Enter a reason (required, 5-500 characters)
4. Confirm action

Bans are permanent and clear any existing suspension.

##### Restoring a User
1. Click the suspended/banned user
2. Select "Restore" from actions
3. Confirm action

The user regains full access immediately.

---

### 3. Analytics

#### User Growth
- Daily registration counts over selected period
- DAU (Daily Active Users)
- WAU (Weekly Active Users)
- MAU (Monthly Active Users)

#### Engagement Metrics
- Posts created per day
- Comments per day
- Forum activity
- Content creation trends

#### Time Range
Select from:
- Last 7 days
- Last 30 days (default)
- Last 90 days

Charts are interactive with tooltips showing exact values.

---

### 4. System Health

#### Overall Status
- **Healthy:** All systems operational
- **Degraded:** Some errors but services responding
- **Unhealthy:** Critical service down

#### Database Health
| Metric | Description | Healthy Range |
|--------|-------------|---------------|
| Connections | Active database connections | < 80% of max |
| Max Connections | PostgreSQL connection limit | - |
| Pool Size | Connection pool size | 10 (default) |
| Cache Hit Ratio | Query cache effectiveness | > 90% |

#### Redis Health
| Metric | Description | Healthy Range |
|--------|-------------|---------------|
| Memory Used | Current memory consumption | < 80% of limit |
| Ops/sec | Operations per second | Varies |
| Connected Clients | Active connections | < 100 |
| Uptime | Time since last restart | - |

#### Cache Statistics
| Metric | Description | Target |
|--------|-------------|--------|
| Overall Hit Ratio | Keyspace hits vs misses | > 75% |
| Block Cache Keys | Active block relationship caches | - |
| Friendship Cache Keys | Active friendship status caches | - |
| Evicted Keys | Keys removed due to memory pressure | 0 |
| Expired Keys | Keys that expired naturally | Varies |

Cache patterns monitored:
- `blocks:*` - User block relationships (5 min TTL)
- `friendship:*` - Friendship status (10 min TTL)
- `session:*` - User session data
- `fastapi-limiter:*` - Rate limiting counters

#### Error Summary
- Failed authentication attempts (24h)
- Total error events (24h)

Health status auto-refreshes every 30 seconds.

---

### 5. Action Logs

Complete audit trail of admin actions.

#### Available Filters
- **Action Type:** UPDATE_USER, SUSPEND_USER, BAN_USER, RESTORE_FROM_BAN, RESTORE_FROM_SUSPENSION, GRANT_ADMIN, REVOKE_ADMIN
- **Admin:** Filter by admin who performed action
- **Target User:** Filter by affected user

#### Log Entry Details
Each entry shows:
- Timestamp
- Admin who performed action
- Action type
- Target user
- Reason (for suspensions/bans)
- Metadata (changes made)

Logs are retained indefinitely for compliance.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search bar |
| `Esc` | Close dialogs |
| `r` | Refresh current view |

---

## Rate Limits

Admin operations are rate-limited to prevent abuse:

| Operation Type | Limit |
|---------------|-------|
| View/List/Search | 30 requests per minute |
| Update User | 10 requests per minute |
| Suspend/Ban/Restore | 5 requests per minute |
| Admin Privilege Changes | 5 requests per minute |

If you hit a rate limit, wait 60 seconds before retrying.

---

## Security Considerations

1. **Admin access is logged:** All actions are recorded in the audit log
2. **Self-protection:** You cannot revoke your own admin status or ban yourself
3. **Cannot admin banned users:** Banned users must be restored before granting admin
4. **Session timeout:** Admin sessions expire after 24 hours of inactivity

---

## Troubleshooting

### Cannot access dashboard
- Verify your account has `is_superuser: true`
- Check if your session has expired (re-login)
- Ensure you're accessing the correct URL (`/admin`)

### Actions failing
- Check rate limit headers in browser dev tools
- Verify target user exists and is in expected state
- Check system health for backend issues

### Data not updating
- Try manual refresh (click refresh icon or press `r`)
- Check network tab for failed requests
- Verify backend services are healthy

---

## API Reference

For programmatic access, see:
- [Rate Limiting Documentation](api/rate-limiting.md)
- [Admin API Endpoints](#) (Swagger at `/docs`)
