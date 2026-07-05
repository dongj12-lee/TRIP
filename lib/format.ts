// Small display-formatting helpers.

// "1 stop" / "3 stops" — pluralize a count with its noun.
export function plural(n: number, noun: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? noun : pluralForm ?? noun + 's'}`;
}
