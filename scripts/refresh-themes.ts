// The Themes content-refresh pipeline (structured-manual).
//
// Most theme cards in data/seed.ts are evergreen how-to guides that never go
// stale. A handful carry time-sensitive content — trending K-beauty rankings,
// K-pop show schedules, transit fares — and each of those declares a `refresh`
// manifest (see RefreshManifest in data/types.ts): where the content comes
// from, how often it goes stale, which sections get rewritten, when it was last
// done, and the concrete research recipe.
//
// This script is the entry point that turns that into a workflow: it reads the
// manifests, works out which cards are DUE (by cadence vs lastRefreshed), and
// prints a per-card brief — targets + source + recipe — so the refresh is a
// known, repeatable procedure instead of ad-hoc recall. It only REPORTS; it
// never writes. The actual content rewrite + `npm run seed:themes` stays a
// deliberate human/Claude step (the automation level chosen for this: research
// and curation are done in-session, not by an unattended job).
//
// Typical loop, e.g. once a quarter:
//   npm run refresh:themes            # what's due, and how to do each one
//   …research + edit the named sections in data/seed.ts, bump lastRefreshed…
//   npm run seed:themes               # push to dev  (then the prod-scoped run)
//
//   npm run refresh:themes -- --all   # show every manifest, not just due ones
//   npm run refresh:themes -- --json  # machine-readable (for future tooling/CI)
import { THEMES } from '../data/seed';
import type { RefreshManifest } from '../data/types';

const CADENCE_MONTHS: Record<RefreshManifest['cadence'], number> = {
  quarterly: 3,
  seasonal: 3,
  annual: 12,
};

const showAll = process.argv.includes('--all');
const asJson = process.argv.includes('--json');

// Months elapsed between a 'YYYY-MM' stamp and now (calendar months, so a
// July→October gap reads as 3 regardless of the day).
function monthsSince(yyyyMm: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMm.trim());
  if (!m) return Number.POSITIVE_INFINITY; // malformed → treat as overdue so it surfaces
  const then = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  const now = new Date();
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
}

function addMonths(yyyyMm: string, n: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMm.trim());
  if (!m) return '????-??';
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type Entry = {
  slug: string;
  title: string;
  refresh: RefreshManifest;
  elapsed: number;
  interval: number;
  dueOn: string;
  overdueBy: number; // months past due; <=0 means not yet due
};

function main() {
  const entries: Entry[] = THEMES.filter((t) => t.refresh).map((t) => {
    const refresh = t.refresh!;
    const interval = CADENCE_MONTHS[refresh.cadence];
    const elapsed = monthsSince(refresh.lastRefreshed);
    return {
      slug: t.slug,
      title: t.title,
      refresh,
      elapsed,
      interval,
      dueOn: addMonths(refresh.lastRefreshed, interval),
      overdueBy: elapsed - interval,
    };
  });

  entries.sort((a, b) => b.overdueBy - a.overdueBy);
  const due = entries.filter((e) => e.overdueBy >= 0);

  if (asJson) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), due: due.map((e) => e.slug), entries }, null, 2));
    return;
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  console.log(`\nThemes refresh status — ${stamp}\n${'─'.repeat(48)}`);
  console.log(`${entries.length} freshness-sensitive cards · ${due.length} due now\n`);

  const printEntry = (e: Entry, dueMarker: boolean) => {
    const flag = dueMarker ? '● DUE' : '○ ok ';
    console.log(`${flag}  ${e.slug}  (${e.refresh.cadence}, last ${e.refresh.lastRefreshed}, next due ${e.dueOn})`);
    console.log(`       "${e.title}"`);
    console.log(`       targets: ${e.refresh.targets.map((s) => `“${s}”`).join(', ')}`);
    console.log(`       source:  ${e.refresh.source}`);
    if (dueMarker && e.refresh.recipe) console.log(`       recipe:  ${e.refresh.recipe}`);
    console.log('');
  };

  if (due.length) {
    console.log(`DUE NOW — refresh these, then \`npm run seed:themes\`:\n`);
    due.forEach((e) => printEntry(e, true));
  } else {
    console.log('Nothing due — every freshness-sensitive card is within its cadence. ✅\n');
  }

  if (showAll || !due.length) {
    const upcoming = entries.filter((e) => e.overdueBy < 0);
    if (upcoming.length) {
      console.log(`${'─'.repeat(48)}\nUpcoming (not yet due):\n`);
      upcoming.forEach((e) => printEntry(e, false));
    }
  } else {
    console.log(`(${entries.length - due.length} more within cadence — run with --all to see them.)`);
  }
}

main();
