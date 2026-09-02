'use client';

import { useMemo, useState } from 'react';
import { saveMatchReport, matchReportFormAction } from '@/lib/actions/matches';

export interface ReportPlayer {
  id: string;
  name: string;
  number: number | null;
  position: string;
}

interface GoalRow {
  key: number;
  team: 'home' | 'away';
  playerId: string;
  minute: string;
  penalty: boolean;
}
interface CardRow {
  key: number;
  team: 'home' | 'away';
  playerId: string;
  type: 'yellow' | 'red';
  minute: string;
}

export interface SuspendedPlayer {
  playerName: string;
  teamName: string;
  reason: string;
}

interface Props {
  matchId: string;
  stage: 'regular' | 'eliminataria';
  roundLabel: string;
  home: { id: string; name: string };
  away: { id: string; name: string };
  homePlayers: ReportPlayer[];
  awayPlayers: ReportPlayer[];
  suspended: SuspendedPlayer[];
  initial?: {
    goals: { team: 'home' | 'away'; playerId: string | null; minute: number | null; penalty: boolean }[];
    cards: { team: 'home' | 'away'; playerId: string; type: 'yellow' | 'red'; minute: number | null }[];
    fouls: { home: { h1: number; h2: number }; away: { h1: number; h2: number } };
    home_gr: string | null;
    away_gr: string | null;
    home_shootout: number | null;
    away_shootout: number | null;
  };
}

let keyCounter = 1;
const nextKey = () => keyCounter++;

function playerLabel(p: ReportPlayer): string {
  const n = p.number != null ? `${p.number} — ` : '';
  const gr = p.position === 'GR' ? ' [GR]' : '';
  return `${n}${p.name}${gr}`;
}

