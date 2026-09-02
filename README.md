# ⚽ FutsalMoz 258

Plataforma completa de gestão de campeonato de futsal para Moçambique (+258) — **100% funcional**, sem dados de demonstração: tudo é criado pelo administrador através do sistema.

**Stack:** Next.js 15 (App Router + Server Actions) · Neon (PostgreSQL serverless) · Vercel · Tailwind CSS

---

## Funcionalidades

### Para visitantes / utilizadores simples (sem conta, acessível pelo telemóvel)
| Janela | Descrição |
|---|---|
| **Classificação** | Tabela de pontos com desempates (DG → GM → V) e destaque das posições de apuramento |
| **Calendário** | Datas, horários (hora de Maputo, CAT) e locais de cada partida, agrupados por jornada/ronda |
| **Resultados** | Placares por jornada com golos (autor + minuto + GP), cartões e marcador da grande penalidade |
| **Estatísticas** | Melhor marcador, guarda-redes menos batidos (com clean sheets), cartões por jogador, faltas por equipa |
| **Eliminatória** | Árvore da fase a eliminar com avançamentos automáticos e campeão |

### Para administradores (login obrigatório)
- **Gestão total do formato do campeonato**: liga 1 volta, liga 2 voltas, eliminatória direta, ou liga + fase eliminatória final; define o **número de equipas** (2–32), época, local principal, data de início, hora padrão e pontos por vitória/empate.
- **Inscrição de equipas** (nome, sigla, cidade, treinador) e **jogadores** (dorsal, posição campo/guarda-redes).
- **Geração automática do calendário** (round-robin equilibrado com datas semanais; sorteo de eliminatória com folgas para as melhores posições de seed) e ajuste livre de **data, hora e local** de cada partida.
- **Janela de registo de partida**: golo a golo (autor, minuto, grande penalidade), **cartões** (amarelo/vermelho por minuto), **faltas acumuladas por tempo** (aviso na 5.ª falta de cada tempo = lançamento de 10m), guarda-redes em campo e, em eliminatórias, desempate por grande penalidade.
- **Suspensões automáticas** (regras de futsal):
  - 2.º cartão amarelo na mesma partida = vermelho (expulsão) → suspensão na próxima partida;
  - Cartão vermelho direto → suspensão na próxima partida;
  - 3.º cartão amarelo acumulado → suspensão na próxima partida (contador reinicia após cumprir).
  A janela **Suspensões** mostra quem fica suspenso em cada partida e a acumulação de cartões por jogador.
- **Gestão de utilizadores (exclusiva do Administrador Sénior)**: aprovar/recusar pedidos de conta, criar administradores diretamente e remover contas.
- **Reiniciar campeonato** (zona de perigo) e marcar o campeonato como ativo/concluído.

### Controlo de acesso
1. **Primeiro acesso**: a página de login mostra o formulário "Criar Administrador Sénior" (apenas uma vez, quando não há utilizadores).
2. O **Administrador Sénior** aprova os demais administradores; contas pendentes não conseguem entrar.
3. Todos os **visitantes** (usuário simples) veem o site público sem login.

---

## Como o sistema funciona (fluxo do administrador)

1. Criar a conta do **Administrador Sénior** em `/login`.
2. **Configuração**: nome, época, formato, número de equipas, local, data de início.
3. **Equipas**: inscrever as equipas e os jogadores (incluindo os guarda-redes).
4. **Configuração → Gerar calendário**: o sistema cria as jornadas (ou o sorteo da eliminatória) com datas automáticas.
5. **Calendário**: ajustar datas, horários e locais de cada partida.
6. **Resultados**: após cada jornada, registar placares, golos, cartões, faltas e guarda-redes → a classificação, as estatísticas e as suspensões atualizam-se automaticamente.
7. No formato "Liga + Fase eliminatória": após terminar a fase regular, **Gerar eliminatória final** (top 4, ou top 8 com 8+ equipas) — os vencedores avançam automaticamente até ao campeão.

---

## Deploy na Vercel + Neon (produção)

