export default function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-pitch-950 p-4">
      <div className="card w-full max-w-2xl border-none p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-pitch-600 text-2xl">⚽</span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              FutsalMoz <span className="text-pitch-700">258</span>
            </h1>
            <p className="text-sm text-slate-500">Configuração pendente</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          A aplicação está a funcionar mas a base de dados ainda não está ligada. Para ativar o sistema:
        </p>
        <ol className="list-inside list-decimal space-y-2 text-sm text-slate-700">
          <li>
            Crie um projeto no <b>Neon</b> (neon.tech) e copie a <i>pooled connection string</i>.
          </li>
          <li>
            Na <b>Vercel</b>, abra o projeto e defina a variável de ambiente{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold">DATABASE_URL</code> com essa string (nos
            ambientes <b>Production</b>, <b>Preview</b> e <b>Development</b>).
          </li>
          <li>
            Faça o <b>deploy</b> (ou, em desenvolvimento local, crie o ficheiro <code>.env.local</code> com a variável).
          </li>
          <li>
            Abra o site e crie a conta do <b>Administrador Sénior</b> na página de login — o esquema da base de dados é
            criado automaticamente na primeira utilização.
          </li>
        </ol>
        <div className="mt-6 rounded-lg bg-slate-900 p-4 text-xs text-slate-300">
          <p className="mb-1 font-bold text-white">Exemplo:</p>
          <code className="break-all">
            DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.europe-west1.aws.neon.tech/futsalmoz?sslmode=require"
          </code>
        </div>
      </div>
    </div>
  );
}
