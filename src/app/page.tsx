import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { btn } from '@/components/ui/ui';

export default async function Home() {
  if (await getSessionUser()) redirect('/dashboard');
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="max-w-3xl text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Songs in. <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">Cinematic videos</span> out.
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto">
          Genius Sound analyzes your track, helps direct the concept, builds a storyboard and assembles the music video — for producers, labels and artists.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/register" className={btn.primary + ' px-6 py-3'}>Create account</Link>
          <Link href="/login" className={btn.ghost + ' px-6 py-3'}>Sign in</Link>
        </div>
      </div>
    </main>
  );
}
