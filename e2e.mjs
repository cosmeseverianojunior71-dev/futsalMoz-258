// E2E — teste de ponta a ponta do FutsalMoz 258 (via HTTP, como um utilizador real)
import pg from 'pg';

const BASE = 'http://localhost:3000';
const DB = 'postgresql://fm:fm@127.0.0.1:5432/futsalmoz';
const pool = new pg.Pool({ connectionString: DB });

let cookies = [];
let passed = 0;
let failed = 0;

function ok(cond, label) {
  if (cond) {
    passed++;
    console.log(`  ✔ ${label}`);
  } else {
    failed++;
    console.log(`  ✘ FALHOU: ${label}`);
  }
}
async function check(label, fn) {
  try {
    await fn();
  } catch (e) {
    failed++;
    console.log(`  ✘ ERRO em "${label}": ${e.message}`);
  }
}

function cookieHeader() {
  return cookies.map((c) => c.split(';')[0]).join('; ');
}
function storeCookies(res) {
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of sc) {
    const name = c.split(';')[0].split('=')[0];
    cookies = cookies.filter((x) => !x.startsWith(name + '='));
    cookies.push(c.split(';')[0]);
  }
}

async function get(path) {
  const r = await fetch(BASE + path, { headers: { cookie: cookieHeader() }, redirect: 'manual' });
  storeCookies(r);
  const t = await r.text();
  return { status: r.status, html: t, headers: r.headers };
}

/** Localiza o form que contém um input com o campo indicado e devolve {action, id} */
function findForm(html, fieldName) {
  const forms = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
  for (const f of forms) {
    const hasField = new RegExp(`name="${fieldName.replace(/[-]/g, '\\-')}"`).test(f);
    if (!hasField) continue;
    const idMatch = f.match(/name="\$ACTION_ID_([0-9a-f]+)"/);
    const actionMatch = f.match(/<form[^>]*action="([^"]*)"/);
    if (!idMatch) continue;
    return { actionId: `$ACTION_ID_${idMatch[1]}`, actionUrl: actionMatch ? actionMatch[1] : null };
  }
  return null;
}

async function postForm(pagePath, form, fields) {
  const url = form.actionUrl && !form.actionUrl.startsWith('javascript') ? form.actionUrl : pagePath;
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, String(v));
  body.set(form.actionId, '');
  const r = await fetch(BASE + url, {
    method: 'POST',
    headers: { cookie: cookieHeader(), origin: BASE },
    body,
    redirect: 'manual',
  });
  storeCookies(r);
  const t = await r.text();
  return { status: r.status, html: t, headers: r.headers, location: r.headers.get('location') };
}

function db(sql, params) {
  return pool.query(sql, params).then((r) => r.rows);
}

console.log('\n=== 1. Páginas públicas iniciais ===');
await check('home inicial', async () => {
  const { status, html } = await get('/');
  ok(status === 200, 'home responde 200');
  ok(html.includes('Bem-vindo ao FutsalMoz 258'), 'mostra boas-vindas (sem campeonato)');
});

console.log('\n=== 2. Criação do Administrador Sénior ===');
let seniorEmail = 'senior@futsalmoz.co.mz';
await check('criar sénior', async () => {
  const { html } = await get('/login');
  ok(html.includes('Criar Administrador Sénior'), 'login mostra formulário de criação do sénior');
  const form = findForm(html, 'password');
  ok(!!form, 'form de criação tem action ID');
  const r = await postForm('/login', form, {
    name: 'Carlos Machava',
    email: seniorEmail,
    password: 'Senha123!',
  });
  const redirected = [302, 303, 307].includes(r.status);
  ok(redirected && (r.location ?? '').includes('/admin'), `redireciona para /admin (status ${r.status} -> ${r.location})`);
});

console.log('\n=== 3. Painel administrativo ===');
await check('dashboard', async () => {
  const { status, html } = await get('/admin');
  ok(status === 200, 'acessa /admin com sessão');
  ok(html.includes('Painel') && html.includes('Configurar campeonato'), 'dashboard com passo 1');
});

