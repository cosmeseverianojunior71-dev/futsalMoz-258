import { hasDatabase, ensureSchema } from '@/lib/db';
import { countUsers } from '@/lib/user-count';
import SetupScreen from '@/components/SetupScreen';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Pedir conta de administrador' };

export default async function PedirPage() {
  if (!hasDatabase()) return <SetupScreen />;
  await ensureSchema();
  let seniorExists = true;
  try {
    seniorExists = (await countUsers()) > 0;
  } catch {
    seniorExists = true;
  }
  return <LoginForm seniorExists={seniorExists} initialTab="pedir" />;
}
