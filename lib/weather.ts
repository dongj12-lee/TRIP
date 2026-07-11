// Seoul weather via the KMA (기상청) short- + mid-term forecast APIs, proxied by
// the `seoul-weather` Supabase Edge Function (which holds the data.go.kr key
// server-side and normalizes the response to this shape). KOGL Type-1 license →
// commercial use OK with attribution ("기상청").

export type DayForecast = {
  date: string; // ISO yyyy-mm-dd (Asia/Seoul)
  code: number;
  hi: number;
  lo: number;
  rain: number; // max precipitation probability %
};

export type HourForecast = {
  time: string; // ISO "yyyy-mm-ddTHH:00" (Asia/Seoul)
  temp: number;
  code: number;
  rain: number; // precipitation probability %
  isDay: boolean;
};

export type Weather = {
  temp: number;
  feels: number;
  humidity: number;
  code: number; // WMO weather code
  isDay: boolean;
  hi: number;
  lo: number;
  hourly: HourForecast[]; // next 24 hours from now
  daily: DayForecast[]; // forecast from today forward (up to 7 days)
  source?: string; // attribution, e.g. "기상청"
};

// Weather changes slowly; cache for 10 min so re-entering Explore doesn't refetch.
let cache: { at: number; data: Weather } | null = null;

export async function fetchSeoulWeather(): Promise<Weather> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.data;
  // Plain GET (no custom headers) so the browser skips the CORS preflight; the
  // function is deployed --no-verify-jwt and returns Access-Control-Allow-Origin.
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const res = await fetch(`${base}/functions/v1/seoul-weather`);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const w = (await res.json()) as Weather & { error?: string };
  if (w.error) throw new Error(`weather ${w.error}`);
  cache = { at: Date.now(), data: w };
  return w;
}

// "Now", "2PM", "11AM" from an hourly ISO string (Asia/Seoul).
export function hourLabel(iso: string, index: number): string {
  if (index === 0) return 'Now';
  const hh = Number(iso.slice(11, 13));
  const ampm = hh < 12 ? 'AM' : 'PM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${ampm}`;
}

// "Today"/"Tomorrow"/weekday from an ISO date, by actual calendar date (the KMA
// daily list may not start at today in the evening, so index isn't reliable).
export function dayLabel(iso: string, _index: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target.getTime() - t0.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-US', { weekday: 'short' });
}

// WMO code → a plain-English label + emoji (night-aware for clear/cloudy).
export function weatherDesc(code: number, isDay: boolean): { emoji: string; label: string } {
  const clearEmoji = isDay ? '☀️' : '🌙';
  const partlyEmoji = isDay ? '⛅' : '☁️';
  switch (true) {
    case code === 0: return { emoji: clearEmoji, label: 'Clear' };
    case code === 1: return { emoji: isDay ? '🌤️' : '🌙', label: 'Mostly clear' };
    case code === 2: return { emoji: partlyEmoji, label: 'Partly cloudy' };
    case code === 3: return { emoji: '☁️', label: 'Overcast' };
    case code === 45 || code === 48: return { emoji: '🌫️', label: 'Foggy' };
    case code >= 51 && code <= 57: return { emoji: '🌦️', label: 'Drizzle' };
    case code >= 61 && code <= 67: return { emoji: '🌧️', label: 'Rain' };
    case code >= 71 && code <= 77: return { emoji: '❄️', label: 'Snow' };
    case code >= 80 && code <= 82: return { emoji: '🌦️', label: 'Showers' };
    case code === 85 || code === 86: return { emoji: '🌨️', label: 'Snow showers' };
    case code >= 95: return { emoji: '⛈️', label: 'Thunderstorm' };
    default: return { emoji: partlyEmoji, label: 'Mild' };
  }
}

// A short, travel-useful nudge from the conditions (or null for a plain day).
export function weatherTip(w: Weather): string | null {
  const wet = (w.code >= 51 && w.code <= 67) || (w.code >= 80 && w.code <= 82) || w.code >= 95;
  const snow = (w.code >= 71 && w.code <= 77) || w.code === 85 || w.code === 86;
  if (snow) return 'Snow — dress warm 🧣';
  if (wet) return 'Umbrella weather ☔';
  if (w.feels >= 31) return 'Hot & humid — hydrate 💧';
  if (w.feels <= 0) return 'Freezing — bundle up 🧥';
  if (w.code <= 1) return 'Great day to be out ✨';
  return null;
}
