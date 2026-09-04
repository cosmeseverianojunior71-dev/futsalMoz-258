'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  saveChampionship,
  saveChampionshipFormAction,
  setChampionshipStatus,
  statusFormAction,
  resetChampionship,
  resetFormAction,
} from '@/lib/actions/championship';
import { generateSchedule, generateScheduleFormAction, generateFinalKnockout, generateFinalKnockoutFormAction } from '@/lib/actions/matches';
import type { Championship } from '@/lib/queries';

type Res = { ok: boolean; error?: string };

interface Props {
  initial: Championship | null;
  teamsCount: number;
  finishedMatches: number;
  hasMatches: boolean;
  initialError?: string | null;
}

export default function ConfigForm({ initial, teamsCount, finishedMatches, hasMatches, initialError }: Props) {
  const [saveErr, setSaveErr] = useState<string | null>(initialError ?? null);
  const [saveOk, setSaveOk] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [genOk, setGenOk] = useState(false);
  const [finalErr, setFinalErr] = useState<string | null>(null);
  const [finalOk, setFinalOk] = useState(false);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetOk, setResetOk] = useState(false);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const runInline = async (key: string, fn: (fd: FormData) => Promise<Res>, form: HTMLFormElement) => {
    setBusy(key);
    try {
      const r = await fn(new FormData(form));
      if (key === 'save') {
        setSaveErr(r && !r.ok ? r.error ?? 'Erro' : null);
        setSaveOk(r?.ok ?? false);
      }
      if (key === 'gen') {
        setGenErr(r && !r.ok ? r.error ?? 'Erro' : null);
        setGenOk(r?.ok ?? false);
      }
      if (key === 'final') {
        setFinalErr(r && !r.ok ? r.error ?? 'Erro' : null);
        setFinalOk(r?.ok ?? false);
      }
      if (key === 'reset') {
        setResetErr(r && !r.ok ? r.error ?? 'Erro' : null);
        setResetOk(r?.ok ?? false);
      }
      if (key === 'status') {
        setStatusErr(r && !r.ok ? r.error ?? 'Erro' : null);
        setStatusOk(r?.ok ?? false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro inesperado';
      if (key === 'save') setSaveErr(msg);
      if (key === 'gen') setGenErr(msg);
      if (key === 'final') setFinalErr(msg);
      if (key === 'reset') setResetErr(msg);
      if (key === 'status') setStatusErr(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">Configuração do campeonato</h1>
      <p className="mb-6 text-sm text-slate-500">
        Defina o formato, o número de equipas e os dados gerais. Depois inscreva as equipas e gere o calendário.
      </p>

      <form
        action={saveChampionshipFormAction}
        onSubmit={(e) => {
          e.preventDefault();
          runInline('save', saveChampionship, e.currentTarget);
        }}
        className="card mb-6 p-5"
      >
        {saveErr && <div className="alert-error">{saveErr}</div>}
        {saveOk && <div className="alert-success">✔ Configuração guardada.</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome do campeonato</label>
            <input
              className="input"
              name="name"
              defaultValue={initial?.name ?? ''}
              placeholder="Ex.: Campeonato Nacional de Futsal"
              required
            />
          </div>
          <div>
            <label className="label">Época / Temporada</label>
            <input className="input" name="season" defaultValue={initial?.season ?? ''} placeholder="Ex.: 2025/26" />
          </div>
          <div>
            <label className="label">Formato do campeonato</label>
            <select className="input" name="format" defaultValue={initial?.format ?? 'liga_1'}>
              <option value="liga_1">Liga — 1 volta (todos contra todos)</option>
              <option value="liga_2">Liga — 2 voltas (ida e volta)</option>
              <option value="eliminataria">Eliminatória direta</option>
              <option value="liga_final">Liga + Fase eliminatória (final)</option>
            </select>
          </div>
          <div>
            <label className="label">N.º de equipas (par ou ímpar)</label>
            <input
              className="input"
              name="num_teams"
              type="number"
              min={2}
              max={64}
              defaultValue={initial?.num_teams ?? 8}
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Aceita qualquer número de equipas. Se for ímpar, uma equipa folga por jornada.
            </p>
          </div>
          <div>
            <label className="label">Local principal (campo/pavilhão)</label>
            <input
              className="input"
              name="default_venue"
              defaultValue={initial?.default_venue ?? ''}
              placeholder="Ex.: Pavilhão do Desporto, Maputo"
            />
          </div>
          <div>
            <label className="label">Data de início</label>
            <input className="input" name="start_date" type="date" defaultValue={initial?.start_date ?? ''} />
          </div>
          <div>
            <label className="label">Hora padrão dos jogos</label>
            <input className="input" name="default_time" type="time" defaultValue={initial?.default_time ?? '15:00'} />
          </div>
          <div>
            <label className="label">Pontos por vitória</label>
            <input className="input" name="points_win" type="number" min={1} max={5} defaultValue={initial?.points_win ?? 3} />
          </div>
          <div>
            <label className="label">Pontos por empate</label>
            <input className="input" name="points_draw" type="number" min={0} max={3} defaultValue={initial?.points_draw ?? 1} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={busy === 'save'}>
            {busy === 'save' ? 'A guardar…' : 'Guardar configuração'}
          </button>
          {initial && (
            <Link href="/admin/equipas" className="btn-ghost">
              Inscrever equipas ({teamsCount}/{initial.num_teams}) →
            </Link>
          )}
        </div>
      </form>

      {initial && (
        <>
          <div className="card mb-6 p-5">
            <h2 className="mb-1 font-bold">Geração do calendário</h2>
            <p className="mb-3 text-sm text-slate-500">
              {teamsCount}/{initial.num_teams} equipas inscritas.{' '}
              {initial.format === 'liga_final'
                ? 'Gera as jornadas da fase regular. A eliminatória final é gerada depois de terminada a fase regular.'
                : initial.format === 'eliminataria'
                  ? 'Gera o sorteio da eliminatória.'
                  : 'Gera todas as jornadas com datas automáticas (semanais). Pode depois ajustar data, hora e local de cada partida.'}
            </p>
            {genErr && <div className="alert-error">{genErr}</div>}
            {genOk && <div className="alert-success">✔ Calendário gerado. Ajuste datas e locais na aba Calendário.</div>}
            <form
              action={generateScheduleFormAction}
              onSubmit={(e) => {
                e.preventDefault();
                runInline('gen', generateSchedule, e.currentTarget);
              }}
            >
              <button className="btn-primary" disabled={busy === 'gen'}>
                {busy === 'gen'
                  ? 'A gerar…'
                  : hasMatches
                    ? 'Regenerar calendário (remove jogos agendados, mantém resultados)'
                    : 'Gerar calendário'}
              </button>
            </form>
          </div>

          {initial.format === 'liga_final' && (
            <div className="card mb-6 border-amber-200 p-5">
              <h2 className="mb-1 font-bold">Fase eliminatória (final)</h2>
              <p className="mb-3 text-sm text-slate-500">
                Após terminar todos os jogos da fase regular, gere a eliminatória com as{' '}
                {initial.num_teams >= 8 ? 8 : 4} melhores classificadas.
              </p>
              {finalErr && <div className="alert-error">{finalErr}</div>}
              {finalOk && <div className="alert-success">✔ Eliminatória final gerada com as melhores classificadas.</div>}
              <form
                action={generateFinalKnockoutFormAction}
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy('final');
                  setFinalErr(null);
                  setFinalOk(false);
                  try {
                    const r = await generateFinalKnockout();
                    setFinalErr(r && !r.ok ? r.error ?? 'Erro' : null);
                    setFinalOk(r?.ok ?? false);
                  } catch (err) {
                    setFinalErr(err instanceof Error ? err.message : 'Erro inesperado.');
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                <button className="btn-primary" disabled={busy === 'final'}>
                  {busy === 'final' ? 'A gerar…' : 'Gerar eliminatória final (top da classificação)'}
                </button>
              </form>
            </div>
          )}

          <div className="card mb-6 p-5">
            <h2 className="mb-3 font-bold">Estado</h2>
            {statusErr && <div className="alert-error">{statusErr}</div>}
            {statusOk && <div className="alert-success">✔ Estado atualizado.</div>}
            <div className="flex flex-wrap gap-3">
              <form
                action={statusFormAction}
                onSubmit={(e) => {
                  e.preventDefault();
                  runInline('status', setChampionshipStatus, e.currentTarget);
                }}
              >
                <input type="hidden" name="status" value="ativo" />
                <button className="btn-ghost" disabled={busy === 'status'}>
                  Marcar como ativo
                </button>
              </form>
              <form
                action={statusFormAction}
                onSubmit={(e) => {
                  e.preventDefault();
                  runInline('status', setChampionshipStatus, e.currentTarget);
                }}
              >
                <input type="hidden" name="status" value="concluido" />
                <button className="btn-ghost" disabled={busy === 'status'}>
                  Marcar como concluído
                </button>
              </form>
            </div>
          </div>

          <div className="card border-red-200 p-5">
            <h2 className="mb-1 font-bold text-red-700">Zona de perigo</h2>
            <p className="mb-3 text-sm text-slate-500">
              Reiniciar apaga <b>tudo</b> (campeonato, equipas, jogadores, calendário e resultados).
            </p>
            {resetErr && <div className="alert-error">{resetErr}</div>}
            {resetOk && <div className="alert-success">✔ Campeonato reiniciado.</div>}
            <form
              action={resetFormAction}
              onSubmit={async (e) => {
                if (!window.confirm('Tem a certeza? Todos os dados do campeonato serão apagados.')) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                setBusy('reset');
                setResetErr(null);
                try {
                  const r = await resetChampionship();
                  setResetErr(r && !r.ok ? r.error ?? 'Erro' : null);
                  setResetOk(r?.ok ?? false);
                } catch (err) {
                  setResetErr(err instanceof Error ? err.message : 'Erro inesperado.');
                } finally {
                  setBusy(null);
                }
              }}
            >
              <button className="btn-danger" disabled={busy === 'reset'}>
                {busy === 'reset' ? 'A reiniciar…' : 'Reiniciar campeonato'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
