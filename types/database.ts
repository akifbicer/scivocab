// =============================================================================
// Scientific English Vocabulary Learning Platform — TypeScript Types
// Mirrors: schema.sql (Supabase / PostgreSQL 15+)
// Generated: 2026-07-31
// Compatible with: @supabase/supabase-js v2 (typed client)
// =============================================================================

// ---------------------------------------------------------------------------
// 1. ENUM TYPES
// ---------------------------------------------------------------------------

/** Part-of-speech classification of a lexical item. */
export type PosEnum = 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase';

/** CEFR proficiency band of a lexical item. */
export type CefrEnum = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * FSRS-6 learning state of a card in the user's deck.
 * - New        → never studied
 * - Learning   → actively being learned (short intervals)
 * - Review     → in stable long-term memory
 * - Re-learning → forgotten; being reacquired
 * - Mastered   → retired from active rotation
 */
export type StateEnum = 'New' | 'Learning' | 'Review' | 'Re-learning' | 'Mastered';

/** Recall modality used during a review session. */
export type InteractionEnum = 'ActiveRecall' | 'Writing' | 'Listening' | 'Speaking';

// ---------------------------------------------------------------------------
// 2. JSONB COLUMN SHAPES
// ---------------------------------------------------------------------------

/**
 * Ordered list of L1 (Turkish) translation glosses.
 * @example ["bulasici", "gecici"]
 */
export type L1Meanings = string[];

/**
 * Ordered list of high-frequency collocations.
 * @example ["highly contagious", "contagious disease"]
 */
export type Collocations = string[];

/**
 * Morphological word-family matrix.
 * Keys represent morphological roles; values are the corresponding surface forms.
 * @example { root: "tag", noun: "contagion", adjective: "contagious", adverb: "contagiously" }
 */
export interface WordFamily {
  root?: string | null;
  noun?: string | string[] | null;
  verb?: string | string[] | null;
  adjective?: string | string[] | null;
  adverb?: string | string[] | null;
  [otherRole: string]: string | string[] | null | undefined;
}

// ---------------------------------------------------------------------------
// 3. TABLE ROW TYPES
//    Each table gets three flavours, matching the Supabase generated-type
//    convention:
//      Row    — shape returned by SELECT
//      Insert — shape accepted by INSERT (required vs. optional fields)
//      Update — shape accepted by UPDATE (all fields optional)
// ---------------------------------------------------------------------------

// ── 3.1  LEXICAL_ITEMS ──────────────────────────────────────────────────────

export interface LexicalItemRow {
  /** UUID primary key. */
  id: string;
  /** Canonical (base) form of the word or phrase. */
  lemma: string;
  /** Part of speech. */
  pos?: PosEnum | null;
  /** CEFR proficiency band. */
  cefr_level?: CefrEnum | null;
  /** Rank in COCA — lower means more frequent. */
  coca_rank?: number | null;
  /** Hüseyin Demirtaş Academic Vocabulary Module Number (1-100). */
  module_number?: number | null;
  /** US IPA transcription, e.g. /kənˈteɪdʒəs/. */
  ipa_us?: string | null;
  /** UK IPA transcription. */
  ipa_uk?: string | null;
  /** URL of the US pronunciation audio clip. */
  audio_us_url?: string | null;
  /** URL of the UK pronunciation audio clip. */
  audio_uk_url?: string | null;
  /** Primary Turkish translation string. */
  turkish_translation?: string | null;
  /** List of synonyms (eş anlamlılar). */
  synonyms?: string[] | null;
  /** List of antonyms (zıt anlamlılar). */
  antonyms?: string[] | null;
  /** Ordered list of L1 (Turkish) translation glosses. */
  l1_meanings?: L1Meanings | null;
  /** Full English definition. */
  l2_definition?: string | null;
  /** High-frequency collocations (string or string array). */
  collocations?: string | Collocations | null;
  /** Morphological word-family matrix. */
  word_family?: WordFamily | null;
  /** Etymological notes. */
  etymology?: string | null;
  /** ISO-8601 timestamp of record creation. */
  created_at: string;
}

export type LexicalItemInsert = Omit<LexicalItemRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type LexicalItemUpdate = Partial<LexicalItemInsert>;

// ── 3.2  USER_LEXICAL_STATE ─────────────────────────────────────────────────

