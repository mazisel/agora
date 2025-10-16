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
