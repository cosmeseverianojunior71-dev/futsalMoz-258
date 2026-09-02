'use client';

import { useState } from 'react';
import { reopenMatch } from '@/lib/actions/matches';

export default function ReopenButton({ matchId }: { matchId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs font-bold text-red-700">{error}</span>}
      <button
        className="btn-ghost btn-sm"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm('Reabrir esta partida? O resultado e os registos serão limpos.')) return;
          setBusy(true);
          setError(null);
          try {
            const fd = new FormData();
            fd.set('matchId', matchId);
            const res = await reopenMatch(fd);
            if (res && !res.ok) setError(res.error ?? 'Erro');
            else window.location.href = '/admin/resultados';
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'A reabrir…' : '↩ Reabrir (limpar)'}
      </button>
    </div>
  );
}