console.log('\n=== 4. Configuração do campeonato ===');
await check('configurar', async () => {
  const { html } = await get('/admin/configuracao');
  const form = findForm(html, 'num_teams');
  ok(!!form, 'form de configuração tem action ID');
  const r = await postForm('/admin/configuracao', form, {
    name: 'Campeonato Nacional de Futsal Moçambique',
    season: '2025/26',
    format: 'liga_final',
    num_teams: 6,
    default_venue: 'Pavilhão do Desporto, Maputo',
    start_date: '2026-09-12',
    default_time: '15:00',
    points_win: 3,
    points_draw: 1,
  });
  ok([200, 302, 303, 307].includes(r.status), `submissão OK (status ${r.status})`);
  const rows = await db('SELECT * FROM championship');
  ok(rows.length === 1 && rows[0].format === 'liga_final' && rows[0].num_teams === 6, 'campeonato guardado na BD');
});

console.log('\n=== 5. Inscrição de equipas e jogadores ===');
const teamsData = [
  { name: 'Costa do Sol FC', short: 'CDS', city: 'Maputo', coach: 'João' },
  { name: 'Maxaquene FS', short: 'MQN', city: 'Maputo', coach: 'Pedro' },
  { name: 'Inter Clube', short: 'INT', city: 'Matola', coach: 'Ana' },
  { name: 'Ferroviário do Nampula', short: 'FRV', city: 'Nampula', coach: 'Lucas' },
  { name: 'Desportivo de Beira', short: 'DBR', city: 'Beira', coach: 'Sofia' },
  { name: 'Atlético de Quelimane', short: 'ATQ', city: 'Quelimane', coach: 'Mário' },
];
const teamIds = {};
const playerIds = {}; // teamName -> { g1: id, gr: id }
await check('inscrever 6 equipas', async () => {
  for (const t of teamsData) {
    const { html } = await get('/admin/equipas');
    const form = findForm(html, 'short_name');
    ok(!!form, `form de inscrição presente para ${t.name}`);
    const r = await postForm('/admin/equipas', form, {
      name: t.name,
      short_name: t.short,
      city: t.city,
      coach: t.coach,
    });
    if (![200, 302, 303, 307].includes(r.status)) throw new Error(`status ${r.status} ao inscrever ${t.name}`);
  }
  const rows = await db('SELECT id, name FROM teams ORDER BY created_at');
  ok(rows.length === 6, `6 equipas na BD (${rows.length})`);
  for (const r of rows) teamIds[r.name] = String(r.id);
});

await check('inscrever jogadores (2 campo + 1 GR por equipa)', async () => {
  for (const t of teamsData) {
    const players = [
      { name: `${t.name} Atleta 1`, number: 7, position: 'CAMPO' },
      { name: `${t.name} Atleta 2`, number: 10, position: 'CAMPO' },
      { name: `${t.name} GR`, number: 1, position: 'GR' },
    ];
    for (const p of players) {
      const { html } = await get('/admin/equipas');
      // o form de jogador tem inputs name/number/position dentro do card da equipa
      const forms = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
      let form = null;
      for (const f of forms) {
        if (f.includes('name="position"') && f.includes(`name="teamId" value="${teamIds[t.name]}"`)) {
          const idMatch = f.match(/name="\$ACTION_ID_([0-9a-f]+)"/);
          if (idMatch) {
            form = { actionId: `$ACTION_ID_${idMatch[1]}`, actionUrl: null };
            break;
          }
        }
      }
      if (!form) throw new Error(`form de jogador não encontrado para ${t.name}`);
      const r = await postForm('/admin/equipas', form, {
        teamId: teamIds[t.name],
        name: p.name,
        number: p.number,
        position: p.position,
      });
      if (![200, 302, 303, 307].includes(r.status)) throw new Error(`status ${r.status} no jogador ${p.name}`);
    }
  }
  const rows = await db('SELECT p.id, p.name, p.team_id, p.position FROM players p');
  ok(rows.length === 18, `18 jogadores na BD (${rows.length})`);
  for (const r of rows) {
    const team = teamsData.find((t) => t.name && teamIds[t.name] === String(r.team_id));
    if (!team) continue;
    playerIds[team.name] = playerIds[team.name] ?? {};
    if (r.position === 'GR') playerIds[team.name].gr = String(r.id);
    else {
      playerIds[team.name].campo = playerIds[team.name].campo ?? [];
      playerIds[team.name].campo.push(String(r.id));
    }
  }
});

