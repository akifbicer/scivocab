// components/ModuleCard.tsx
import React from 'react';
import Link from 'next/link';
import styles from '../styles/moduleSelector.module.css';

type ModuleCardProps = {
  moduleNumber: number;
  wordCount: number;
  progressPercent: number; // 0-100
};

export const ModuleCard: React.FC<ModuleCardProps> = ({ moduleNumber, wordCount, progressPercent }) => {
  const progressStyle = { width: `${progressPercent}%` };
  return (
    <Link
      href={`/practice?module=${moduleNumber}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div className={styles.card}>
        <div className={styles.cardHeader}>Modül {moduleNumber}</div>
        <div className={styles.wordCount}>{wordCount} Kelime</div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={progressStyle} />
        </div>
        <span className={styles.startButton}>
          {progressPercent > 0 ? 'Tekrar Et' : 'Başla'}
        </span>
      </div>
    </Link>
  );
};
