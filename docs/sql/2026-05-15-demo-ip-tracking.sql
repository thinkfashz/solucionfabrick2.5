-- Migration: IP tracking & locking for demo tokens
-- Run this in InsForge SQL Editor → Execute

-- 1. demo_tokens: add IP lock columns + last access tracking
ALTER TABLE demo_tokens
  ADD COLUMN IF NOT EXISTS locked_ip        text,
  ADD COLUMN IF NOT EXISTS locked_at        timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_ip        text,
  ADD COLUMN IF NOT EXISTS ultimo_user_agent text;

-- 2. demo_session_events: add client IP and user-agent per page visit
ALTER TABLE demo_session_events
  ADD COLUMN IF NOT EXISTS client_ip  text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('demo_tokens', 'demo_session_events')
  AND column_name IN ('locked_ip', 'locked_at', 'ultimo_ip', 'ultimo_user_agent', 'client_ip', 'user_agent')
ORDER BY table_name, column_name;
