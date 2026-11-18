import { cn } from '@/lib/utils';
import { 
  Home,
  Music,
  Play,
  Layers,
  FileVideo,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

const sidebarLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Projects', href: '/dashboard/projects', icon: FileVideo },
  { name: 'Audio Upload', href: '/dashboard/upload', icon: Music },
  { name: 'Analytics', href: '/dashboard/analytics', icon: Play },
  { name: 'Assets', href: '/dashboard/assets', icon: Layers },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'w-64 border-r bg-white dark:bg-zinc-950 flex flex-col h-screen',
        className
      )}
    >
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Genius Sound
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          AI Music Video Studio
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <Icon className="w-5 h-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
              John Doe
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              john@example.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
