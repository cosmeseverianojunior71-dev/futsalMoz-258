import { getCurrentUser } from '@/lib/auth';
import { hasDatabase } from '@/lib/db';
import { getUsers } from '@/lib/queries';
import { redirect } from 'next/navigation';
import SetupScreen from '@/components/SetupScreen';
import UsersManager from '@/components/admin/UsersManager';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Utilizadores' };

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  if (!hasDatabase()) return <SetupScreen />;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'senior') redirect('/admin');

  const { e: urlError } = await searchParams;
  const users = await getUsers();
  const withDates = users.map((u) => ({ ...u, created: formatDate(u.created_at) }));

  return <UsersManager seniorId={user.id} seniorName={user.name} users={withDates} initialError={urlError} />;
}
