// Some Visit Seoul content is time-bound (dated exhibitions, concerts, docent
// programs) that slipped into `places` through the Culture/Experience
// categories. The authoritative signal is the API's schedule end date
// (schdul_info_endde) — permanent places have none; events do. This removes
// only places whose event has already ENDED (endde < today), leaving permanent
// places and current/upcoming events untouched.
//
//   npm run prune:events            # delete expired
//   npm run prune:events -- --dry-run
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const KEY = process.env.VISITSEOUL_API_KEY!;
const DRY = process.argv.includes('--dry-run');
const supabase = createClient(SB_URL, SERVICE);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const YEAR = /\b20\d{2}\b/;
const EVENT_KW = /docent|exhibition|festival|concert|expo|\bfair\b|screening|showcase|recital|performance|solo exhibition|fan meeting|world tour|pop-?up|edition/i;

async function info(cid: string, tries = 4): Promise<any> {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch('https://api-call.visitseoul.net/api/v1/contents/info', {
        method: 'POST',
        headers: { 'VISITSEOUL-API-KEY': KEY, 'Content-Type': 'application/json;charset=UTF-8' },
        body: JSON.stringify({ cid }),
      });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      return j?.data ?? null;
    } catch (e) {
      if (t === tries - 1) return null;
      await sleep(600 * (t + 1));
    }
  }
}

// "2025.11.20" -> Date (local). Returns null if unparseable.
function parseEnd(s?: string | null): Date | null {
  if (!s) return null;
  const m = String(s).match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

async function mapLimit<T>(items: T[], limit: number, fn: (x: T, i: number) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx], idx); }
  }));
}

async function main() {
  const all: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('places').select('slug,name,category').like('slug', 'vs-%').range(from, from + 999);
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  // Candidates: event-prone categories, OR a year/event keyword in the name.
  // With --all, check every place (definitive but ~3x the API calls).
  const ALL = process.argv.includes('--all');
  const candidates = ALL
    ? all
    : all.filter((p) => p.category === 'Culture' || p.category === 'Experience Programs' || YEAR.test(p.name) || EVENT_KW.test(p.name));
  console.log(`${all.length} places, ${candidates.length} ${ALL ? '(ALL)' : 'candidates'} to check for schedule dates`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expired: { slug: string; name: string; endde: string }[] = [];
  let checked = 0;
  await mapLimit(candidates, 4, async (p) => {
    const d = await info(p.slug.slice(3));
    if (++checked % 100 === 0) console.log(`  checked ${checked}/${candidates.length}`);
    await sleep(40);
    const end = parseEnd(d?.schdul_info_endde);
    if (end && end < today) expired.push({ slug: p.slug, name: p.name, endde: d.schdul_info_endde });
  });

  console.log(`\n${expired.length} expired events found.`);
  expired.slice(0, 25).forEach((e) => console.log(`  [ended ${e.endde}] ${e.name.slice(0, 60)}`));
  if (DRY) { console.log('\n(dry run — nothing deleted)'); return; }

  const slugs = expired.map((e) => e.slug);
  for (let i = 0; i < slugs.length; i += 100) {
    const { error } = await supabase.from('places').delete().in('slug', slugs.slice(i, i + 100));
    if (error) throw error;
  }
  console.log(`\nDeleted ${slugs.length} expired-event places.`);
}

main().catch((e) => { console.error('failed:', e?.message ?? e); process.exit(1); });
