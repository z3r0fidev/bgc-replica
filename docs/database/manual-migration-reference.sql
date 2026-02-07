-- Manual Migration for bgc-replica User Model
-- Purpose: Add missing columns to 'users' table to match SQLAlchemy model definitions.

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes VARCHAR(20)[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB;

ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(500);

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata_json JSONB;

-- Index for metadata performance
CREATE INDEX IF NOT EXISTS ix_users_metadata_gin ON users USING gin (metadata_json);
