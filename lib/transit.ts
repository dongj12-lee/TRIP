// Per-leg travel estimates for the trip planner: given two consecutive stops,
// suggest how to get between them (walk / subway-bus / taxi) and roughly how
// long it takes. Two tiers:
//   1. heuristicLeg, pure math on the coordinates we already have. Always
//      available, no API, no key. Honest "estimate" (straight-line based).
//   2. Seoul transit API (data.go.kr) will later replace the `transit` tier's
//      estimate with a real route (line names, transfers, exact minutes) for
//      Seoul-area legs, see lib/transitSeoul.ts. Everything degrades to the
//      heuristic outside Seoul or if the API is unavailable, so the leg info
//      never disappears.
import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';
import { haversineKm } from './routeHealth';

export type TransitMode = 'walk' | 'transit' | 'taxi';

export type Leg = {
  mode: TransitMode;
  minutes: number; // estimated door-to-door minutes
  km: number; // straight-line distance
  detail?: string; // real route detail (Seoul API), e.g. "Line 2 → Line 3 · 1 transfer"
  source: 'estimate' | 'seoul';
};

export const MODE_META: Record<TransitMode, { emoji: string; label: string }> = {
  walk: { emoji: '🚶', label: 'Walk' },
  transit: { emoji: '🚇', label: 'Subway / bus' },
  taxi: { emoji: '🚕', label: 'Taxi' },
};

// Distance thresholds (straight-line km) for the suggested mode. Seoul is
// dense, so anything under ~1km is a pleasant walk; big cross-town hops want a
// taxi. The middle is public-transport territory.
const WALK_MAX_KM = 1.0;
const TRANSIT_MAX_KM = 6.0;

export function heuristicLeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): Leg {
  const km = haversineKm(a, b);
  let mode: TransitMode;
  let minutes: number;
  if (km <= WALK_MAX_KM) {
    mode = 'walk';
    // real walking path ~1.3x straight line, ~4.5 km/h
    minutes = ((km * 1.3) / 4.5) * 60;
  } else if (km <= TRANSIT_MAX_KM) {
    mode = 'transit';
    // access + wait overhead + ~25 km/h effective incl. stops/transfers
    minutes = 12 + ((km * 1.25) / 25) * 60;
  } else {
    mode = 'taxi';
    // short hail overhead + ~24 km/h city traffic
    minutes = 5 + ((km * 1.3) / 24) * 60;
  }
  return { mode, minutes: Math.max(1, Math.round(minutes)), km, source: 'estimate' };
}

// "~15 min" / for taxi rounds to nearest 5 to signal it's approximate.
export function formatLegMinutes(leg: Leg): string {
  if (leg.source === 'seoul') return `${Math.round(leg.minutes)} min`;
  const m = leg.minutes;
  const rounded = m >= 20 ? Math.round(m / 5) * 5 : m;
  return `~${rounded} min`;
}

// Total estimated getting-around time for a day (sum of consecutive
// coordinate-bearing hops). Null when no leg is measurable.
export function dayTravelMinutes(stops: { lat?: number; lng?: number }[]): number | null {
  let total = 0;
  let legs = 0;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) continue;
    total += heuristicLeg({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }).minutes;
    legs++;
  }
  return legs ? Math.round(total) : null;
}

// Tap-through to real turn-by-turn: Naver Map app via its documented URL
// scheme (nmap://route/{walk|public|car}, appname required, see
// guide.ncloud-docs.com "지도 앱 연동 URL Scheme"), falling back to the
// Google Maps directions URL (documented Maps URLs API) when the app isn't
// installed or we're on web. No API key involved in either.
const NMAP_PATH: Record<TransitMode, string> = { walk: 'walk', transit: 'public', taxi: 'car' };
const GMAPS_MODE: Record<TransitMode, string> = { walk: 'walking', transit: 'transit', taxi: 'driving' };
// Apple Maps URL scheme (developer.apple.com "Map Links"): ll + q to show a
// place, saddr/daddr + dirflg for a route. dirflg is d = drive, w = walk,
// r = transit. Omitting saddr makes the origin "here".
const AMAPS_DIRFLG: Record<TransitMode, string> = { walk: 'w', transit: 'r', taxi: 'd' };

// Apple rejected build 11 under Guideline 4 for routing every map action into
// a third-party app: "revise the app to give users the option to launch the
// native Apple Maps app." So every map hand-off now asks first. Naver stays
// the first option because it is meaningfully better inside Korea (transit
// routing, real-time bus, Korean addresses), but Apple Maps is always offered.
function chooseMapApp(title: string, message: string, open: (app: 'naver' | 'apple') => void): void {
  const options = ['Naver Map', 'Apple Maps', 'Cancel'];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, message, options, cancelButtonIndex: 2 },
      (i) => {
        if (i === 0) open('naver');
        if (i === 1) open('apple');
      },
    );
    return;
  }
  Alert.alert(title, message, [
    { text: 'Naver Map', onPress: () => open('naver') },
    { text: 'Apple Maps', onPress: () => open('apple') },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

// Centers the Naver Map app on a single place, no route — for "here it is"
// entry points (Explore's search-pin callout, the place detail screen) as
// opposed to openDirections below, which is turn-by-turn between two points
// for the planner's leg-by-leg routing. Naver's own app then handles
// "directions from here" using the phone's current location, so this needs
// no location permission of our own.
export function openInNaverMap(lat: number, lng: number, name: string): void {
  const appleUrl = `http://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(name)}`;
  if (Platform.OS === 'web') {
    Linking.openURL(appleUrl).catch(() => {});
    return;
  }
  chooseMapApp('Open in maps', name, (app) => {
    if (app === 'apple') {
      Linking.openURL(appleUrl).catch(() => {});
      return;
    }
    const url = `nmap://place?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}&appname=com.bada.korea`;
    // Naver Map app not installed, send to its store listing (verified IDs:
    // iOS App Store / Android Play Store).
    const storeUrl = Platform.OS === 'android'
      ? 'https://play.google.com/store/apps/details?id=com.nhn.android.nmap'
      : 'https://apps.apple.com/app/id311867728';
    Linking.openURL(url).catch(() => Linking.openURL(storeUrl).catch(() => {}));
  });
}

export async function openDirections(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  mode: TransitMode,
  fromName: string,
  toName: string,
): Promise<void> {
  const web =
    `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}` +
    `&destination=${b.lat},${b.lng}&travelmode=${GMAPS_MODE[mode]}`;
  const apple =
    `http://maps.apple.com/?saddr=${a.lat},${a.lng}&daddr=${b.lat},${b.lng}` +
    `&dirflg=${AMAPS_DIRFLG[mode]}`;
  if (Platform.OS === 'web') {
    Linking.openURL(web);
    return;
  }
  chooseMapApp('Get directions', `${fromName} → ${toName}`, async (choice) => {
    if (choice === 'apple') {
      Linking.openURL(apple).catch(() => Linking.openURL(web));
      return;
    }
    const app =
      `nmap://route/${NMAP_PATH[mode]}?slat=${a.lat}&slng=${a.lng}&sname=${encodeURIComponent(fromName)}` +
      `&dlat=${b.lat}&dlng=${b.lng}&dname=${encodeURIComponent(toName)}&appname=com.bada.korea`;
    try {
      await Linking.openURL(app); // rejects when Naver Map isn't installed
    } catch {
      Linking.openURL(web);
    }
  });
}
