import Link from 'next/link';

const links = [
  { href: '/', label: 'Início' },
  { href: '/classificacao', label: 'Classificação' },
  { href: '/calendario', label: 'Calendário' },
  { href: '/resultados', label: 'Resultados' },
  { href: '/estatisticas', label: 'Estatísticas' },
  { href: '/eliminataria', label: 'Eliminatória' },
];

export default function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-pitch-900/40 bg-pitch-950 text-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pitch-600 text-lg font-black">
            ⚽
          </span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight sm:text-lg">
              FutsalMoz <span className="text-pitch-500">258</span>
            </span>
            <span className="block text-[11px] text-pitch-100/70">Gestão de Campeonato de Futsal</span>
          </span>
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-pitch-500/50 px-3 py-1.5 text-xs font-semibold text-pitch-100 hover:bg-pitch-900"
        >
          Administração
        </Link>
      </div>
      <nav className="mx-auto max-w-5xl overflow-x-auto px-1">
        <ul className="flex min-w-max gap-1 px-2 pb-2 sm:px-3">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block rounded-md px-3 py-1.5 text-sm font-medium text-pitch-100/90 hover:bg-pitch-900 hover:text-white"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
      <p className="font-semibold text-slate-600">FutsalMoz 258 — Campeonato de Futsal de Moçambique</p>
      <p className="mt-1">Todos os horários em hora de Maputo (CAT, UTC+2) · +258</p>
    </footer>
  );
}
