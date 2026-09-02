import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SessionUser } from '@/lib/auth';

const baseLinks = [
  { href: '/admin', label: 'Painel', icon: '📊' },
  { href: '/admin/configuracao', label: 'Configuração', icon: '⚙️' },
  { href: '/admin/equipas', label: 'Equipas', icon: '👕' },
  { href: '/admin/calendario', label: 'Calendário', icon: '📅' },
  { href: '/admin/resultados', label: 'Resultados', icon: '🏆' },
  { href: '/admin/suspenses', label: 'Suspensões', icon: '🚫' },
];

export default function AdminNav({ user, children }: { user: SessionUser; children: ReactNode }) {
  const links =
    user.role === 'senior'
      ? [...baseLinks, { href: '/admin/usuarios', label: 'Utilizadores', icon: '👥' }]
      : baseLinks;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-slate-800 bg-pitch-950 text-white md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pitch-600 text-lg">⚽</span>
          <div className="leading-tight">
            <p className="text-sm font-extrabold">FutsalMoz 258</p>
            <p className="text-[11px] text-pitch-100/60">Painel de administração</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:pb-0">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-pitch-100/90 hover:bg-pitch-900 hover:text-white"
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-slate-800 px-4 py-4 md:block">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-pitch-100/60">{user.email}</p>
          <p className="mt-1">
            <span
              className={
                user.role === 'senior'
                  ? 'badge bg-pitch-600/40 text-pitch-100'
                  : 'badge bg-slate-700 text-slate-200'
              }
            >
              {user.role === 'senior' ? 'Administrador Sénior' : 'Administrador'}
            </span>
          </p>
          <Link href="/" className="mt-3 block text-xs text-pitch-100/70 underline hover:text-white">
            Ver site público ↗
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <Link href="/" className="text-xs text-slate-500 underline">
              Site público ↗
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
