// Korean public holidays + cultural calendar dates, via the `korea-holidays`
// Supabase Edge Function (KASI 특일 정보, data.go.kr). Foreign travelers have
// no built-in sense of when Korean public holidays fall, and palaces/markets
// get packed on days like Liberation Day or Chuseok that never show up on a
// foreign visitor's own calendar — this exists to surface that before it
// surprises someone. The 24 solar terms and traditional minor dates (초복 etc.)
// carry no closures/crowds, so they're kept in a separate `notable` list and
// shown lighter in the UI rather than mixed in with real holidays.

export type Holiday = { date: string; name: string }; // date: ISO yyyy-mm-dd (Asia/Seoul)

type HolidaysResponse = { holidays: Holiday[]; notable: Holiday[] };

// Holidays for a published year don't change; cache for a day so re-entering
// Explore doesn't refetch every time.
let cache: { at: number; data: HolidaysResponse } | null = null;

async function fetchAll(): Promise<HolidaysResponse> {
  if (cache && Date.now() - cache.at < 24 * 60 * 60 * 1000) return cache.data;
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const res = await fetch(`${base}/functions/v1/korea-holidays`);
  if (!res.ok) throw new Error(`holidays ${res.status}`);
  const j = (await res.json()) as Partial<HolidaysResponse> & { error?: string };
  if (j.error) throw new Error(`holidays ${j.error}`);
  const data = { holidays: j.holidays ?? [], notable: j.notable ?? [] };
  cache = { at: Date.now(), data };
  return data;
}

export async function fetchKoreaHolidays(): Promise<Holiday[]> {
  return (await fetchAll()).holidays;
}

export async function fetchKoreaNotableDates(): Promise<Holiday[]> {
  return (await fetchAll()).notable;
}

// English label for a KASI Korean date name. Multi-day holidays (설날, 추석)
// list each date separately under the same base name.
const KO_EN: [RegExp, string][] = [
  // Public holidays
  [/제헌절/, 'Constitution Day'],
  [/삼일절/, 'Independence Movement Day'],
  [/설날/, 'Lunar New Year (Seollal)'],
  [/어린이날/, "Children's Day"],
  [/부처님/, "Buddha's Birthday"],
  [/현충일/, 'Memorial Day'],
  [/광복절/, 'Liberation Day'],
  [/추석/, 'Chuseok (Korean Thanksgiving)'],
  [/개천절/, 'National Foundation Day'],
  [/한글날/, 'Hangeul Day'],
  [/기독탄신일|성탄절/, 'Christmas'],
  [/신정|^1월\s*1일$/, "New Year's Day"],
  [/노동절/, 'Labor Day'],
  [/전국동시지방선거|대통령선거|국회의원선거/, 'National Election Day'],
  // 24절기 (24 solar terms), standard English names
  [/입춘/, 'Start of Spring'],
  [/우수/, 'Rain Water'],
  [/경칩/, 'Awakening of Insects'],
  [/춘분/, 'Spring Equinox'],
  [/청명/, 'Clear and Bright'],
  [/곡우/, 'Grain Rain'],
  [/입하/, 'Start of Summer'],
  [/소만/, 'Grain Buds'],
  [/망종/, 'Grain in Ear'],
  [/하지/, 'Summer Solstice'],
  [/소서/, 'Minor Heat'],
  [/대서/, 'Major Heat'],
  [/입추/, 'Start of Autumn'],
  [/처서/, 'End of Heat'],
  [/백로/, 'White Dew'],
  [/추분/, 'Autumn Equinox'],
  [/한로/, 'Cold Dew'],
  [/상강/, "Frost's Descent"],
  [/입동/, 'Start of Winter'],
  [/소설/, 'Minor Snow'],
  [/대설/, 'Major Snow'],
  [/동지/, 'Winter Solstice'],
  [/소한/, 'Minor Cold'],
  [/대한/, 'Major Cold'],
  // 잡절 (traditional minor dates)
  [/한식/, 'Hansik (Cold Food Day)'],
  [/단오/, 'Dano Festival'],
  [/칠석/, 'Chilseok Festival'],
  [/정월대보름/, 'Jeongwol Daeboreum (First Full Moon)'],
  [/초복/, 'Chobok (1st day of Boknal)'],
  [/중복/, 'Jungbok (2nd day of Boknal)'],
  [/말복/, 'Malbok (3rd day of Boknal)'],
];

export function holidayLabel(koreanName: string): string {
  const substitute = koreanName.includes('대체공휴일');
  const base = koreanName.replace(/\s*\(?대체공휴일\)?/g, '').trim();
  for (const [re, en] of KO_EN) {
    if (re.test(base)) return substitute ? `${en} (Substitute Holiday)` : en;
  }
  return substitute ? base || 'Substitute Holiday' : koreanName;
}

// Whole days from today (Asia/Seoul) to an ISO date, 0 or more for today/future.
function daysUntil(iso: string): number {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const todayIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  return Math.round((new Date(iso + 'T00:00:00Z').getTime() - new Date(todayIso + 'T00:00:00Z').getTime()) / 864e5);
}

export function nextHoliday(holidays: Holiday[]): (Holiday & { daysAway: number }) | null {
  const upcoming = holidays
    .map((h) => ({ ...h, daysAway: daysUntil(h.date) }))
    .filter((h) => h.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway);
  return upcoming[0] ?? null;
}
