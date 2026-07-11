// Supabase Edge Function: seoul-weather
// Proxies the KMA (기상청) short- + mid-term forecast APIs and returns the app's
// Weather JSON. The data.go.kr service key stays server-side (it's shared with
// TourAPI, so it must never ship in the client bundle). KOGL Type-1 license →
// commercial use OK with attribution ("기상청").
//
// Deploy (per project):
//   supabase functions deploy seoul-weather --no-verify-jwt --project-ref <REF>
//   supabase secrets set KMA_SERVICE_KEY=<data.go.kr key> --project-ref <REF>
//
// Endpoints used (VilageFcstInfoService_2.0 / MidFcstInfoService):
//   getUltraSrtNcst (current) · getVilageFcst (hourly + near daily)
//   getMidTa + getMidLandFcst (days +4..+7)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const KEY = Deno.env.get('KMA_SERVICE_KEY') ?? '';
const NX = 60, NY = 127;          // Seoul grid
const REG_TA = '11B10101';        // 서울 중기기온 구역
const REG_LAND = '11B00000';      // 서울·인천·경기 중기육상 구역
const SHORT = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
const MID = 'https://apis.data.go.kr/1360000/MidFcstInfoService';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

// KST clock as a UTC-shifted Date so getUTC* reads Seoul wall time.
const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000);
const ymd = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
const hm = (d: Date) => `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;

function shortBase() {
  const n = kstNow();
  const cur = hm(n);
  for (const s of ['2300', '2000', '1700', '1400', '1100', '0800', '0500', '0200']) {
    if (cur >= String(Number(s) + 10).padStart(4, '0')) return { date: ymd(n), time: s };
  }
  return { date: ymd(new Date(n.getTime() - 86400000)), time: '2300' };
}
function ncstBase() {
  const n = new Date(kstNow().getTime() - 60 * 60000);
  return { date: ymd(n), time: `${String(n.getUTCHours()).padStart(2, '0')}00` };
}
function midTmFc() {
  const n = kstNow();
  const h = n.getUTCHours();
  if (h >= 18) return `${ymd(n)}1800`;
  if (h >= 6) return `${ymd(n)}0600`;
  return `${ymd(new Date(n.getTime() - 86400000))}1800`;
}

async function jget(url: string) {
  const r = await fetch(url);
  const t = await r.text();
  return JSON.parse(t);
}
// deno-lint-ignore no-explicit-any
const items = (j: any) => j?.response?.body?.items?.item ?? [];

function toCode(sky: number, pty: number) {
  const p = Number(pty), s = Number(sky);
  if (p === 1) return 61;
  if (p === 2) return 66;
  if (p === 3) return 71;
  if (p === 4) return 80;
  if (s === 1) return 0;
  if (s === 3) return 2;
  if (s === 4) return 3;
  return 2;
}
function wfToCode(wf: string) {
  if (!wf) return 2;
  if (wf.includes('눈')) return 71;
  if (wf.includes('소나기')) return 80;
  if (wf.includes('비')) return 61;
  if (wf.includes('흐림')) return 3;
  if (wf.includes('구름많')) return 2;
  if (wf.includes('맑음')) return 0;
  return 2;
}
function feelsLike(t: number, rh: number, wind: number) {
  if (t >= 27 && rh >= 40) {
    const T = t * 9 / 5 + 32;
    const hi = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh
      - 6.83783e-3 * T * T - 5.481717e-2 * rh * rh + 1.22874e-3 * T * T * rh
      + 8.5282e-4 * T * rh * rh - 1.99e-6 * T * T * rh * rh;
    return Math.round((hi - 32) * 5 / 9);
  }
  if (t <= 10 && wind > 1.3) {
    const v = Math.pow(wind * 3.6, 0.16);
    return Math.round(13.12 + 0.6215 * t - 11.37 * v + 0.3965 * t * v);
  }
  return Math.round(t);
}

async function build() {
  const sb = shortBase(), nb = ncstBase(), tmFc = midTmFc();
  const [ncstJ, fcstJ, taJ, landJ] = await Promise.all([
    jget(`${SHORT}/getUltraSrtNcst?serviceKey=${KEY}&dataType=JSON&numOfRows=10&pageNo=1&base_date=${nb.date}&base_time=${nb.time}&nx=${NX}&ny=${NY}`),
    jget(`${SHORT}/getVilageFcst?serviceKey=${KEY}&dataType=JSON&numOfRows=1000&pageNo=1&base_date=${sb.date}&base_time=${sb.time}&nx=${NX}&ny=${NY}`),
    jget(`${MID}/getMidTa?serviceKey=${KEY}&dataType=JSON&numOfRows=10&pageNo=1&regId=${REG_TA}&tmFc=${tmFc}`).catch(() => null),
    jget(`${MID}/getMidLandFcst?serviceKey=${KEY}&dataType=JSON&numOfRows=10&pageNo=1&regId=${REG_LAND}&tmFc=${tmFc}`).catch(() => null),
  ]);

  // deno-lint-ignore no-explicit-any
  const nc: any = {};
  for (const it of items(ncstJ)) nc[it.category] = it.obsrValue;
  const curTemp = Number(nc.T1H ?? 0), curReh = Number(nc.REH ?? 0), curWsd = Number(nc.WSD ?? 0), curPty = Number(nc.PTY ?? 0);

  const fc = items(fcstJ);
  // deno-lint-ignore no-explicit-any
  const byKey: any = {};
  // deno-lint-ignore no-explicit-any
  const byDay: any = {};
  for (const it of fc) {
    const k = it.fcstDate + it.fcstTime;
    (byKey[k] ??= { date: it.fcstDate, time: it.fcstTime })[it.category] = it.fcstValue;
    const day = (byDay[it.fcstDate] ??= { pops: [] as number[] });
    if (it.category === 'TMN') day.tmin = Math.round(Number(it.fcstValue));
    if (it.category === 'TMX') day.tmax = Math.round(Number(it.fcstValue));
    if (it.category === 'POP') day.pops.push(Number(it.fcstValue));
    if (it.category === 'SKY' && it.fcstTime === '1500') day.noonSky = it.fcstValue;
    if (it.category === 'PTY' && it.fcstTime === '1500') day.noonPty = it.fcstValue;
  }

  const keysSorted = Object.keys(byKey).sort();
  const nowKey = keysSorted.find((k) => k >= nb.date + nb.time) ?? keysSorted[0];
  const curSky = byKey[nowKey]?.SKY ?? 1;
  const curCode = curPty > 0 ? toCode(1, curPty) : toCode(curSky, 0);

  const nn = kstNow();
  const nowStamp = ymd(nn) + `${String(nn.getUTCHours()).padStart(2, '0')}00`;
  const hourly = keysSorted
    .filter((k) => k >= nowStamp && byKey[k].TMP != null)
    .slice(0, 24)
    .map((k) => {
      const b = byKey[k];
      const hh = Number(b.time.slice(0, 2));
      return {
        time: `${b.date.slice(0, 4)}-${b.date.slice(4, 6)}-${b.date.slice(6, 8)}T${b.time.slice(0, 2)}:00`,
        temp: Math.round(Number(b.TMP)),
        code: toCode(b.SKY ?? 1, b.PTY ?? 0),
        rain: Number(b.POP ?? 0),
        isDay: hh >= 6 && hh < 19,
      };
    });

  // deno-lint-ignore no-explicit-any
  const daily: any[] = [];
  for (const date of Object.keys(byDay).sort()) {
    const d = byDay[date];
    if (d.tmax == null && d.tmin == null) continue;
    daily.push({
      date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
      code: d.noonPty && Number(d.noonPty) > 0 ? toCode(1, d.noonPty) : toCode(d.noonSky ?? 1, 0),
      hi: d.tmax ?? d.tmin ?? Math.round(curTemp),
      lo: d.tmin ?? d.tmax ?? Math.round(curTemp),
      rain: d.pops.length ? Math.max(...d.pops) : 0,
    });
  }
  const ta = items(taJ)[0], land = items(landJ)[0];
  if (ta && land) {
    const lastShort = daily.length ? daily[daily.length - 1].date : ymd(nn);
    for (let d = 4; d <= 7; d++) {
      const dd = new Date(nn.getTime() + d * 86400000);
      const iso = `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, '0')}-${String(dd.getUTCDate()).padStart(2, '0')}`;
      if (iso <= lastShort) continue;
      const wf = land[`wf${d}Am`] ?? land[`wf${d}`] ?? land[`wf${d}Pm`];
      const rn = Math.max(Number(land[`rnSt${d}Am`] ?? 0), Number(land[`rnSt${d}Pm`] ?? land[`rnSt${d}`] ?? 0));
      daily.push({ date: iso, code: wfToCode(wf), hi: Number(ta[`taMax${d}`] ?? 0), lo: Number(ta[`taMin${d}`] ?? 0), rain: rn });
    }
  }

  return {
    temp: Math.round(curTemp),
    feels: feelsLike(curTemp, curReh, curWsd),
    humidity: Math.round(curReh),
    code: curCode,
    isDay: nn.getUTCHours() >= 6 && nn.getUTCHours() < 19,
    hi: daily[0]?.hi ?? Math.round(curTemp),
    lo: daily[0]?.lo ?? Math.round(curTemp),
    hourly,
    daily: daily.slice(0, 7),
    source: '기상청',
  };
}

// Warm-instance cache so repeated hits don't multiply KMA calls (20 min).
let cache: { at: number; data: unknown } | null = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!KEY) return new Response(JSON.stringify({ error: 'KMA_SERVICE_KEY not set' }), { status: 500, headers: CORS });
    if (!cache || Date.now() - cache.at > 20 * 60 * 1000) {
      cache = { at: Date.now(), data: await build() };
    }
    return new Response(JSON.stringify(cache.data), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 502, headers: CORS });
  }
});
