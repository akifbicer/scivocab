/**
 * app/signup/page.tsx
 * ───────────────────
 * Supabase Auth Signup Page (Yeni Üyelik Oluşturma)
 *
 * Allows new users to sign up with Full Name, Email, and Password.
 * Provides Turkish validation and instant auto-login / redirect.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Brain, CheckCircle2, Lock, Mail, User } from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName || !email || !password) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        let msg = 'Kayıt olunurken bir hata oluştu.';
        if (error.message.includes('User already registered') || error.message.includes('already exists')) {
          msg = 'Bu e-posta adresi ile zaten bir hesap oluşturulmuş.';
        } else if (error.message.includes('Password should be at least 6 characters')) {
          msg = 'Şifre en az 6 karakter olmalıdır.';
        } else {
          msg = error.message;
        }
        setErrorMsg(msg);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setSuccessMsg('Hesabınız başarıyla oluşturuldu! Yönlendiriliyorsunuz…');
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1200);
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
            Hesap Oluşturun
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            FSRS-6 altyapısı ile ücretsiz kelime pratiklerine başlayın
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
          <Link
            href="/login"
            className="w-1/2 rounded-lg py-2 text-center text-xs font-semibold text-zinc-400 hover:text-white transition-all"
          >
            Giriş Yap
          </Link>
          <button
            type="button"
            className="w-1/2 rounded-lg bg-blue-600 py-2 text-center text-xs font-bold text-white shadow-md transition-all"
          >
            Kayıt Ol
          </button>
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

        {/* Success Alert Box */}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-900/80 bg-emerald-950/40 p-3.5 text-xs text-emerald-300"
          >
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Ad Soyad
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-4 py-3 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

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
              Şifre (En az 6 karakter)
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
              <input
                type="password"
                required
                minLength={6}
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
            <span>{isLoading ? 'Kayıt yapılıyor…' : 'Ücretsiz Kayıt Ol'}</span>
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Bottom Link */}
        <div className="mt-6 text-center text-xs text-zinc-500">
          Zaten hesabınız var mı?{' '}
          <Link href="/login" className="font-semibold text-blue-400 hover:underline">
            Giriş Yapın
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
