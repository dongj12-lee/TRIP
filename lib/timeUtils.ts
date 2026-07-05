// Time helpers for the planner. Stored canonical format is 24h "HH:MM"
// (matches the seed data); everything user-facing is 12h. Part-of-day is
// DERIVED from the time so the traveler never has to pick it — that redundant
// input was removed from the stop card.

export function to12h(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h < 12 || h === 24 ? 'AM' : 'PM';
  let hour = h % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${period}`;
}

export function partOfDay(hhmm: string): string {
  if (!hhmm) return '';
  const h = Number(hhmm.split(':')[0]);
  if (Number.isNaN(h)) return '';
  const hour = h % 24;
  if (hour < 11) return 'Morning';
  if (hour < 14) return 'Midday';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
}

// Selectable times, every 30 min from early morning through late night.
// 24:00 / 24:30 render as 12:00 AM / 12:30 AM (after-midnight nightlife).
export const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let mins = 6 * 60; mins <= 25 * 60; mins += 30) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return out;
})();
