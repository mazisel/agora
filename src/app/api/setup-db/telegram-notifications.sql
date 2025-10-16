-- Ensure pgcrypto is available for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Telegram notification support fields
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS telegram_username TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;

-- Index for faster lookup by telegram username
CREATE INDEX IF NOT EXISTS idx_user_profiles_telegram_username
ON user_profiles (telegram_username);

-- Store Telegram notification send logs
CREATE TABLE IF NOT EXISTS telegram_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  data JSONB
);

-- Store one-time deep link tokens for Telegram linking
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  chat_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_user_id
  ON telegram_link_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_token
  ON telegram_link_tokens(token);

-- Track last login for reminder suppression
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Reminder queue for task assignments
CREATE TABLE IF NOT EXISTS task_assignment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  initial_notification_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_reminder_at TIMESTAMPTZ,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_attempts INTEGER NOT NULL DEFAULT 0,
  reminder_interval_minutes INTEGER NOT NULL DEFAULT 60,
  max_reminders INTEGER NOT NULL DEFAULT 12,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignment_reminders_next
  ON task_assignment_reminders(next_reminder_at)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_task_assignment_reminders_user
  ON task_assignment_reminders(user_id);
