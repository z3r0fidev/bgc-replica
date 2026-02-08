-- Manual Migration Reference for bgc-replica
-- Purpose: Emergency/manual schema updates if Alembic is unavailable.
--
-- NOTE: All these columns are now covered by Alembic migrations.
-- Current head: ef5bf3554d9e (merged gallery + admin branches)
--
-- This file is for REFERENCE ONLY - use `alembic upgrade head` for migrations.

-- =====================================================
-- USERS TABLE - 2FA Fields (Migration: 4bf83210bf86)
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes VARCHAR(20)[];

-- =====================================================
-- USERS TABLE - Notification Preferences (Migration: 5e91d72c83a1)
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB;

-- =====================================================
-- USERS TABLE - Suspension/Ban Fields (Migration: c3d4e5f6a7b8)
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(500);

-- =====================================================
-- USERS TABLE - Metadata (Migration: 8f54cf5f0ff8)
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata_json JSONB;

-- Index for metadata performance
CREATE INDEX IF NOT EXISTS ix_users_metadata_gin ON users USING gin (metadata_json);

-- =====================================================
-- ADMIN ACTION LOGS TABLE (Migration: c3d4e5f6a7b8)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_action_logs (
    id UUID PRIMARY KEY,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    reason VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_admin_action_logs_admin_id ON admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS ix_admin_action_logs_target_user_id ON admin_action_logs(target_user_id);
CREATE INDEX IF NOT EXISTS ix_admin_action_logs_action ON admin_action_logs(action);
CREATE INDEX IF NOT EXISTS ix_admin_action_logs_created_at ON admin_action_logs(created_at);
CREATE INDEX IF NOT EXISTS ix_admin_action_logs_action_created ON admin_action_logs(action, created_at);
