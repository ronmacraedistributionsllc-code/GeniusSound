'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { btn, input } from '@/components/ui/ui';
import { api } from '@/lib/client';

export function AccountForms({ name }: { name: string | null }) {
  const router = useRouter();
  const [n, setN] = useState(name ?? '');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveName(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await api('/api/auth/me', { method: 'PATCH', body: { name: n } as never }); setMsg({ kind: 'ok', text: 'Saved' }); router.refresh(); }
    catch (err) { setMsg({ kind: 'err', text: (err as Error).message }); } finally { setBusy(false); }
  }
  async function savePw(e: FormEvent) {
    e.preventDefault(); setBusy(true); setPwMsg(null);
    try { await api('/api/auth/password', { method: 'POST', body: { current: cur, next } as never }); setCur(''); setNext(''); setPwMsg({ kind: 'ok', text: 'Password changed. Other devices were signed out.' }); }
    catch (err) { setPwMsg({ kind: 'err', text: (err as Error).message }); } finally { setBusy(false); }
  }
  const tone = (m: { kind: string } | null) => (m?.kind === 'ok' ? 'text-emerald-400' : 'text-red-400');
  return (
    <div className="space-y-6">
      <form onSubmit={saveName} className="space-y-2">
        <label className="text-sm text-zinc-400" htmlFor="dn">Display name</label>
        <div className="flex gap-2"><input id="dn" className={input} value={n} onChange={(e) => setN(e.target.value)} maxLength={80} required />
          <button className={btn.primary} disabled={busy || !n.trim()}>Save</button></div>
        {msg && <p role="status" className={`text-xs ${tone(msg)}`}>{msg.text}</p>}
      </form>
      <form onSubmit={savePw} className="space-y-2">
        <p className="text-sm text-zinc-400">Change password</p>
        <input aria-label="Current password" type="password" autoComplete="current-password" className={input} placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} required />
        <input aria-label="New password" type="password" autoComplete="new-password" className={input} placeholder="New password (10+ characters)" value={next} onChange={(e) => setNext(e.target.value)} minLength={10} required />
        <button className={btn.ghost} disabled={busy}>Update password</button>
        {pwMsg && <p role="status" className={`text-xs ${tone(pwMsg)}`}>{pwMsg.text}</p>}
      </form>
    </div>
  );
}
