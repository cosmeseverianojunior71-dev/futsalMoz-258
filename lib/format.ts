// Utilitários de data/hora.
// Todos os horários são apresentados em hora de Maputo (Africa/Maputo = CAT, UTC+2, sem horário de verão).

export const TZ = 'Africa/Maputo';
export const CAT_OFFSET_HOURS = 2;

const fmtDateTime = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const fmtDate = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const fmtTime = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
});

const fmtDayMonth = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ,
  day: '2-digit',
  month: 'short',
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'A definir';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'A definir';
  return fmtDateTime.format(d);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return fmtDate.format(d);
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return fmtTime.format(d);
}

export function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return fmtDayMonth.format(d);
}

/**
 * Converte a data+hora locais (Maputo) do formulário para uma data UTC ISO.
 * @param date  'YYYY-MM-DD'
 * @param time  'HH:mm'
 */
export function localInputToUtcIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  if ([y, m, d, h, min].some((n) => Number.isNaN(n))) return null;
  const utcMs = Date.UTC(y, m - 1, d, h, min) - CAT_OFFSET_HOURS * 3600 * 1000;
  return new Date(utcMs).toISOString();
}

/** Devolve 'YYYY-MM-DD' e 'HH:mm' de uma data ISO, em hora de Maputo (para pré-preencher formulários). */
export function isoToLocalInput(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  // Shift para UTC+2 e extrair componentes "de parede"
  const shifted = new Date(d.getTime() + CAT_OFFSET_HOURS * 3600 * 1000);
  const date = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
  const time = `${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}`;
  return { date, time };
}

/** Normaliza uma data (string 'YYYY-MM-DD' ou ISO) para 'YYYY-MM-DD' em hora de Maputo (para inputs date). */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return '';
  const shifted = new Date(d.getTime() + CAT_OFFSET_HOURS * 3600 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

/** Indica se a data ISO é hoje (hora de Maputo). */
export function isToday(iso: string | null | undefined): boolean {
  const now = new Date();
  const today = isoToLocalInput(now.toISOString()).date;
  const d = iso ? isoToLocalInput(iso).date : '';
  return d === today && d !== '';
}
