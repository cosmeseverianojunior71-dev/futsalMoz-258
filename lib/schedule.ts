// Geração de calendários: liga (round-robin) e eliminatória.

/**
 * Round-robin (método do círculo).
 * Devolve uma lista de jornadas; cada jornada é uma lista de pares [casa, fora].
 * `double` gera a 2.ª volta com os pares invertidos.
 */
export function roundRobin(teamIds: string[], double: boolean): Array<Array<[string, string]>> {
  const ids = [...teamIds];
  const n = ids.length;
  if (n < 2) return [];
  const firstHalf: Array<Array<[string, string]>> = [];
  const fixed = ids[0];
  let rest = ids.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const line = [fixed, ...rest];
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = line[i];
      const b = line[n - 1 - i];
      // alternar casa/fora em cada jornada para equilíbrio
      if (r % 2 === 0) pairs.push([a, b]);
      else pairs.push([b, a]);
    }
    firstHalf.push(pairs);
    rest = [rest[rest.length - 1], ...rest.slice(0, rest.length - 1)];
  }

  if (!double) return firstHalf;
  const secondHalf = firstHalf.map((jornada) =>
    jornada.map(([h, a]) => [a, h] as [string, string])
  );
  return [...firstHalf, ...secondHalf];
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function roundNameForSize(size: number): string {
  if (size === 2) return 'Final';
  if (size === 4) return 'Semifinal';
  if (size === 8) return 'Quartas de final';
  if (size === 16) return 'Oitavos de final';
  return `Eliminatória (roda ${size})`;
}

export interface KnockoutRound {
  roundOrder: number;
  label: string;
  /** pares [casa, fora]; null = a definir / folga (bye) */
  pairs: Array<[string | null, string | null]>;
}

/**
 * Gera o desenho de uma eliminatória com n equipas (seed por ordem de inscrição).
 * Folgas (byes) são atribuídas às melhores posições de seed (topo da tabela/inscrição).
 */
export function knockoutDraw(seededTeamIds: string[]): KnockoutRound[] {
  const n = seededTeamIds.length;
  if (n < 2) return [];
  const P = nextPowerOfTwo(n);
  const rounds: KnockoutRound[] = [];

  // Slots da 1.ª ronda: par i = (seed i+1  vs  seed P-i); folgas ocupam o 2.º lugar do par.
  const slots: Array<string | null> = new Array(P).fill(null);
  for (let i = 0; i < P / 2; i++) {
    slots[2 * i] = seededTeamIds[i] ?? null;
    slots[2 * i + 1] = seededTeamIds[P - 1 - i] ?? null;
  }

  let size = P;
  let roundOrder = 1;
  while (size >= 2) {
    const label = roundNameForSize(size);
    const pairs: Array<[string | null, string | null]> = [];
    for (let i = 0; i < size / 2; i++) {
      if (roundOrder === 1) pairs.push([slots[2 * i], slots[2 * i + 1]]);
      else pairs.push([null, null]);
    }
    rounds.push({ roundOrder, label, pairs });
    size /= 2;
    roundOrder++;
  }
  return rounds;
}

/**
 * Preenche a ronda seguinte a partir de uma folga (bye) da ronda atual.
 * @returns [roundOrderDoProximo, idxDoProximo, lado, equipa]
 */
export function byeAdvance(
  roundOrder: number,
  matchIndexInRound: number,
  byeTeamId: string
): { nextRoundOrder: number; nextIdx: number; side: 'home' | 'away'; teamId: string } {
  return {
    nextRoundOrder: roundOrder + 1,
    nextIdx: Math.floor(matchIndexInRound / 2),
    side: matchIndexInRound % 2 === 0 ? 'home' : 'away',
    teamId: byeTeamId,
  };
}

/** Posição na ronda seguinte do vencedor do jogo indexado `matchIndexInRound`. */
export function winnerAdvance(
  roundOrder: number,
  matchIndexInRound: number
): { nextRoundOrder: number; nextIdx: number; side: 'home' | 'away' } {
  return {
    nextRoundOrder: roundOrder + 1,
    nextIdx: Math.floor(matchIndexInRound / 2),
    side: matchIndexInRound % 2 === 0 ? 'home' : 'away',
  };
}
