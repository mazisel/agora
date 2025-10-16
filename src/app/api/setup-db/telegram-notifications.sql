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
