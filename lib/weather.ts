// Seoul weather via Open-Meteo (open-meteo.com) — free, no API key, CORS-open,
// so the client fetches it directly. Verified live for Seoul (37.5665, 126.978).
export type Weather = {
  temp: number;
  feels: number;
  humidity: number;
  code: number; // WMO weather code
  isDay: boolean;
  hi: number;
  lo: number;
};

const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978' +
  '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day' +
  '&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=1';

// Weather changes slowly; cache for 10 min so re-entering Explore doesn't refetch.
let cache: { at: number; data: Weather } | null = null;

export async function fetchSeoulWeather(): Promise<Weather> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.data;
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const j = await res.json();
  const data: Weather = {
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    humidity: Math.round(j.current.relative_humidity_2m),
    code: j.current.weather_code,
    isDay: j.current.is_day === 1,
    hi: Math.round(j.daily.temperature_2m_max[0]),
    lo: Math.round(j.daily.temperature_2m_min[0]),
  };
  cache = { at: Date.now(), data };
  return data;
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
