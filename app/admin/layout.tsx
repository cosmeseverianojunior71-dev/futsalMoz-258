import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { ensureSchema, hasDatabase } from '@/lib/db';
import AdminNav from '@/components/AdminNav';
import SetupScreen from '@/components/SetupScreen';
import { logout } from '@/lib/actions/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabase()) return <SetupScreen />;
  await ensureSchema();
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (user.status === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="card max-w-md p-8 text-center">
          <p className="mb-2 text-4xl">⏳</p>
          <h1 className="mb-2 text-xl font-extrabold">Conta pendente</h1>
          <p className="mb-6 text-sm text-slate-600">
            Olá, <b>{user.name}</b>! A sua conta de administrador está a aguardar a aprovação do Administrador
            Sénior. Voltar a entrar depois de aprovada.
          </p>
          <form action={logout}>
            <button className="btn-ghost">Terminar sessão</button>
          </form>
        </div>
      </div>
    );
  }

  if (user.status === 'rejected') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="card max-w-md p-8 text-center">
          <p className="mb-2 text-4xl">⛔</p>
          <h1 className="mb-2 text-xl font-extrabold">Acesso negado</h1>
          <p className="mb-6 text-sm text-slate-600">
            A sua conta de administrador foi recusada pelo Administrador Sénior.
          </p>
          <form action={logout}>
            <button className="btn-ghost">Terminar sessão</button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminNav user={user}>{children}</AdminNav>;
}
