/**
 * app/login/page.tsx
 * ──────────────────
 * Supabase Auth Login Page (E-posta ve Şifre ile Giriş)
 *
 * Provides a modern, dark-themed login interface with Turkish error handling
 * and instant redirection to /dashboard.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Brain, CheckCircle2, Lock, Mail, Sparkles } from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Lütfen e-posta adresi ve şifrenizi girin.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let msg = 'Giriş yapılırken bir hata oluştu.';
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          msg = 'Girdiğiniz e-posta veya şifre hatalı.';
        } else if (error.message.includes('Email not confirmed')) {
          msg = 'Lütfen e-posta adresinizi onaylayarak tekrar deneyin.';
        } else {
          msg = error.message;
        }
        setErrorMsg(msg);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setErrorMsg('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      {/* Background ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl"
      >
        {/* Header Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-800/60 bg-blue-950/60 shadow-lg shadow-blue-950/40">
            <Brain size={28} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            SciVocab'e Hoş Geldiniz
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Akademik kelime dağarcığı ve FSRS-6 hafıza platformu
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
          <button
            type="button"
            className="w-1/2 rounded-lg bg-blue-600 py-2 text-center text-xs font-bold text-white shadow-md transition-all"
          >
            Giriş Yap
          </button>
          <Link
            href="/signup"
            className="w-1/2 rounded-lg py-2 text-center text-xs font-semibold text-zinc-400 hover:text-white transition-all"
          >
            Kayıt Ol
          </Link>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-2 rounded-xl border border-rose-900/80 bg-rose-950/40 p-3.5 text-xs text-rose-300"
          >
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@akademik.edu.tr"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-4 py-3 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Şifre
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-4 py-3 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{isLoading ? 'Giriş yapılıyor…' : 'Giriş Yap'}</span>
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Bottom Link */}
        <div className="mt-6 text-center text-xs text-zinc-500">
          Hesabınız yok mu?{' '}
          <Link href="/signup" className="font-semibold text-blue-400 hover:underline">
            Hemen Ücretsiz Kayıt Olun
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
