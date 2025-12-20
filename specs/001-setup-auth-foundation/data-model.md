# Data Model: Setup Auth & Foundation

## SQLAlchemy Models (PostgreSQL)

### User
Core identity for the application.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key, default=uuid4 | Unique identifier |
| name | String? | | Display name |
| email | String? | unique | User email |
| email_verified | DateTime? | | Timestamp of email verification |
| image | String? | | Avatar URL |
| hashed_password | String? | | Hashed password |
| is_active | Boolean | default=True | Account active status |
| is_superuser | Boolean | default=False | Superuser flag |
| accounts | Account[] | relationship | Linked OAuth accounts |
| sessions | Session[] | relationship | Active sessions |
| authenticators | Authenticator[] | relationship | Passkeys/Biometrics |
| created_at | DateTime | default=now() | Creation timestamp |
| updated_at | DateTime | default=now(), onupdate=now() | Last update timestamp |

### Account
Stores OAuth provider linkages (e.g., Google).

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key, default=uuid4 | Unique identifier |
| user_id | UUID | ForeignKey(User.id) | FK to User |
| provider | String | | e.g., "google" |
| provider_account_id | String | | ID from the provider |
| refresh_token | String? | | OAuth refresh token |
| access_token | String? | | OAuth access token |
| expires_at | Integer? | | Token expiration (timestamp) |
| token_type | String? | | e.g., "Bearer" |
| scope | String? | | Granted scopes |
| id_token | String? | | OIDC ID Token |
| session_state | String? | | Session state |

*Constraint*: Unique on `[provider, provider_account_id]`.

### Session
Manages active user sessions.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key, default=uuid4 | Unique identifier |
| session_token | String | unique | The actual session token |
| user_id | UUID | ForeignKey(User.id) | FK to User |
| expires | DateTime | | Expiration time |
| user | User | relationship | Relation to User |

### VerificationToken
Used for passwordless email sign-in (Magic Links).

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key, default=uuid4 | Unique identifier |
| identifier | String | | Email address |
| token | String | unique | Verification code/token |
| expires | DateTime | | Expiration time |

*Constraint*: Unique on `token`.

### Authenticator (Passkeys)
Stores WebAuthn credentials for biometric login.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key, default=uuid4 | Unique identifier |
| credential_id | String | unique | WebAuthn Credential ID |
| user_id | UUID | ForeignKey(User.id) | FK to User |
| provider_account_id | String | | Provider Account ID |
| credential_public_key | String | | Public Key |
| counter | Integer | | Sign count |
| credential_device_type | String | | Device type |
| credential_backed_up | Boolean | | Backup status |
| transports | String? | | Transports (usb, nfc, ble, internal) |

*Constraint*: Unique on `[user_id, credential_id]`.

### Enhancements from Database Architect
- **Additional Fields**:
  - User: Add `last_login_at` (DateTime?) for analytics.
  - User: Add `metadata` (JSONB?) for flexible attributes.
- **Indexes**:
  - User: Index on `email` and `is_active`.
  - Session: Index on `session_token` and `expires`.
  - Account: Index on `[provider, provider_account_id]`.
  - Authenticator: Index on `user_id`.
- **Caching**:
  - Use Redis for session caching to reduce DB load.
  - Keys: `user:{id}`, `session:{token}` with 24h TTL.
  - Strategy: Cache-aside for reads; invalidate on changes.
