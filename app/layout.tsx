import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SciVocab',
  description: 'Spaced repetition vocabulary practice powered by Supabase and OpenAI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
