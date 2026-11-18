'use client';

import {
  AudioWaveform, Captions, Menu, X, Clapperboard, FolderOpen, LayoutDashboard, LayoutList, Library, ListVideo, LogOut, Megaphone, Settings, WandSparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { cn } from '@/lib/utils';

export const NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Music Video Studio', href: '/dashboard/studio', icon: Clapperboard },
  { name: 'My Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Song Analysis', href: '/dashboard/analysis', icon: AudioWaveform },
  { name: 'Storyboards', href: '/dashboard/storyboards', icon: LayoutList },
  { name: 'AI Scene Generator', href: '/dashboard/scenes', icon: WandSparkles },
  { name: 'Lyric Video Creator', href: '/dashboard/lyrics', icon: Captions },
  { name: 'Promotional Clips', href: '/dashboard/promo', icon: Megaphone },
  { name: 'Asset Library', href: '/dashboard/assets', icon: Library },
  { name: 'Render Queue', href: '/dashboard/queue', icon: ListVideo },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar({ user }: { user: { name: string | null; email: string } }) {
  const path = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  async function signOut() {
    setBusy(true);
    try { await api('/api/auth/logout', { method: 'POST' }); } finally { router.push('/login'); router.refresh(); }
  }

  return (
    <>
    <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 border-b border-zinc-900 bg-zinc-950/95 backdrop-blur">
      <span className="font-bold bg-gradient-to-r from-violet-400 to-amber-300 bg-clip-text text-transparent">Genius Sound</span>
      <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} className="text-zinc-300">{open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
    </div>
    {open && <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)} />}
    <aside className={cn('w-64 shrink-0 border-r border-zinc-900 bg-zinc-950 flex flex-col h-screen z-40 fixed md:sticky top-0 transition-transform md:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
      <div className="p-6 border-b border-zinc-900">
        <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-amber-300 bg-clip-text text-transparent">Genius Sound</h1>
        <p className="text-xs text-zinc-500 mt-0.5">AI Music Video Studio</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ name, href, icon: Icon }) => {
          const active = href === '/dashboard' ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              active ? 'bg-violet-600/20 text-violet-200' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100')}>
              <Icon className="w-4.5 h-4.5" />{name}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-zinc-900">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/70">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name || 'Account'}</p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
          <button onClick={signOut} disabled={busy} title="Sign out" aria-label="Sign out" className="text-zinc-500 hover:text-zinc-100 disabled:opacity-50"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </aside>
    </>
  );
}
