-- Migration 006: Widen password_hash column to support PBKDF2 format
-- PBKDF2 hashes are stored as "pbkdf2v1:{salt_hex}:{hash_hex}" (~92 chars).
-- The previous SHA-256 format was base64 (~44 chars).
-- This migration widens the column and clears old SHA-256 hashes so users
-- are prompted to set a new password (or an admin can run a re-hash script).
--
-- Run via: Neon console or psql -f database/supabase/006_rehash_passwords.sql

-- Widen hash column to 255 chars to accommodate the prefixed PBKDF2 format
ALTER TABLE user_passwords ALTER COLUMN password_hash TYPE VARCHAR(255);

-- Clear existing SHA-256 hashes (they are not valid PBKDF2; users must reset)
-- Remove this DELETE if you want to preserve legacy hashes temporarily
-- (the API verifyPassword function still accepts both formats as a fallback).
-- DELETE FROM user_passwords;