export default function MatchReportForm(props: Props) {
  const {
    matchId, stage, roundLabel, home, away,
    homePlayers, awayPlayers, suspended, initial,
  } = props;

  const [goals, setGoals] = useState<GoalRow[]>(() =>
    (initial?.goals ?? []).map((g) => ({
      key: nextKey(),
      team: g.team,
      playerId: g.playerId ?? '',
      minute: g.minute != null ? String(g.minute) : '',
      penalty: g.penalty,
    }))
  );
  const [cards, setCards] = useState<CardRow[]>(() =>
    (initial?.cards ?? []).map((c) => ({
      key: nextKey(),
      team: c.team,
      playerId: c.playerId,
      type: c.type,
      minute: c.minute != null ? String(c.minute) : '',
    }))
  );
  const [fouls, setFouls] = useState(initial?.fouls ?? {
    home: { h1: 0, h2: 0 },
    away: { h1: 0, h2: 0 },
  });
  const [homeGr, setHomeGr] = useState(initial?.home_gr ?? '');
  const [awayGr, setAwayGr] = useState(initial?.away_gr ?? '');
  const [shHome, setShHome] = useState(initial?.home_shootout != null ? String(initial.home_shootout) : '');
  const [shAway, setShAway] = useState(initial?.away_shootout != null ? String(initial.away_shootout) : '');
  const [winner, setWinner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const homeGoals = goals.filter((g) => g.team === 'home');
  const awayGoals = goals.filter((g) => g.team === 'away');
  const isTieKnockout = stage === 'eliminataria' && homeGoals.length === awayGoals.length;

  // aviso: 2.º amarelo na mesma partida = expulsão automática
  const doubleYellow = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cards) if (c.type === 'yellow') counts.set(`${c.team}:${c.playerId}`, (counts.get(`${c.team}:${c.playerId}`) ?? 0) + 1);
    return Array.from(counts.entries()).filter(([, n]) => n >= 2).map(([k]) => k);
  }, [cards]);

  const grHome = homePlayers.filter((p) => p.position === 'GR');
  const grAway = awayPlayers.filter((p) => p.position === 'GR');

  const addGoal = (team: 'home' | 'away') =>
    setGoals((g) => [...g, { key: nextKey(), team, playerId: '', minute: '', penalty: false }]);
  const addCard = (team: 'home' | 'away') =>
    setCards((c) => [...c, { key: nextKey(), team, playerId: '', type: 'yellow', minute: '' }]);

  const onFoul = (side: 'home' | 'away', half: 'h1' | 'h2', value: string) =>
    setFouls((f) => ({ ...f, [side]: { ...f[side], [half]: Math.max(0, Math.min(99, Number(value) || 0)) } }));

  const submit = async (formData: FormData) => {
    setBusy(true);
    setError(null);
    formData.set('matchId', matchId);
    formData.set(
      'goals_json',
      JSON.stringify(
        goals.map((g) => ({
          team: g.team,
          playerId: g.playerId,
          minute: g.minute === '' ? null : Number(g.minute),
          penalty: g.penalty,
        }))
      )
    );
    formData.set(
      'cards_json',
      JSON.stringify(
        cards.map((c) => ({
          team: c.team,
          playerId: c.playerId,
          type: c.type,
          minute: c.minute === '' ? null : Number(c.minute),
        }))
      )
    );
    formData.set('fouls_json', JSON.stringify(fouls));
    formData.set('home_gr', homeGr);
    formData.set('away_gr', awayGr);
    if (stage === 'eliminataria') {
      formData.set(
        'shootout_json',
        JSON.stringify({
          home: shHome === '' ? null : Number(shHome),
          away: shAway === '' ? null : Number(shAway),
        })
      );
      formData.set('winner', winner);
    }
    try {
      const res = await saveMatchReport(formData);
      if (res && !res.ok) {
        setError(res.error ?? 'Erro ao guardar o relatório.');
      } else {
        setDone(true);
        setTimeout(() => {
          window.location.href = '/admin/resultados?done=1';
        }, 900);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  };

  const foulWarn = (v: number) => v >= 5;

  return (
    <form
      action={matchReportFormAction}
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="space-y-6"
    >
      <input type="hidden" name="matchId" value={matchId} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800">
          Relatório — <span className="text-pitch-800">{home.name}</span> × <span className="text-pitch-800">{away.name}</span>
        </h2>
        <span className="badge-slate">{roundLabel}</span>
      </div>

      {suspended.length > 0 && (
        <div className="alert-warn">
          <p className="font-bold">⚠️ Suspensos nesta partida (automático):</p>
          <ul className="mt-1 list-inside list-disc">
            {suspended.map((s, i) => (
              <li key={i}>
                <b>{s.playerName}</b> ({s.teamName}) — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* placar ao vivo */}
      <div className="card flex items-center justify-center gap-6 px-4 py-4">
        <p className="text-lg font-bold">{home.name}</p>
        <p className="rounded-lg bg-pitch-700 px-4 py-2 text-2xl font-black text-white">
          {homeGoals.length} <span className="mx-1 text-pitch-300">:</span> {awayGoals.length}
        </p>
        <p className="text-lg font-bold">{away.name}</p>
      </div>

      {done && <div className="alert-success">✔ Relatório guardado. Classificação, estatísticas e suspensões atualizadas.</div>}
      {error && <div className="alert-error">{error}</div>}

      {/* GOLS */}
      {(['home', 'away'] as const).map((side) => {
        const team = side === 'home' ? home : away;
        const players = side === 'home' ? homePlayers : awayPlayers;
        const rows = goals.filter((g) => g.team === side);
        return (
          <section key={side} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-700">Golos — {team.name}</h3>
              <button type="button" className="btn-ghost btn-sm" onClick={() => addGoal(side)}>
                + Golo
              </button>
            </div>
            {rows.length === 0 && <p className="text-sm text-slate-400">Sem golos registados.</p>}
            <div className="space-y-2">
              {rows.map((g) => (
                <div key={g.key} className="grid grid-cols-[1fr_72px_64px_32px] items-center gap-2 sm:grid-cols-[2fr_90px_80px_40px_32px]">
                  <select
                    className="input"
                    value={g.playerId}
                    onChange={(e) =>
                      setGoals((gs) => gs.map((x) => (x.key === g.key ? { ...x, playerId: e.target.value } : x)))
                    }
                  >
                    <option value="">Sem autor (golo técnico)</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {playerLabel(p)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={180}
                    placeholder="Min"
                    value={g.minute}
                    onChange={(e) =>
                      setGoals((gs) => gs.map((x) => (x.key === g.key ? { ...x, minute: e.target.value } : x)))
                    }
                  />
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 sm:col-span-1">
                    <input
                      type="checkbox"
                      checked={g.penalty}
                      onChange={(e) =>
                        setGoals((gs) => gs.map((x) => (x.key === g.key ? { ...x, penalty: e.target.checked } : x)))
                      }
                    />
                    GP
                  </label>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => setGoals((gs) => gs.filter((x) => x.key !== g.key))}
                    aria-label="Remover golo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* CARTÕES */}
      {(['home', 'away'] as const).map((side) => {
        const team = side === 'home' ? home : away;
        const players = side === 'home' ? homePlayers : awayPlayers;
        const rows = cards.filter((c) => c.team === side);
        return (
          <section key={`cards-${side}`} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-700">Cartões — {team.name}</h3>
              <button type="button" className="btn-ghost btn-sm" onClick={() => addCard(side)}>
                + Cartão
              </button>
            </div>
            {rows.length === 0 && <p className="text-sm text-slate-400">Sem cartões registados.</p>}
            <div className="space-y-2">
              {rows.map((c) => (
                <div key={c.key} className="grid grid-cols-[1fr_96px_72px_32px] items-center gap-2">
                  <select
                    className="input"
                    value={c.playerId}
                    onChange={(e) =>
                      setCards((cs) => cs.map((x) => (x.key === c.key ? { ...x, playerId: e.target.value } : x)))
                    }
                  >
                    <option value="">Selecionar jogador…</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {playerLabel(p)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={c.type}
                    onChange={(e) =>
                      setCards((cs) =>
                        cs.map((x) => (x.key === c.key ? { ...x, type: e.target.value as 'yellow' | 'red' } : x))
                      )
                    }
                  >
                    <option value="yellow">Amarelo</option>
                    <option value="red">Vermelho</option>
                  </select>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={180}
                    placeholder="Min"
                    value={c.minute}
                    onChange={(e) =>
                      setCards((cs) => cs.map((x) => (x.key === c.key ? { ...x, minute: e.target.value } : x)))
                    }
                  />
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => setCards((cs) => cs.filter((x) => x.key !== c.key))}
                    aria-label="Remover cartão"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {rows.some((c) => doubleYellow.includes(`${side}:${c.playerId}`)) && (
              <p className="mt-2 text-xs font-bold text-red-700">
                ⚠️ 2.º cartão amarelo na mesma partida = vermelho automático (expulsão) e suspensão na próxima partida.
              </p>
            )}
          </section>
        );
      })}

      {/* FALTAS POR TEMPO */}
      <section className="card p-4">
        <h3 className="mb-1 font-bold text-slate-700">Faltas por tempo (equipa)</h3>
        <p className="mb-3 text-xs text-slate-500">
          Na 5.ª falta de uma equipa em cada tempo, o adversário tem direito a lançamento de 10 metros.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {(['home', 'away'] as const).map((side) => {
            const team = side === 'home' ? home : away;
            return (
              <div key={side} className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 truncate text-sm font-bold">{team.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">1.º tempo</label>
                    <input
                      className={`input text-center ${foulWarn(fouls[side].h1) ? 'border-red-400 bg-red-50' : ''}`}
                      type="number"
                      min={0}
                      max={99}
                      value={fouls[side].h1}
                      onChange={(e) => onFoul(side, 'h1', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">2.º tempo</label>
                    <input
                      className={`input text-center ${foulWarn(fouls[side].h2) ? 'border-red-400 bg-red-50' : ''}`}
                      type="number"
                      min={0}
                      max={99}
                      value={fouls[side].h2}
                      onChange={(e) => onFoul(side, 'h2', e.target.value)}
                    />
                  </div>
                </div>
                {foulWarn(fouls[side].h1) && <p className="mt-1 text-xs font-bold text-red-700">⚠️ 5 faltas no 1.º tempo — lançamento de 10m</p>}
                {foulWarn(fouls[side].h2) && <p className="mt-1 text-xs font-bold text-red-700">⚠️ 5 faltas no 2.º tempo — lançamento de 10m</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* GUARDA-REDES */}
      <section className="card p-4">
        <h3 className="mb-3 font-bold text-slate-700">Guarda-redes em campo</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">GR — {home.name}</label>
            <select className="input" value={homeGr} onChange={(e) => setHomeGr(e.target.value)}>
              <option value="">Não indicado</option>
              {grHome.map((p) => (
                <option key={p.id} value={p.id}>
                  {playerLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">GR — {away.name}</label>
            <select className="input" value={awayGr} onChange={(e) => setAwayGr(e.target.value)}>
              <option value="">Não indicado</option>
              {grAway.map((p) => (
                <option key={p.id} value={p.id}>
                  {playerLabel(p)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          O guarda-redes indicado é usado para estatísticas de “menos batido”.
        </p>
      </section>

      {/* ELIMINATÓRIA: GRANDE PENALIDADE */}
      {stage === 'eliminataria' && isTieKnockout && (
        <section className="card border-amber-300 bg-amber-50/50 p-4">
          <h3 className="mb-3 font-bold text-amber-900">Empate — desempate por grande penalidade</h3>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div>
              <label className="label">{home.name}</label>
              <input className="input" type="number" min={0} max={20} placeholder="GP" value={shHome} onChange={(e) => setShHome(e.target.value)} />
            </div>
            <div>
              <label className="label">{away.name}</label>
              <input className="input" type="number" min={0} max={20} placeholder="GP" value={shAway} onChange={(e) => setShAway(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Vencedor (se a GP não definir o vencedor)</label>
            <select className="input sm:max-w-md" value={winner} onChange={(e) => setWinner(e.target.value)}>
              <option value="">Selecionar…</option>
              <option value={home.id}>{home.name}</option>
              <option value={away.id}>{away.name}</option>
            </select>
          </div>
        </section>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'A guardar…' : 'Guardar resultado'}
        </button>
      </div>
    </form>
  );
}