console.log('\n=== 6. Geração do calendário (liga, 6 equipas -> 5 jornadas) ===');
await check('gerar calendário', async () => {
  const { html } = await get('/admin/configuracao');
  const form = findForm(html, 'status');
  // o form de gerar calendário é o segundo form sem campos comuns; localizar pelo botão "Gerar calendário"
  const forms = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
  let genForm = null;
  for (const f of forms) {
    if (f.includes('Gerar calendário') || f.includes('Regenerar calendário')) {
      const idMatch = f.match(/name="\$ACTION_ID_([0-9a-f]+)"/);
      if (idMatch) {
        genForm = { actionId: `$ACTION_ID_${idMatch[1]}`, actionUrl: null };
        break;
      }
    }
  }
  ok(!!genForm, 'form de geração encontrado');
  const r = await postForm('/admin/configuracao', genForm, {});
  ok([200, 302, 303, 307].includes(r.status), `submissão OK (status ${r.status})`);
  const rows = await db('SELECT count(*)::int AS n, min(datetime) AS first FROM matches');
  ok(rows[0].n === 15, `15 partidas geradas (${rows[0].n})`);
  ok(rows[0].first != null, 'datas atribuídas automaticamente');
});

console.log('\n=== 7. Calendário público (datas, horários, locais) ===');
await check('calendário público', async () => {
  const { html } = await get('/calendario');
  ok(html.includes('Jornada 1'), 'mostra Jornada 1');
  ok(html.includes('Pavilhão do Desporto, Maputo'), 'mostra o local');
  ok(html.includes('12 de set') || html.includes('12/set') || /15:00/.test(html), 'mostra data/hora');
});

console.log('\n=== 8. Registo de resultados (golos, cartões, faltas, GR) ===');
const allMatches = await db('SELECT id, round_order, seq, home_team_id, away_team_id, datetime FROM matches ORDER BY round_order, seq');
const matchByJornadaSeq = {};
for (const m of allMatches) matchByJornadaSeq[`${m.round_order}-${m.seq}`] = m;

async function submitReport(match, homeGoals, awayGoals, extra) {
  const { html } = await get(`/admin/resultados?m=${match.id}`);
  const forms = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
  let form = null;
  for (const f of forms) {
    const idMatch = f.match(/name="\$ACTION_ID_([0-9a-f]+)"/);
    if (idMatch && f.includes('matchId')) {
      form = { actionId: `$ACTION_ID_${idMatch[1]}`, actionUrl: null };
      break;
    }
  }
  if (!form) throw new Error('form de relatório não encontrado');
  const fields = {
    matchId: match.id,
    goals_json: JSON.stringify([...homeGoals, ...awayGoals]),
    cards_json: JSON.stringify(extra?.cards ?? []),
    fouls_json: JSON.stringify(extra?.fouls ?? { home: { h1: 0, h2: 0 }, away: { h1: 0, h2: 0 } }),
    home_gr: extra?.homeGr ?? '',
    away_gr: extra?.awayGr ?? '',
  };
  if (extra?.stage === 'eliminataria') {
    fields.shootout_json = JSON.stringify(extra?.shootout ?? { home: null, away: null });
    fields.winner = extra?.winner ?? '';
  }
  const r = await postForm(`/admin/resultados?m=${match.id}`, form, fields);
  if (![200, 302, 303, 307].includes(r.status)) throw new Error(`report status ${r.status}`);
}

const g = (team, player, minute, penalty = false) => ({
  team,
  playerId: player,
  minute,
  penalty,
});