export interface UserLexicalStateRow {
  /** UUID primary key. */
  id: string;
  /** FK → auth.users.id. */
  user_id: string;
  /** FK → LEXICAL_ITEMS.id. */
  lexical_item_id: string;
  /** Current FSRS-6 learning state. */
  state: StateEnum;
  /**
   * FSRS-6 Stability (S).
   * Represents the expected number of days until retrieval probability drops
   * below 90%.
   */
  stability: number;
  /**
   * FSRS-6 Difficulty (D).
   * Item-level intrinsic difficulty; range 0–10.
   */
  difficulty: number;
  /** ISO-8601 timestamp of the most recent review. */
  last_review_date: string | null;
  /** ISO-8601 timestamp when the next review is due. */
  next_review_date: string | null;
  /** Number of times the card has been rated "Again" (forgotten). */
  lapses: number;
  /** Total number of review events recorded. */
  repetition_count: number;
  /** Rolling average recall latency in milliseconds. */
  avg_latency_ms: number;
}

export type UserLexicalStateInsert = Omit<UserLexicalStateRow, 'id'> & {
  id?: string;
  state?: StateEnum;
  stability?: number;
  difficulty?: number;
  lapses?: number;
  repetition_count?: number;
  avg_latency_ms?: number;
};

export type UserLexicalStateUpdate = Partial<
  Omit<UserLexicalStateRow, 'id' | 'user_id' | 'lexical_item_id'>
>;

// ── 3.3  REVIEW_LOGS ────────────────────────────────────────────────────────

export interface ReviewLogRow {
  /** UUID primary key. */
  id: string;
  /** FK → USER_LEXICAL_STATE.id. */
  user_state_id: string;
  /**
   * User rating for this review event.
   * - 1: Again (forgot)
   * - 2: Hard
   * - 3: Good
   * - 4: Easy
   */
  rating: 1 | 2 | 3 | 4;
  /** Actual days elapsed since the previous review. */
  elapsed_days: number | null;
  /** Days that were scheduled before this review occurred. */
  scheduled_days: number | null;
  /** ISO-8601 timestamp when the review took place. */
  review_timestamp: string;
  /** Recall modality used during this session. */
  interaction_type: InteractionEnum | null;
}

export type ReviewLogInsert = Omit<ReviewLogRow, 'id' | 'review_timestamp'> & {
  id?: string;
  review_timestamp?: string;
};

// Review logs are intentionally immutable — no Update type exported.

// ---------------------------------------------------------------------------
// 4. SUPABASE DATABASE INTERFACE
//    Drop this into your supabase client initialisation:
//
//    import { createClient } from '@supabase/supabase-js'
//    import type { Database } from '@/types/database'
//    const supabase = createClient<Database>(URL, ANON_KEY)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      LEXICAL_ITEMS: {
        Row: LexicalItemRow;
        Insert: LexicalItemInsert;
        Update: LexicalItemUpdate;
        Relationships: [];
      };
      USER_LEXICAL_STATE: {
        Row: UserLexicalStateRow;
        Insert: UserLexicalStateInsert;
        Update: UserLexicalStateUpdate;
        Relationships: [
          {
            foreignKeyName: "user_lexical_state_lexical_item_id_fkey";
            columns: ["lexical_item_id"];
            isOneToOne: false;
            referencedRelation: "LEXICAL_ITEMS";
            referencedColumns: ["id"];
          }
        ];
      };
      REVIEW_LOGS: {
        Row: ReviewLogRow;
        Insert: ReviewLogInsert;
        Update: Partial<ReviewLogInsert>;
        Relationships: [
          {
            foreignKeyName: "review_logs_user_state_id_fkey";
            columns: ["user_state_id"];
            isOneToOne: false;
            referencedRelation: "USER_LEXICAL_STATE";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Enums: {
      pos_enum: PosEnum;
      cefr_enum: CefrEnum;
      state_enum: StateEnum;
      interaction_enum: InteractionEnum;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ---------------------------------------------------------------------------
// 5. CONVENIENCE RE-EXPORTS
//    Shorthand aliases for the most common row shapes.
// ---------------------------------------------------------------------------

export type LexicalItem      = LexicalItemRow;
export type UserLexicalState = UserLexicalStateRow;
export type ReviewLog        = ReviewLogRow;
