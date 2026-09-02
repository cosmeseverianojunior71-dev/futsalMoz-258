'use client';

import { useState } from 'react';
import {
  createAdminFormAction,
  createAdmin,
  approveFormAction,
  rejectFormAction,
  deleteUserFormAction,
} from '@/lib/actions/users';

interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  created: string;
}

export default function UsersManager({
  seniorId,
  seniorName,
  users,
  initialError,
}: {
  seniorId: string;
  seniorName: string;
  users: UserRow[];
  initialError?: string | null;
}) {
  const [createErr, setCreateErr] = useState<string | null>(initialError ?? null);
  const [createOk, setCreateOk] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [error] = useState<string | null>(null);

  const pending = users.filter((u) => u.status === 'pending');
  const active = users.filter((u) => u.status === 'active' && u.id !== seniorId);
  const senior = users.find((u) => u.id === seniorId) ?? null;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">Utilizadores</h1>
      <p className="mb-6 text-sm text-slate-500">
        O Administrador Sénior ({seniorName}) aprova ou recusa as contas de administrador. Os visitantes não
        precisam de conta — o site público é livre.
      </p>

      {error && <div className="alert-error">{error}</div>}

      {/* criar admin */}
      <form
        action={createAdminFormAction}
        onSubmit={async (e) => {
          e.preventDefault();
          setCreatePending(true);
          setCreateErr(null);
          setCreateOk(false);
          try {
            const r = await createAdmin(new FormData(e.currentTarget));
            if (r && !r.ok) setCreateErr(r.error ?? 'Erro');
            else setCreateOk(true);
          } catch (ex) {
            setCreateErr(ex instanceof Error ? ex.message : 'Erro inesperado.');
          } finally {
            setCreatePending(false);
          }
        }}
        className="card mb-6 p-5"
      >
        <h2 className="mb-3 font-bold">Criar conta de administrador (ativa de imediato)</h2>
        {createErr && <div className="alert-error">{createErr}</div>}
        {createOk && <div className="alert-success">✔ Conta criada — já pode entrar.</div>}
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="input" name="name" placeholder="Nome completo" required minLength={2} />
          <input className="input" name="email" type="email" placeholder="Email" required />
          <input className="input" name="password" type="password" placeholder="Palavra-passe (mín. 6)" required minLength={6} />
        </div>
        <button className="btn-primary mt-4" disabled={createPending}>
          {createPending ? 'A criar…' : '+ Criar administrador'}
        </button>
      </form>

      {/* pendentes */}
      <div className="card mb-6 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Pendentes de aprovação ({pending.length})
          </h2>
        </div>
        {pending.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Sem pedidos pendentes.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">{u.name || '—'}</p>
                  <p className="text-xs text-slate-500">
                    {u.email || '—'} · pedido em {u.created}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={approveFormAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="btn-primary btn-sm">✔ Aprovar</button>
                  </form>
                  <form action={rejectFormAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="btn-danger btn-sm">✕ Recusar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ativos */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Administradores ativos ({active.length})
          </h2>
        </div>
        {active.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Sem administradores adicionais.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {active.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{u.name}</p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                <form
                  action={deleteUserFormAction}
                  onSubmit={(e) => {
                    if (!window.confirm(`Remover a conta de "${u.name}"?`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="btn-danger btn-sm">Remover</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {senior && (
        <p className="mt-4 text-xs text-slate-400">
          Conta sénior: {senior.name} ({senior.email}) — não pode ser alterada daqui.
        </p>
      )}
    </div>
  );
}