await check('registar 1.ª jornada (3 jogos)', async () => {
  const m1 = matchByJornadaSeq['1-0'];
  const m2 = matchByJornadaSeq['1-1'];
  const m3 = matchByJornadaSeq['1-2'];
  const t = (name) => (teamIds[name] ? name : null);
  // descobrir nomes das equipas por id
  const nameById = Object.fromEntries(Object.entries(teamIds).map(([n, id]) => [id, n]));

  // m1: equipa A x B — A ganha 3-1, golos de atletas distintos
  const homeA = nameById[String(m1.home_team_id)];
  const awayB = nameById[String(m1.away_team_id)];
  await submitReport(
    m1,
    [g('home', playerIds[homeA].campo[0], 5), g('home', playerIds[homeA].campo[1], 22), g('home', playerIds[homeA].campo[0], 33, true)],
    [g('away', playerIds[awayB].campo[0], 40)],
    {
      cards: [
        { team: 'away', playerId: playerIds[awayB].campo[0], type: 'yellow', minute: 18 },
        { team: 'home', playerId: playerIds[homeA].campo[1], type: 'yellow', minute: 25 },
      ],
      fouls: { home: { h1: 3, h2: 4 }, away: { h1: 5, h2: 2 } },
      homeGr: playerIds[homeA].gr,
      awayGr: playerIds[awayB].gr,
    }
  );

  // m2: empate 2-2
  const homeC = nameById[String(m2.home_team_id)];
  const awayD = nameById[String(m2.away_team_id)];
  await submitReport(
    m2,
    [g('home', playerIds[homeC].campo[0], 10), g('home', playerIds[homeC].campo[1], 30)],
    [g('away', playerIds[awayD].campo[0], 12), g('away', playerIds[awayD].campo[1], 35)],
    {
      cards: [
        { team: 'away', playerId: playerIds[awayD].campo[1], type: 'yellow', minute: 15 },
        { team: 'away', playerId: playerIds[awayD].campo[1], type: 'yellow', minute: 41 }, // 2.º amarelo = expulsão
      ],
      fouls: { home: { h1: 1, h2: 1 }, away: { h1: 2, h2: 3 } },
      homeGr: playerIds[homeC].gr,
      awayGr: playerIds[awayD].gr,
    }
  );

  // m3: C' ganha 1-0 (a equipa que não jogou m1/m2...)
  const homeE = nameById[String(m3.home_team_id)];
  const awayF = nameById[String(m3.away_team_id)];
  await submitReport(
    m3,
    [g('home', playerIds[homeE].campo[0], 50)],
    [],
    {
      cards: [
        { team: 'home', playerId: playerIds[homeE].campo[1], type: 'red', minute: 48 }, // vermelho direto
      ],
      fouls: { home: { h1: 0, h2: 2 }, away: { h1: 4, h2: 5 } },
      homeGr: playerIds[homeE].gr,
      awayGr: playerIds[awayF].gr,
    }
  );

  const rows = await db(`SELECT count(*)::int AS n FROM matches WHERE status='terminada'`);
  ok(rows[0].n === 3, `3 jogos terminados (${rows[0].n})`);
  const goals = await db(`SELECT count(*)::int AS n FROM goals`);
  ok(goals[0].n === 9, `9 golos registados (${goals[0].n})`);
  const cards = await db(`SELECT count(*)::int AS n FROM cards`);
  ok(cards[0].n === 5, `5 cartões registados (${cards[0].n})`);
});

console.log('\n=== 9. Classificação e estatísticas públicas ===');
await check('classificação', async () => {
  const { html } = await get('/classificacao');
  ok(html.includes('Costa do Sol FC') || /<td/.test(html), 'tabela com equipas');
  const rows = await db(`SELECT count(*)::int AS n FROM matches WHERE status='terminada'`);
  ok(rows[0].n === 3, 'base de dados consistente');
});

await check('melhor marcador público', async () => {
  const { html } = await get('/estatisticas');
  ok(html.includes('Melhor marcador'), 'seção melhor marcador');
  ok(html.includes('Guarda-redes menos batidos'), 'seção guarda-redes menos batidos');
  ok(html.includes('Faltas por equipa'), 'seção faltas');
});

await check('suspensões automáticas', async () => {
  const { html } = await get('/admin/suspenses');
  ok(html.includes('Suspensões automáticas'), 'página de suspensões');
  ok(html.includes('Suspenso'), 'há suspensos indicados (2.º amarelo / vermelho direto)');
  const susp = await db(`SELECT count(*)::int AS n FROM matches`);
  ok(susp[0].n === 15, 'calendário intacto');
});

