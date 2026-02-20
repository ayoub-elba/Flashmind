-- =============================================
-- Migration: Add image_url to flashcards
-- =============================================

ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;
