'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  createSeniorAdmin,
  login,
  requestAdminAccount,
  seniorFormAction,
  loginFormAction,
  requestFormAction,
} from '@/lib/actions/auth';

type ActionRes = { ok: boolean; error?: string } | void;

export default function LoginForm({
  seniorExists,
  initialTab = 'login',
}: {
  seniorExists: boolean;
  initialTab?: 'login' | 'pedir';
}) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('e');
  const [tab, setTab] = useState<'login' | 'pedir'>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: (fd: FormData) => Promise<ActionRes>, form: HTMLFormElement) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fn(new FormData(form));
      if (res && !res.ok) setError(res.error ?? 'Ocorreu um erro.');
      // em caso de sucesso a action faz redirect
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  };

  const showSeniorForm = !seniorExists;
  const shownError = error ?? urlError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-pitch-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <p className="text-4xl">⚽</p>
          <h1 className="mt-2 text-2xl font-black">
            FutsalMoz <span className="text-pitch-500">258</span>
          </h1>
          <p className="text-sm text-pitch-100/60">
            {showSeniorForm ? 'Configuração inicial do sistema' : 'Painel de administração'}
          </p>
        </div>

        <div className="card p-6">
          {!showSeniorForm && (
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${tab === 'login' ? 'bg-white shadow' : 'text-slate-500'}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('pedir');
                  setError(null);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${tab === 'pedir' ? 'bg-white shadow' : 'text-slate-500'}`}
              >
                Pedir conta
              </button>
            </div>
          )}

          {shownError && <div className="alert-error">{shownError}</div>}
          {info && <div className="alert-success">{info}</div>}

          {showSeniorForm ? (
            <form
              action={seniorFormAction}
              onSubmit={(e) => {
                e.preventDefault();
                run(createSeniorAdmin, e.currentTarget);
              }}
              className="space-y-4"
            >
              <div className="rounded-lg bg-pitch-50 p-3 text-xs text-pitch-900">
                Primeiro acesso ao sistema: crie a conta do <b>Administrador Sénior</b>. Esta conta aprova os demais
                administradores e tem acesso total.
              </div>
              <div>
                <label className="label">Nome completo</label>
                <input className="input" name="name" placeholder="Ex.: Carlos Machava" required minLength={2} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" name="email" type="email" placeholder="seu@email.co.mz" required />
              </div>
              <div>
                <label className="label">Palavra-passe (mín. 6 caracteres)</label>
                <input className="input" name="password" type="password" required minLength={6} />
              </div>
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? 'A criar…' : 'Criar Administrador Sénior'}
              </button>
            </form>
          ) : tab === 'login' ? (
            <form
              action={loginFormAction}
              onSubmit={(e) => {
                e.preventDefault();
                run(login, e.currentTarget);
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Email</label>
                <input className="input" name="email" type="email" required />
              </div>
              <div>
                <label className="label">Palavra-passe</label>
                <input className="input" name="password" type="password" required />
              </div>
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? 'A entrar…' : 'Entrar'}
              </button>
              <p className="text-center text-xs text-slate-500">
                Administradores pendentes devem aguardar a aprovação do Administrador Sénior.
              </p>
            </form>
          ) : (
            <form
              action={requestFormAction}
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                setBusy(true);
                setError(null);
                setInfo(null);
                try {
                  const res = await requestAdminAccount(new FormData(form));
                  if (res && !res.ok) setError(res.error ?? 'Ocorreu um erro.');
                  else {
                    setInfo('Pedido enviado! O Administrador Sénior irá analisar a sua conta de administrador.');
                    form.reset();
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro inesperado.');
                } finally {
                  setBusy(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Nome completo</label>
                <input className="input" name="name" required minLength={2} placeholder="Ex.: Ana Sitoe" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" name="email" type="email" required />
              </div>
              <div>
                <label className="label">Palavra-passe (mín. 6 caracteres)</label>
                <input className="input" name="password" type="password" required minLength={6} />
              </div>
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? 'A enviar…' : 'Solicitar conta de administrador'}
              </button>
              <p className="text-center text-xs text-slate-500">
                A conta só ficará ativa após aprovação do Administrador Sénior.
              </p>
            </form>
          )}
        </div>

        <p className="mt-4 text-center">
          <Link href="/" className="text-xs text-pitch-100/70 underline hover:text-white">
            ← Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  );
}
