import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/ui/AuthForm';
import { getSessionUser } from '@/lib/auth';

export default async function LoginPage() {
  if (await getSessionUser()) redirect('/dashboard');
  return <AuthForm mode="login" />;
}
