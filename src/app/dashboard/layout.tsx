import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { requireUserPage } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUserPage();
  return (
    <div className="flex min-h-screen">
      <Sidebar user={{ name: user.name, email: user.email }} />
      <main className="flex-1 min-w-0">
        <div className="p-4 pt-20 md:p-8 md:pt-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
