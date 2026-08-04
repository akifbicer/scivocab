-- =============================================================================
-- Scientific English Vocabulary Learning Platform — Database Schema
-- Target: Supabase (PostgreSQL 15+)
-- Author: Vibe Coder — generated 2026-07-31
-- =============================================================================
-- Run this script once against a fresh Supabase project.
-- The pgcrypto / uuid-ossp extensions are enabled by default in Supabase;
-- gen_random_uuid() is a core PG 13+ function — no extension needed.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS (safety — Supabase usually enables these already)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- 1. ENUM TYPES
-- =============================================================================

-- Part-of-Speech
CREATE TYPE pos_enum AS ENUM (
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase'
);

-- CEFR Proficiency Level
CREATE TYPE cefr_enum AS ENUM (
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2'
);

-- FSRS-6 Learning State
CREATE TYPE state_enum AS ENUM (
  'New',
  'Learning',
  'Review',
  'Re-learning',
  'Mastered'
);

-- Interaction / Recall Mode
CREATE TYPE interaction_enum AS ENUM (
  'ActiveRecall',
  'Writing',
  'Listening',
  'Speaking'
);


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1  LEXICAL_ITEMS  — Master word / phrase dictionary
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "LEXICAL_ITEMS" (
  -- Identity
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  lemma               VARCHAR(100)  NOT NULL UNIQUE,

  -- Linguistic metadata
  pos                 pos_enum,
  cefr_level          cefr_enum,
  coca_rank           INTEGER CHECK (coca_rank > 0),
  module_number       INTEGER CHECK (module_number >= 1 AND module_number <= 100),

  -- Pronunciation
  ipa_us              VARCHAR(100),
  ipa_uk              VARCHAR(100),
  audio_us_url        VARCHAR(255),
  audio_uk_url        VARCHAR(255),

  -- Meanings & usage
  turkish_translation TEXT,
  synonyms            TEXT[],
  antonyms            TEXT[],
  -- L1 (Turkish) gloss list, e.g. ["bulasici", "gecici"]
  l1_meanings         JSONB,
  -- Full English definition
  l2_definition       TEXT,
  -- High-frequency collocations, e.g. "highly contagious, contagious disease"
  collocations        TEXT,
  -- Word-family matrix: { "root": "tag", "noun": "contagion", "adjective": "contagious" }
  word_family         JSONB,
  etymology           TEXT,

  -- Audit
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  "LEXICAL_ITEMS"                IS 'Master dictionary of scientific / academic English lexical items.';
COMMENT ON COLUMN "LEXICAL_ITEMS".lemma          IS 'Canonical (base) form of the word or phrase.';
COMMENT ON COLUMN "LEXICAL_ITEMS".module_number  IS 'Hüseyin Demirtaş Academic Vocabulary Module Number (1-100).';
COMMENT ON COLUMN "LEXICAL_ITEMS".turkish_translation IS 'Primary Turkish translation of the word.';
COMMENT ON COLUMN "LEXICAL_ITEMS".synonyms       IS 'Array of synonyms (eş anlamlılar).';
COMMENT ON COLUMN "LEXICAL_ITEMS".antonyms       IS 'Array of antonyms (zıt anlamlılar).';
COMMENT ON COLUMN "LEXICAL_ITEMS".coca_rank      IS 'Rank in the Corpus of Contemporary American English (lower = more frequent).';
COMMENT ON COLUMN "LEXICAL_ITEMS".l1_meanings    IS 'JSON array of L1 (Turkish) translation glosses.';
COMMENT ON COLUMN "LEXICAL_ITEMS".collocations   IS 'Collocations and phrase associations (ilişkili ifadeler).';
COMMENT ON COLUMN "LEXICAL_ITEMS".word_family    IS 'JSON object mapping morphological roles (root, noun, verb, adjective, adverb) to forms.';


-- -----------------------------------------------------------------------------
-- 2.2  USER_LEXICAL_STATE  — Per-user FSRS-6 scheduling state
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "USER_LEXICAL_STATE" (
  -- Identity
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (FK -> Supabase Auth)
  user_id           UUID        NOT NULL
                                REFERENCES auth.users (id) ON DELETE CASCADE,

  -- Word reference
  lexical_item_id   UUID        NOT NULL
                                REFERENCES "LEXICAL_ITEMS" (id) ON DELETE CASCADE,

  -- FSRS-6 Scheduling parameters
  state             state_enum  NOT NULL DEFAULT 'New',
  stability         FLOAT       NOT NULL DEFAULT 0.0,   -- FSRS S parameter
  difficulty        FLOAT       NOT NULL DEFAULT 0.0,   -- FSRS D parameter

  -- Review schedule
  last_review_date  TIMESTAMPTZ,
  next_review_date  TIMESTAMPTZ,

  -- Performance metrics
  lapses            INTEGER     NOT NULL DEFAULT 0,
  repetition_count  INTEGER     NOT NULL DEFAULT 0,
  avg_latency_ms    INTEGER     NOT NULL DEFAULT 0,

  -- Constraints
  CONSTRAINT uq_user_lexical UNIQUE (user_id, lexical_item_id),
  CONSTRAINT chk_stability   CHECK  (stability   >= 0.0),
  CONSTRAINT chk_difficulty  CHECK  (difficulty  >= 0.0 AND difficulty <= 10.0),
  CONSTRAINT chk_lapses      CHECK  (lapses      >= 0),
  CONSTRAINT chk_repetitions CHECK  (repetition_count >= 0)
);

COMMENT ON TABLE  "USER_LEXICAL_STATE"                  IS 'Per-user FSRS-6 spaced-repetition state for each lexical item.';
COMMENT ON COLUMN "USER_LEXICAL_STATE".stability        IS 'FSRS-6 Stability (S): expected days until 90% retention.';
COMMENT ON COLUMN "USER_LEXICAL_STATE".difficulty       IS 'FSRS-6 Difficulty (D): item-level difficulty, range 0-10.';
COMMENT ON COLUMN "USER_LEXICAL_STATE".lapses           IS 'Number of times the card has been rated Again (forgotten).';
COMMENT ON COLUMN "USER_LEXICAL_STATE".avg_latency_ms   IS 'Rolling average recall latency in milliseconds.';


-- -----------------------------------------------------------------------------
-- 2.3  REVIEW_LOGS  — Immutable audit trail of every review event
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "REVIEW_LOGS" (
  -- Identity
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent state row
  user_state_id     UUID        NOT NULL
                                REFERENCES "USER_LEXICAL_STATE" (id) ON DELETE CASCADE,

  -- FSRS-6 Review event data
  -- 1: Again (forgot) | 2: Hard | 3: Good | 4: Easy
  rating            SMALLINT    NOT NULL
                                CHECK (rating BETWEEN 1 AND 4),
  elapsed_days      FLOAT,
  scheduled_days    FLOAT,

  -- Context
  review_timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
  interaction_type  interaction_enum
);

COMMENT ON TABLE  "REVIEW_LOGS"                       IS 'Immutable log of every spaced-repetition review event for analytics and FSRS recalibration.';
COMMENT ON COLUMN "REVIEW_LOGS".rating                IS '1=Again (forgot), 2=Hard, 3=Good, 4=Easy -- maps to FSRS grade.';
COMMENT ON COLUMN "REVIEW_LOGS".elapsed_days          IS 'Actual days elapsed since the previous review.';
COMMENT ON COLUMN "REVIEW_LOGS".scheduled_days        IS 'Days that had been scheduled before this review occurred.';


-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- 3.1  USER_LEXICAL_STATE: fetch due cards fast (primary query pattern)
CREATE INDEX IF NOT EXISTS idx_uls_user_next_review
  ON "USER_LEXICAL_STATE" (user_id, next_review_date);

-- 3.2  LEXICAL_ITEMS: filter by COCA rank (frequency bands)
CREATE INDEX IF NOT EXISTS idx_li_coca_rank
  ON "LEXICAL_ITEMS" (coca_rank);

-- 3.3  LEXICAL_ITEMS: filter / facet by CEFR level
CREATE INDEX IF NOT EXISTS idx_li_cefr_level
  ON "LEXICAL_ITEMS" (cefr_level);

-- 3.4  LEXICAL_ITEMS: filter by module number (Hüseyin Demirtaş 100 Modules)
CREATE INDEX IF NOT EXISTS idx_li_module_number
  ON "LEXICAL_ITEMS" (module_number);

-- 3.5  REVIEW_LOGS: chronological lookup per state row
CREATE INDEX IF NOT EXISTS idx_rl_user_state_timestamp
  ON "REVIEW_LOGS" (user_state_id, review_timestamp DESC);


-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- ── 4.1  LEXICAL_ITEMS ────────────────────────────────────────────────────────
ALTER TABLE "LEXICAL_ITEMS" ENABLE ROW LEVEL SECURITY;

-- Public read: authenticated users and anonymous visitors may read all items.
CREATE POLICY "lexical_items_select_all"
  ON "LEXICAL_ITEMS"
  FOR SELECT
  USING (true);

-- Write restricted to service_role only (Supabase service key bypasses RLS).
CREATE POLICY "lexical_items_insert_service_only"
  ON "LEXICAL_ITEMS"
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "lexical_items_update_service_only"
  ON "LEXICAL_ITEMS"
  FOR UPDATE
  USING      (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "lexical_items_delete_service_only"
  ON "LEXICAL_ITEMS"
  FOR DELETE
  USING (auth.role() = 'service_role');


-- ── 4.2  USER_LEXICAL_STATE ──────────────────────────────────────────────────
ALTER TABLE "USER_LEXICAL_STATE" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uls_select_own"
  ON "USER_LEXICAL_STATE"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "uls_insert_own"
  ON "USER_LEXICAL_STATE"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "uls_update_own"
  ON "USER_LEXICAL_STATE"
  FOR UPDATE
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "uls_delete_own"
  ON "USER_LEXICAL_STATE"
  FOR DELETE
  USING (auth.uid() = user_id);


-- ── 4.3  REVIEW_LOGS ─────────────────────────────────────────────────────────
ALTER TABLE "REVIEW_LOGS" ENABLE ROW LEVEL SECURITY;

-- Ownership resolved through USER_LEXICAL_STATE join.
CREATE POLICY "rl_select_own"
  ON "REVIEW_LOGS"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM "USER_LEXICAL_STATE" uls
      WHERE uls.id      = "REVIEW_LOGS".user_state_id
        AND uls.user_id = auth.uid()
    )
  );

CREATE POLICY "rl_insert_own"
  ON "REVIEW_LOGS"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "USER_LEXICAL_STATE" uls
      WHERE uls.id      = "REVIEW_LOGS".user_state_id
        AND uls.user_id = auth.uid()
    )
  );

-- UPDATE and DELETE intentionally omitted: review logs are immutable.


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
