'use client';

import { useState } from 'react';
import { updateMatch, updateMatchFormAction } from '@/lib/actions/matches';
import { deleteMatch } from '@/lib/actions/matches';

export default function MatchEditForm({
  matchId,
  initialDate,
  initialTime,
  initialVenue,
  defaultVenue,
}: {
  matchId: string;
  initialDate: string;
  initialTime: string;
  initialVenue: string;
  defaultVenue: string;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className="w-full shrink-0 sm:w-auto">
      {err && <p className="mb-1 text-right text-xs font-bold text-red-700">{err}</p>}
      {okMsg && <p className="mb-1 text-right text-xs font-bold text-pitch-700">✔ Atualizado</p>}
      <div className="flex flex-wrap items-center gap-2">
        <form
          action={updateMatchFormAction}
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setErr(null);
            setOkMsg(false);
            try {
              const r = await updateMatch(new FormData(e.currentTarget));
              if (r && !r.ok) setErr(r.error ?? 'Erro');
              else setOkMsg(true);
            } catch (ex) {
              setErr(ex instanceof Error ? ex.message : 'Erro inesperado.');
            } finally {
              setPending(false);
            }
          }}
          className="flex items-center gap-1.5"
        >
          <input type="hidden" name="matchId" value={matchId} />
          <input className="input !w-auto !py-1.5 text-xs" type="date" name="date" defaultValue={initialDate} required />
          <input className="input !w-auto !py-1.5 text-xs" type="time" name="time" defaultValue={initialTime} required />
          <input
            className="input !w-40 !py-1.5 text-xs"
            type="text"
            name="venue"
            defaultValue={initialVenue}
            placeholder={defaultVenue || 'Local'}
          />
          <button className="btn-ghost btn-sm" disabled={pending}>
            {pending ? '…' : 'Guardar'}
          </button>
        </form>
        <form
          action={async () => {
            const fd = new FormData();
            fd.set('matchId', matchId);
            await deleteMatch(fd);
          }}
          onSubmit={(e) => {
            if (!window.confirm('Remover esta partida agendada?')) e.preventDefault();
          }}
        >
          <button className="text-xs font-bold text-red-600 hover:underline">remover</button>
        </form>
      </div>
    </div>
  );
}
