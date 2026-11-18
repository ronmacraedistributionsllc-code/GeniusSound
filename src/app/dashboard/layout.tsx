import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
