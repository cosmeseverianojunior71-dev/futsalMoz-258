'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  addTeamFormAction,
  updateTeamFormAction,
  deleteTeamFormAction,
  addPlayerFormAction,
  deletePlayerFormAction,
  addTeam,
  updateTeam,
  addPlayer,
} from '@/lib/actions/teams';
import type { Championship, Player, Team } from '@/lib/queries';

interface Msg {
  ok: boolean;
  text: string;
}

interface Props {
  championship: Championship | null;
  teams: Team[];
  players: Player[];
  finishedByTeam: Array<{ teamId: string; count: number }>;
  initialError?: string | null;
}

export default function TeamsManager({ championship, teams, players, finishedByTeam, initialError }: Props) {
  const [addErr, setAddErr] = useState<string | null>(initialError ?? null);
  const [addOk, setAddOk] = useState(false);
  const [addPending, setAddPending] = useState(false);

  if (!championship) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold">Equipas</h1>
        <div className="card p-6">
          <p className="mb-4 text-sm text-slate-600">Configure primeiro o campeonato para poder inscrever equipas.</p>
          <Link href="/admin/configuracao" className="btn-primary">
            Ir para Configuração
          </Link>
        </div>
      </div>
    );
  }

  // Removida qualquer restrição quanto a número par/ímpar; exibição apenas informativa de inscritos
  const remaining = championship.num_teams - teams.length;
  const finishedMap = new Map(finishedByTeam.map((f) => [f.teamId, f.count]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Equipas</h1>
        <p className="text-sm text-slate-500">
          {teams.length} inscritas · a ordem de inscrição define o sorteio
        </p>
      </div>

      <form
        action={addTeamFormAction}
        onSubmit={async (e) => {
          e.preventDefault();
          setAddPending(true);
          setAddErr(null);
          setAddOk(false);
          try {
            const r = await addTeam(new FormData(e.currentTarget));
            if (r && !r.ok) setAddErr(r.error ?? 'Erro');
            else setAddOk(true);
          } catch (ex) {
            setAddErr(ex instanceof Error ? ex.message : 'Erro inesperado.');
          } finally {
            setAddPending(false);
          }
        }}
        className="card mb-6 p-5"
      >
        <h2 className="mb-3 font-bold">Inscrever equipa</h2>
        {addErr && <div className="alert-error">{addErr}</div>}
        {addOk && <div className="alert-success">✔ Equipa inscrita.</div>}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Nome da equipa *</label>
            <input className="input" name="name" placeholder="Ex.: Costa do Sol FC" required minLength={2} />
          </div>
          <div>
            <label className="label">Sigla</label>
            {/* Removido o limite de 3 caracteres */}
            <input className="input" name="short_name" placeholder="Ex.: CDS ou qualquer sigla" />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input className="input" name="city" placeholder="Ex.: Maputo" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Treinador</label>
            <input className="input" name="coach" placeholder="Opcional" />
          </div>
        </div>
        <button className="btn-primary mt-4" disabled={addPending}>
          {addPending ? 'A inscrever…' : '+ Inscrever equipa'}
        </button>
      </form>

      {teams.length === 0 && (
        <div className="card p-6 text-sm text-slate-500">Ainda não há equipas inscritas.</div>
      )}

      <div className="space-y-4">
        {teams.map((t, idx) => (
          <TeamCard
            key={t.id}
            index={idx}
            team={t}
            teamPlayers={players.filter((p) => p.team_id === t.id)}
            hasResults={(finishedMap.get(t.id) ?? 0) > 0}
          />
        ))}
      </div>
    </div>
  );
}

