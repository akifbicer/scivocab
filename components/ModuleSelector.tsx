import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ModuleCard } from './ModuleCard';
import styles from '../styles/moduleSelector.module.css';

type ModuleInfo = {
  moduleNumber: number;
  wordCount: number;
  progressPercent: number;
};

/**
 * ModuleSelector displays 100 modules in a grid with tabs for 10‑module groups.
 * It fetches lexical items and user progress from Supabase.
 */
export const ModuleSelector: React.FC = () => {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [activeGroup, setActiveGroup] = useState(0); // 0 => modules 1‑10

  useEffect(() => {
    const fetchData = async () => {
      // Get total items per module
      let items: any[] = [];
      try {
        const { data: itemsData } = await supabase
          .from('LEXICAL_ITEMS')
          .select('module_number')
          .order('module_number', { ascending: true });
        if (itemsData) items = itemsData;
      } catch {
        items = [];
      }

      // Get mastered count per module for the current user safely
      const userRes = await supabase.auth.getUser();
      const userId = userRes?.data?.user?.id;
      const userIdsToQuery = userId ? [userId] : ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000'];

      let progress: any[] = [];
      try {
        const { data: progressData } = await supabase
          .from('USER_LEXICAL_STATE')
          .select('lexical_item_id, state, LEXICAL_ITEMS (module_number)')
          .in('user_id', userIdsToQuery)
          .eq('state', 'Mastered');
        if (progressData) progress = progressData;
      } catch {
        progress = [];
      }

      const masteredMap: Record<number, number> = {};
      progress.forEach((row: any) => {
        const mod = row.LEXICAL_ITEMS?.module_number;
        if (mod) masteredMap[mod] = (masteredMap[mod] || 0) + 1;
      });

      const moduleMap: Record<number, number> = {};
      items.forEach((item: any) => {
        const mod = item.module_number;
        if (mod) moduleMap[mod] = (moduleMap[mod] || 0) + 1;
      });

      const list: ModuleInfo[] = [];
      for (let i = 1; i <= 100; i++) {
        const wordCount = moduleMap[i] ?? 0;
        const mastered = masteredMap[i] ?? 0;
        const progressPercent = wordCount ? Math.round((mastered / wordCount) * 100) : 0;
        list.push({ moduleNumber: i, wordCount, progressPercent });
      }
      setModules(list);
    };
    fetchData();
  }, []);

  const groups = Array.from({ length: 10 }, (_, i) => i * 10);

  return (
    <div className={styles.container}>
      <div className={styles.tabs} role="tablist">
        {groups.map((start, idx) => (
          <button
            key={idx}
            className={`${styles.tabButton} ${activeGroup === idx ? styles.active : ''}`}
            onClick={() => setActiveGroup(idx)}
            aria-selected={activeGroup === idx}
          >
            Modül {start + 1}-{start + 10}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {modules
          .slice(activeGroup * 10, activeGroup * 10 + 10)
          .map((mod) => (
            <ModuleCard
              key={mod.moduleNumber}
              moduleNumber={mod.moduleNumber}
              wordCount={mod.wordCount}
              progressPercent={mod.progressPercent}
            />
          ))}
      </div>
    </div>
  );
};
