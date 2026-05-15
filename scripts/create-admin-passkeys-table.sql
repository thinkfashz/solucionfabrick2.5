-- Migration: admin_passkeys table for WebAuthn / Passkey authentication
--
-- Run this once in the InsForge SQL editor (or via /api/admin/sql/migration).
-- Safe to run multiple times (IF NOT EXISTS guards).

CREATE TABLE IF NOT EXISTS public.admin_passkeys (
  id           TEXT PRIMARY KEY,        -- base64url credential ID from WebAuthn
  user_email   TEXT NOT NULL,           -- admin user who owns this passkey
  tenant_id    UUID NOT NULL,
  public_key   TEXT NOT NULL,           -- COSE public key, base64url-encoded
  counter      BIGINT NOT NULL DEFAULT 0,
  device_type  TEXT NOT NULL DEFAULT 'singleDevice',  -- 'singleDevice' | 'multiDevice'
  backed_up    BOOLEAN NOT NULL DEFAULT false,
  transports   TEXT[],                  -- ['internal', 'hybrid', 'usb', ...]
  aaguid       TEXT,                    -- authenticator type GUID
  name         TEXT,                    -- friendly name, e.g. "iPhone de Eduardo"
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS admin_passkeys_user_email_idx
  ON public.admin_passkeys (user_email, tenant_id);
