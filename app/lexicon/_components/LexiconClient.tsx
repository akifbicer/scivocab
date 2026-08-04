/**
 * app/lexicon/_components/LexiconClient.tsx
 * ──────────────────────────────────────────
 * Interactive Lexicon Vocabulary Browser Client Component
 *
 * Filter Tabs:
 *  - Tümü (All)
 *  - Öğrenim (Learning)
 *  - Tekrar (Review)
 *  - Mastered (Kalıcı Hafıza 🏆)
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  Filter,
  Layers,
  Search,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';

export interface LexiconItem {
  id:               string;
  lemma:            string;
  pos:              string;
  cefr_level:       string;
  coca_rank:        number;
  l1_meaning:       string;
  l2_definition:    string;
  context_sentence?: string;
  turkish_example?: string;
  module_number:    number;
  userState: {
    state:            string;
    stability:        number;
    difficulty:       number;
    next_review_date: string | null;
    repetition_count: number;
  };
}

export interface LexiconClientProps {
  items: LexiconItem[];
}

export type FilterTab = 'all' | 'learning' | 'review' | 'mastered';

export function LexiconClient({ items }: LexiconClientProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts calculation
  const counts = useMemo(() => {
    let learning = 0;
    let review = 0;
    let mastered = 0;

    for (const item of items) {
      const s = item.userState.state;
      const stab = item.userState.stability;
      if (s === 'Mastered' || stab >= 365) {
        mastered++;
      } else if (s === 'Review' || stab >= 1.0) {
        review++;
      } else {
        learning++;
      }
    }

    return {
      all: items.length,
      learning,
      review,
      mastered,
    };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const s = item.userState.state;
      const stab = item.userState.stability;

      let matchesTab = true;
      if (activeTab === 'learning') {
        matchesTab = s === 'New' || s === 'Learning' || s === 'Re-learning' || (stab < 1.0 && s !== 'Mastered');
      } else if (activeTab === 'review') {
        matchesTab = (s === 'Review' || stab >= 1.0) && s !== 'Mastered' && stab < 365;
      } else if (activeTab === 'mastered') {
        matchesTab = s === 'Mastered' || stab >= 365;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.lemma.toLowerCase().includes(q) ||
        item.l1_meaning.toLowerCase().includes(q) ||
        item.l2_definition.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [items, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" />
              <h1 className="text-base font-bold text-white tracking-tight">
                Akademik Sözlük & Leksikon
              </h1>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800 bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-300">
            <Trophy size={13} className="text-emerald-400" />
            <span>Mastered: {counts.mastered} Kelime</span>
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        {/* Search & Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Tümü ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === 'learning' ? 'bg-amber-600 text-white shadow-md' : 'text-zinc-400 hover:text-amber-400'}`}
            >
              Öğrenim ({counts.learning})
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-blue-400'}`}
            >
              Tekrar ({counts.review})
            </button>
            <button
              onClick={() => setActiveTab('mastered')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === 'mastered' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-400 hover:text-emerald-300'}`}
            >
              Mastered 🏆 ({counts.mastered})
            </button>
          </div>

          {/* Live Search Input */}
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-3 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kelime veya Türkçe anlam ara..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Word Grid */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <Brain size={36} className="mx-auto text-zinc-600 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Kelime Bulunamadı</h3>
            <p className="text-xs text-zinc-400">
              Seçili filtre veya arama terimine uygun kelime bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isMastered = item.userState.state === 'Mastered' || item.userState.stability >= 365;

              return (
                <div
                  key={item.id}
                  className={`
                    relative rounded-2xl border p-4 transition-all duration-200
                    ${isMastered
                      ? 'border-emerald-900/80 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
                      : 'border-zinc-800 bg-zinc-900/90 hover:border-zinc-700'}
                  `}
                >
                  {/* Top Header Pills */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-md">
                      Modül {item.module_number} · {item.pos}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                        {item.cefr_level}
                      </span>
                      {isMastered ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-700 px-2 py-0.5 rounded-md">
                          <CheckCircle2 size={11} /> Mastered
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500">
                          S: {Math.round(item.userState.stability)}g
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Word Lemma */}
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {item.lemma}
                  </h3>

                  {/* Turkish Meaning */}
                  <p className="text-sm font-semibold text-emerald-400 mb-2">
                    {item.l1_meaning}
                  </p>

                  {/* L2 Definition */}
                  <p className="text-xs text-zinc-300 leading-relaxed mb-3 line-clamp-2">
                    {item.l2_definition}
                  </p>

                  {/* Context Sentence */}
                  {item.context_sentence && (
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-2.5 text-[11px] text-zinc-400 italic">
                      "{item.context_sentence}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