console.log('\n=== 10. Fluxo de aprovação de administrador ===');
await check('pedir + aprovar admin', async () => {
  // pedido (sem sessão)
  const savedCookies = cookies;
  cookies = [];
  const { html: loginHtml } = await get('/login/pedir');
  const form = findForm(loginHtml, 'password');
  ok(!!form, 'form de pedido presente');
  const r = await postForm('/login', form, {
    name: 'Ana Sitoe',
    email: 'admin2@futsalmoz.co.mz',
    password: 'Senha456!',
  });
  ok([200, 302, 303, 307].includes(r.status), `pedido submetido (status ${r.status})`);
  const pend = await db(`SELECT status FROM users WHERE email='admin2@futsalmoz.co.mz'`);
  ok(pend[0]?.status === 'pending', 'conta fica pendente');

  // sénior aprova
  cookies = savedCookies;
  const { html: usersHtml } = await get('/admin/usuarios');
  ok(usersHtml.includes('Pendentes de aprovação'), 'sénior vê pendentes');
  const forms = usersHtml.match(/<form[\s\S]*?<\/form>/g) ?? [];
  const idRows = await db(`SELECT id FROM users WHERE email='admin2@futsalmoz.co.mz'`);
  const uid = String(idRows[0].id);
  let approveForm = null;
  for (const f of forms) {
    if (f.includes(`value="${uid}"`) && f.includes('Aprovar')) {
      const idMatch = f.match(/name="\$ACTION_ID_([0-9a-f]+)"/);
      if (idMatch) approveForm = { actionId: `$ACTION_ID_${idMatch[1]}`, actionUrl: null };
    }
  }
  ok(!!approveForm, 'form de aprovação presente');
  const ra = await postForm('/admin/usuarios', approveForm, { userId: uid });
  ok([200, 302, 303, 307].includes(ra.status), 'aprovação submetida');
  const now = await db(`SELECT status FROM users WHERE email='admin2@futsalmoz.co.mz'`);
  ok(now[0]?.status === 'active', 'conta ativa após aprovação');

  // admin aprovado entra
  cookies = [];
  const { html: loginHtml2 } = await get('/login');
  const f2 = findForm(loginHtml2, 'password');
  const r2 = await postForm('/login', f2, { email: 'admin2@futsalmoz.co.mz', password: 'Senha456!' });
  const redirected = [302, 303, 307].includes(r2.status) && (r2.location ?? '').includes('/admin');
  ok(redirected, `admin aprovado entra no painel (status ${r2.status} -> ${r2.location})`);
  const { html: adminHtml } = await get('/admin');
  ok(adminHtml.includes('Painel'), 'admin aprovado vê o painel');
  // admin não-sénior não vê a página de utilizadores
  const { status: uStatus, html: uHtml } = await get('/admin/usuarios');
  ok(uStatus === 307 || !uHtml.includes('Pendentes de aprovação'), 'admin comum não acede à gestão de utilizadores');
  // voltar a ser sénior
  cookies = [];
  const { html: loginHtml3 } = await get('/login');
  const f3 = findForm(loginHtml3, 'password');
  await postForm('/login', f3, { email: seniorEmail, password: 'Senha123!' });
});

console.log('\n=== 11. Terminar a fase regular (jornadas 2-5) ===');
await check('jornadas 2-5', async () => {
  const nameById = Object.fromEntries(Object.entries(teamIds).map(([n, id]) => [id, n]));
  let results = 0;
  for (let j = 2; j <= 5; j++) {
    const seqs = [0, 1, 2];
    for (const s of seqs) {
      const m = matchByJornadaSeq[`${j}-${s}`];
      if (!m) continue;
      const homeName = nameById[String(m.home_team_id)];
      const awayName = nameById[String(m.away_team_id)];
      // resultados alternados para variar a tabela
      const hg = (j + s) % 3;
      const ag = (j * 2 + s) % 2;
      const homeGoals = [];
      const awayGoals = [];
      for (let i = 0; i < hg; i++) homeGoals.push(g('home', playerIds[homeName].campo[i % 2], 5 + i * 10));
      for (let i = 0; i < ag; i++) awayGoals.push(g('away', playerIds[awayName].campo[i % 2], 8 + i * 10));
      await submitReport(m, homeGoals, awayGoals, {
        homeGr: playerIds[homeName].gr,
        awayGr: playerIds[awayName].gr,
      });
      results++;
    }
  }
  const rows = await db(`SELECT count(*)::int AS n FROM matches WHERE status='terminada'`);
  ok(rows[0].n === 15, `fase regular completa (${rows[0].n}/15)`);
  ok(results === 12, `12 relatórios submetidos (${results})`);
});

console.log('\n=== 12. Eliminatória final (top 4) ===');
await check('gerar eliminatória', async () => {
  const { html } = await get('/admin/configuracao');
  const forms = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
  let form = null;
  for (const f of forms) {
    if (f.includes('Gerar eliminatória final')) {
      const idMatch = f.match(/name="\$ACTION_ID_([0-9a-f]+)"/);
      if (idMatch) form = { actionId: `$ACTION_ID_${idMatch[1]}`, actionUrl: null };
    }
  }
  ok(!!form, 'form da eliminatória final presente');
  const r = await postForm('/admin/configuracao', form, {});
  ok([200, 302, 303, 307].includes(r.status), `submissão OK (status ${r.status})`);
  const rows = await db(`SELECT round_label, round_order, count(*)::int AS n FROM matches WHERE stage='eliminataria' GROUP BY round_label, round_order ORDER BY round_order`);
  ok(rows.length === 2, `2 rondas: ${rows.map((r) => `${r.round_label}(${r.n})`).join(', ')}`);
});

