CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',      -- 'senior' | 'admin'
  status        TEXT NOT NULL DEFAULT 'pending',    -- 'active' | 'pending' | 'rejected'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS championship (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL DEFAULT 'Campeonato de Futsal',
  season        TEXT,
  format        TEXT NOT NULL DEFAULT 'liga_1',     -- liga_1 | liga_2 | eliminataria | liga_final
  num_teams     INTEGER NOT NULL DEFAULT 0,
  default_venue TEXT,
  start_date    DATE,
  default_time  TEXT DEFAULT '15:00',
  points_win    INTEGER NOT NULL DEFAULT 3,
  points_draw   INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'config',     -- config | ativo | concluido
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id  UUID NOT NULL REFERENCES championship(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  short_name       TEXT,
  city             TEXT,
  coach            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teams_champ_idx ON teams(championship_id);

CREATE TABLE IF NOT EXISTS players (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  number     INTEGER,
  position   TEXT NOT NULL DEFAULT 'CAMPO',         -- 'GR' | 'CAMPO'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS players_team_idx ON players(team_id);

CREATE TABLE IF NOT EXISTS matches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id  UUID NOT NULL REFERENCES championship(id) ON DELETE CASCADE,
  round_label      TEXT NOT NULL,                   -- 'Jornada 1' | 'Semifinal' | 'Final'
  round_order      INTEGER NOT NULL DEFAULT 0,      -- ordem da fase (1,2,3...)
  seq              INTEGER NOT NULL DEFAULT 0,      -- ordem dentro da fase
  stage            TEXT NOT NULL DEFAULT 'regular', -- 'regular' | 'eliminataria'
  home_team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
  datetime         TIMESTAMPTZ,
  venue            TEXT,
  status           TEXT NOT NULL DEFAULT 'agendada',-- 'agendada' | 'terminada'
  home_goals       INTEGER,
  away_goals       INTEGER,
  home_gr_id       UUID,
  away_gr_id       UUID,
  winner_team_id   UUID,
  home_shootout    INTEGER,
  away_shootout    INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matches_champ_idx ON matches(championship_id);
CREATE INDEX IF NOT EXISTS matches_round_idx ON matches(round_order, seq);

CREATE TABLE IF NOT EXISTS match_fouls (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id  UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  half     INTEGER NOT NULL,                        -- 1 | 2
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, team_id, half)
);

CREATE TABLE IF NOT EXISTS goals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id    UUID NOT NULL,
  player_id  UUID REFERENCES players(id) ON DELETE SET NULL,
  minute     INTEGER,
  is_penalty BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goals_match_idx ON goals(match_id);

CREATE TABLE IF NOT EXISTS cards (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id    UUID NOT NULL,
  player_id  UUID NOT NULL,
  type       TEXT NOT NULL,                         -- 'yellow' | 'red'
  minute     INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cards_match_idx ON cards(match_id);
