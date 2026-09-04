/**
 * Algoritmo Round-Robin (Sistema de Berger) com suporte a folgas (BYE).
 * @param teamIds Array com os IDs das equipas
 * @param double Boolean para definir se é ida e volta (2 voltas)
 * @returns Matriz de jornadas com os pares de jogos [homeId, awayId]
 */
export function roundRobin(teamIds: string[], double: boolean = false): Array<Array<[string | null, string | null]>> {
  if (teamIds.length < 2) return [];

  // Trabalha com uma cópia do array
  const teams = [...teamIds];

  // SE FOR ÍMPAR: adiciona um elemento null para representar a FOLGA (BYE)
  if (teams.length % 2 !== 0) {
    teams.push(null as any);
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
