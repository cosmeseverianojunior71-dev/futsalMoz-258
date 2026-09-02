import { hasDatabase, ensureSchema } from '@/lib/db';
import { countUsers } from '@/lib/user-count';
import SetupScreen from '@/components/SetupScreen';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Administração' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (!hasDatabase()) return <SetupScreen />;
  await ensureSchema();
  let seniorExists = true;
  try {
    seniorExists = (await countUsers()) > 0;
  } catch {
    seniorExists = true;
  }
  const { tab } = await searchParams;
  return <LoginForm seniorExists={seniorExists} initialTab={tab === 'pedir' ? 'pedir' : 'login'} />;
}
