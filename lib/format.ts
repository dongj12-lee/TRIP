// Small display-formatting helpers.

// "1 stop" / "3 stops" — pluralize a count with its noun.
export function plural(n: number, noun: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? noun : pluralForm ?? noun + 's'}`;
}

// Display a Seoul district with its "-gu" suffix ("Jongno" → "Jongno-gu"),
// matching the map picker's labels. The stored value stays the bare name so
// filter/map matching is unaffected. The "Seoul" fallback (address had no gu)
// and anything already suffixed are left as-is.
export function guLabel(neighborhood?: string): string {
  if (!neighborhood || neighborhood === 'Seoul' || /-gu$/.test(neighborhood)) return neighborhood ?? '';
  return `${neighborhood}-gu`;
}