### 1. Criar a base de dados no Neon
1. Crie (ou inicie sessão) em [neon.tech](https://neon.tech) com a conta GitHub.
2. **Create Database** → nome sugerido: `futsalmoz` → região `europe-west1` (ou a que preferir).
3. Na página da base de dados, abra **Connect** e copie a **Pooled connection string**:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.regiao.aws.neon.tech/futsalmoz?sslmode=require
   ```
   > **Não precisa de criar tabelas manualmente** — o esquema é criado automaticamente na primeira utilização. (O ficheiro `init.sql` contém o esquema, apenas para referência.)

### 2. Publicar na Vercel
1. Faça o push deste diretório para um repositório GitHub (ex.: `futsalmoz-258`).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório (a Vercel deteta Next.js automaticamente).
3. Em **Environment Variables**, adicione `DATABASE_URL` com a pooled connection string do Neon nos ambientes **Production**, **Preview** e **Development**.
4. **Deploy**.

### 3. Primeiro acesso
1. Abra o URL da Vercel.
2. Vá a **Administração** (`/login`) → crie a conta do **Administrador Sénior** (aparece apenas no primeiro acesso, quando não há utilizadores).
3. Siga o fluxo: Configuração → Equipas → Gerar calendário → Resultados.

> Sem `DATABASE_URL`, o site mostra um ecrã de configuração com estes passos (nunca fica "em branco" ou em erro).

### Alternativa: CLI
```bash
npm i -g vercel
vercel          # primeiro deploy (interativo)
vercel env add DATABASE_URL   # cole a connection string do Neon
vercel --prod
```

---

## Desenvolvimento local

```bash
npm install
```

Crie `.env.local`:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/futsalmoz"
```
Qualquer PostgreSQL local funciona (o código usa `pg` via TCP para hosts não-Neon e o driver serverless do Neon para URLs `*.neon.tech`). Depois:

```bash
npm run dev    # http://localhost:3000
```

Teste end-to-end (com um PostgreSQL local a correr e o servidor no ar):
```bash
node e2e.mjs
```

---

## Notas técnicas

- **Autenticação**: passwords com `scrypt` (salt por palavra-passe); sessões em cookie `httpOnly` + tabela `sessions` (7 dias).
- **Zona horária**: todos os horários são guardados em UTC e apresentados em hora de Maputo (`Africa/Maputo`, CAT = UTC+2, sem horário de verão).
- **Desempates de classificação**: pontos → diferença de golos → golos marcados → vitórias → ordem alfabética.
- **Round-robin**: método do círculo, alternando casa/fora a cada jornada para equilíbrio.
- **Eliminatória**: sorteo com seed (ordem de inscrição, ou ordem da classificação na fase regular); folgas atribuídas às melhores posições de seed; o vencedor avança automaticamente; empates resolvem-se por grande penalidade (ou escolha manual do vencedor).
- **Suspensões**: motor próprio (`lib/suspensions.ts`) que percorre as partidas em ordem cronológica e aplica as regras de futsal; a suspensão vale para a próxima partida da equipa do jogador.
- **Segurança**: páginas de administração protegidas por sessão; ações de gestão de utilizadores verificam o papel de sénior no servidor; validações de posse (jogador pertence à equipa) no registo de golos/cartões.

## Estrutura

```
app/
  page.tsx                  # Home pública
  (public)/                 # Classificação, Calendário, Resultados, Estatísticas, Eliminatória
  login/page.tsx            # Login / criação do sénior / pedido de conta
  admin/                    # Painel, Configuração, Equipas, Calendário, Resultados, Suspensões, Utilizadores
lib/
  db.ts                     # Ligação (Neon serverless | pg local) + bootstrap automático do esquema
  schema.ts                 # DDL (CREATE TABLE IF NOT EXISTS)
  auth.ts                   # Sessões + hashes de password
  schedule.ts               # Round-robin + sorteo de eliminatória
  standings.ts              # Classificação e desempates
  suspensions.ts            # Motor de suspensões automáticas
  queries.ts                # Consultas (públicas e admin)
  actions/                  # Server actions (auth, campeonato, equipas, partidas, utilizadores)
components/                 # UI (janelas de classificação, árvore, relatório de partida, ...)
init.sql                    # Esquema SQL de referência
e2e.mjs                     # Teste end-to-end (62 verificações)
```