function TeamCard({
  index,
  team,
  teamPlayers,
  hasResults,
}: {
  index: number;
  team: Team;
  teamPlayers: Player[];
  hasResults: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const flash = (m: Msg) => {
    setMsg(m);
    if (m.ok) setTimeout(() => setMsg(null), 2500);
  };

  // Função auxiliar para renderizar a etiqueta da posição
  const renderPositionBadge = (pos: string) => {
    switch (pos) {
      case 'GR':
      case 'Guarda-Redes':
        return <span className="badge-green ml-2">GR</span>;
      case 'FIXO':
      case 'Fixo':
        return <span className="badge-blue ml-2">FIX</span>;
      case 'ALA':
      case 'Ala':
        return <span className="badge-amber ml-2">ALA</span>;
      case 'PIVO':
      case 'Pivô':
        return <span className="badge-purple ml-2 font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">PIV</span>;
      default:
        return <span className="ml-2 text-xs text-slate-400">{pos}</span>;
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pitch-700 text-xs font-black text-white">
            {index + 1}
          </span>
          <div>
            <p className="font-bold">
              {team.name}
              {team.city && <span className="ml-1 text-xs font-normal text-slate-400">({team.city})</span>}
            </p>
            {team.coach && <p className="text-xs text-slate-500">Treinador: {team.coach}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Fechar' : 'Editar'}
          </button>
          <form
            action={deleteTeamFormAction}
            onSubmit={(e) => {
              if (!window.confirm(`Remover a equipa "${team.name}"?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="teamId" value={team.id} />
            <button className="btn-danger btn-sm" disabled={hasResults}>
              Remover
            </button>
          </form>
        </div>
      </div>

      {msg && <div className={msg.ok ? 'alert-success' : 'alert-error'}>{msg.text}</div>}
      {hasResults && (
        <p className="px-4 pt-2 text-xs text-slate-400">Esta equipa já tem resultados registados — não pode ser removida.</p>
      )}

      {editing && (
        <form
          action={updateTeamFormAction}
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await updateTeam(new FormData(e.currentTarget));
            flash(res && !res.ok ? { ok: false, text: res.error ?? 'Erro' } : { ok: true, text: 'Equipa atualizada.' });
          }}
          className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-4"
        >
          <input type="hidden" name="teamId" value={team.id} />
          <div className="sm:col-span-2">
            <label className="label">Nome</label>
            <input className="input" name="name" defaultValue={team.name} required minLength={2} />
          </div>
          <div>
            <label className="label">Sigla</label>
            {/* Removido o limite de 3 caracteres */}
            <input className="input" name="short_name" defaultValue={team.short_name ?? ''} />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input className="input" name="city" defaultValue={team.city ?? ''} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Treinador</label>
            <input className="input" name="coach" defaultValue={team.coach ?? ''} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary">Guardar</button>
          </div>
        </form>
      )}

      <div className="p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Jogadores ({teamPlayers.length})</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {teamPlayers.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">Sem jogadores registados.</li>
            )}
            {teamPlayers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <b className="mr-1 text-slate-400">{p.number ?? '—'}</b>
                  {p.name}
                  {renderPositionBadge(p.position)}
                </span>
                <form
                  action={deletePlayerFormAction}
                  onSubmit={(e) => {
                    if (!window.confirm(`Remover o jogador "${p.name}"?`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="playerId" value={p.id} />
                  <button className="text-xs font-bold text-red-600 hover:underline" type="submit">
                    remover
                  </button>
                </form>
              </li>
            ))}
          </ul>

          <form
            action={addPlayerFormAction}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const res = await addPlayer(new FormData(form));
              if (res && !res.ok) flash({ ok: false, text: res.error ?? 'Erro' });
              else {
                flash({ ok: true, text: 'Jogador adicionado.' });
                form.reset();
              }
            }}
            className="rounded-lg border border-dashed border-slate-300 p-3"
          >
            <input type="hidden" name="teamId" value={team.id} />
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Adicionar jogador</p>
            <div className="grid grid-cols-[1fr_70px] gap-2">
              <input className="input" name="name" placeholder="Nome do jogador" required minLength={2} />
              <input className="input text-center" name="number" type="number" min={1} max={99} placeholder="Dorsal" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              {/* Opções de posições de Futsal atualizadas */}
              <select className="input" name="position" defaultValue="Guarda-Redes" style={{ width: 'auto' }}>
                <option value="Guarda-Redes">Guarda-redes</option>
                <option value="Fixo">Fixo</option>
                <option value="Ala">Ala</option>
                <option value="Pivô">Pivô</option>
              </select>
              <button className="btn-primary btn-sm">+ Adicionar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
