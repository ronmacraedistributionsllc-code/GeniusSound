'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { btn, input } from './ui';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const reg = mode === 'register';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError('');
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify({ email: f.get('email'), password: f.get('password'), ...(reg && f.get('name') ? { name: f.get('name') } : {}) }) });
      router.push('/dashboard'); router.refresh();
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
        <div>
          <h1 className="text-2xl font-bold">{reg ? 'Create your account' : 'Welcome back'}</h1>
          <p className="text-sm text-zinc-500 mt-1">Genius Sound — AI Music Video Studio</p>
        </div>
        {reg && <input name="name" placeholder="Name (optional)" autoComplete="name" className={input} />}
        <input name="email" type="email" required placeholder="Email" autoComplete="email" className={input} />
        <input name="password" type="password" required minLength={reg ? 10 : 1} placeholder={reg ? 'Password (10+ characters)' : 'Password'} autoComplete={reg ? 'new-password' : 'current-password'} className={input} />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className={btn.primary + ' w-full'}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Sign in'}</button>
        <p className="text-sm text-zinc-500 text-center">
          {reg ? <>Already have an account? <Link className="text-violet-400 hover:underline" href="/login">Sign in</Link></> : <>New here? <Link className="text-violet-400 hover:underline" href="/register">Create an account</Link></>}
        </p>
      </form>
    </main>
  );
}
