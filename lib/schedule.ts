export interface ByeAdvanceResult {
  nextRoundOrder: number;
  nextIdx: number;
  side: 'home' | 'away';
  teamId: string;
}

export interface WinnerAdvanceResult {
  nextRoundOrder: number;
  nextIdx: number;
  side: 'home' | 'away';
}

export interface KnockoutRound {
  label: string;
  roundOrder: number;
  pairs: Array<[string | null, string | null]>;
}

/**
 * Retorna o nome da fase eliminatória com base no número de vagas/equipas.
 */
export function roundNameForSize(size: number): string {
  if (size >= 16) return 'Oitavas de Final';
  if (size >= 8) return 'Quartas de Final';
  if (size >= 4) return 'Meias-Finais';
  if (size === 2) return 'Final';
  return `Ronda de ${size}`;
}

/**
 * Algoritmo Round-Robin (Sistema de Berger) com suporte a folgas (BYE).
 * @param teamIds Array com os IDs das equipas
 * @param double Boolean para definir se é ida e volta (2 voltas)
 * @returns Matriz de jornadas com os pares de jogos [homeId, awayId]
 */
export function roundRobin(
  teamIds: string[],
  double: boolean = false
): Array<Array<[string | null, string | null]>> {
  if (teamIds.length < 2) return [];

  // Cria uma cópia declarada com o tipo que aceita string ou null
  const teams: Array<string | null> = [...teamIds];

  // SE FOR ÍMPAR: adiciona um elemento null para representar a FOLGA (BYE)
  if (teams.length % 2 !== 0) {
    teams.push(null);
  }

  const numTeams = teams.length;
  const totalRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  const rounds: Array<Array<[string | null, string | null]>> = [];

  // Rotação de Berger
  for (let round = 0; round < totalRounds; round++) {
    const roundMatches: Array<[string | null, string | null]> = [];

    for (let match = 0; match < matchesPerRound; match++) {
      const home = teams[(round + match) % (numTeams - 1)];
      let away = teams[(numTeams - 1 - match + round) % (numTeams - 1)];

      // Fixa a última posição para permitir a rotação perfeita das restantes
      if (match === 0) {
        away = teams[numTeams - 1];
      }

      roundMatches.push([home, away]);
    }

    rounds.push(roundMatches);
  }

  // Se o formato for Liga a 2 voltas (ida e volta)
  if (double) {
    const secondLeg = rounds.map((r) =>
      r.map(([home, away]) => [away, home] as [string | null, string | null])
    );
    return [...rounds, ...secondLeg];
  }

  return rounds;
}

/**
 * Monta a chave de eliminatórias (Knockout) com base nas equipas fornecidas.
 */
export function knockoutDraw(teamIds: string[]): KnockoutRound[] {
  if (teamIds.length === 0) return [];

  // Calcula a próxima potência de 2 (ex: 4, 8, 16)
  let bracketSize = 2;
  while (bracketSize < teamIds.length) {
    bracketSize *= 2;
  }

  const rounds: KnockoutRound[] = [];
  let currentRoundSize = bracketSize;
  let roundOrder = 1;

  // Monta a 1.ª ronda
  const firstRoundPairs: Array<[string | null, string | null]> = [];
  const numMatches = currentRoundSize / 2;

  for (let i = 0; i < numMatches; i++) {
    const home = teamIds[i] || null;
    const away = teamIds[currentRoundSize - 1 - i] || null;
    firstRoundPairs.push([home, away]);
  }

  rounds.push({
    label: roundNameForSize(currentRoundSize),
    roundOrder,
    pairs: firstRoundPairs,
  });

  // Monta as rondas seguintes vazias para o sorteio do quadro
  while (currentRoundSize > 2) {
    currentRoundSize /= 2;
    roundOrder++;
    const nextPairs: Array<[string | null, string | null]> = [];
    for (let i = 0; i < currentRoundSize / 2; i++) {
      nextPairs.push([null, null]);
    }
    rounds.push({
      label: roundNameForSize(currentRoundSize),
      roundOrder,
      pairs: nextPairs,
    });
  }

  return rounds;
}

/**
 * Calcula o avanço de uma equipa com BYE (folga) na 1.ª ronda para a ronda seguinte.
 */
export function byeAdvance(
  currentRoundOrder: number,
  matchIndex: number,
  teamId: string
): ByeAdvanceResult {
  return {
    nextRoundOrder: currentRoundOrder + 1,
    nextIdx: Math.floor(matchIndex / 2),
    side: matchIndex % 2 === 0 ? 'home' : 'away',
    teamId,
  };
}

/**
 * Calcula a posição em que o vencedor de um jogo deve ser colocado na ronda seguinte.
 */
export function winnerAdvance(
  currentRoundOrder: number,
  matchIndex: number
): WinnerAdvanceResult {
  return {
    nextRoundOrder: currentRoundOrder + 1,
    nextIdx: Math.floor(matchIndex / 2),
    side: matchIndex % 2 === 0 ? 'home' : 'away',
  };
}