await check('semifinais avançam os vencedores', async () => {
  const nameById = Object.fromEntries(Object.entries(teamIds).map(([n, id]) => [id, n]));
  const semis = await db(`SELECT id, home_team_id, away_team_id FROM matches WHERE round_label='Semifinal' ORDER BY seq`);
  for (const s of semis) {
    const homeName = nameById[String(s.home_team_id)];
    const awayName = nameById[String(s.away_team_id)];
    await submitReport(
      { id: String(s.id), home_team_id: s.home_team_id, away_team_id: s.away_team_id },
      [g('home', playerIds[homeName].campo[0], 60)],
      [],
      { stage: 'eliminataria', homeGr: playerIds[homeName].gr, awayGr: playerIds[awayName].gr }
    );
  }
  const qf = await db(`SELECT home_team_id, away_team_id FROM matches WHERE round_label='Final'`);
  ok(qf[0].home_team_id != null && qf[0].away_team_id != null, 'final preenchida com os vencedores');
});

await check('final e campeão', async () => {
  const nameById = Object.fromEntries(Object.entries(teamIds).map(([n, id]) => [id, n]));
  const fin = await db(`SELECT id, home_team_id, away_team_id FROM matches WHERE round_label='Final'`);
  const f = fin[0];
  const homeName = nameById[String(f.home_team_id)];
  const awayName = nameById[String(f.away_team_id)];
  // empate no tempo regulamentar + GP
  await submitReport(
    { id: String(f.id), home_team_id: f.home_team_id, away_team_id: f.away_team_id },
    [g('home', playerIds[homeName].campo[0], 44)],
    [g('away', playerIds[awayName].campo[0], 45)],
    { stage: 'eliminataria', shootout: { home: 4, away: 3 }, homeGr: playerIds[homeName].gr, awayGr: playerIds[awayName].gr }
  );
  const { html } = await get('/eliminataria');
  ok(html.includes('Campeão'), 'página pública mostra o campeão');
  ok(html.includes(nameById[String(f.home_team_id)]), 'campeão correto (ganhou na GP)');
  const w = await db(`SELECT winner_team_id, home_shootout, away_shootout FROM matches WHERE round_label='Final' AND status='terminada'`);
  ok(String(w[0].winner_team_id) === String(f.home_team_id), 'vencedor por GP gravado');
  ok(w[0].home_shootout === 4 && w[0].away_shootout === 3, 'marcador da GP gravado');
});

console.log('\n=== 13. Resultados e home públicos ===');
await check('página de resultados', async () => {
  const { html } = await get('/resultados');
  ok(html.includes('Resultados'), 'página de resultados');
  ok(/Semifinal|Jornada 1/.test(html), 'mostra rondas terminadas');
});

await check('home final', async () => {
  const { html } = await get('/');
  ok(html.includes('Campeonato Nacional de Futsal Moçambique'), 'nome do campeonato no hero');
  ok(html.includes('Classificação'), 'atalho classificação');
});

console.log('\n=== 14. Segurança básica ===');
await check('sem sessão não acede ao admin', async () => {
  cookies = [];
  const r = await get('/admin');
  ok(r.status === 307 || r.status === 302, `redirect para login (status ${r.status})`);
});

await check('palavra-passe errada não entra', async () => {
  const { html } = await get('/login');
  const form = findForm(html, 'password');
  const r = await postForm('/login', form, { email: seniorEmail, password: 'errada' });
  const rejected =
    [302, 303, 307].includes(r.status)
      ? (r.location ?? '').includes('/login')
      : r.status === 200 && r.html.includes('incorretos');
  ok(rejected, `login inválido rejeitado (status ${r.status} -> ${r.location ?? '—'})`);
});

console.log(`\n${'='.repeat(40)}`);
console.log(`RESULTADO: ${passed} OK, ${failed} FALHAS`);
await pool.end();
process.exit(failed > 0 ? 1 : 0);
