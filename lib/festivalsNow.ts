// Live "on now" festivals for the Festivals theme, from the festivals-now Edge
// Function (which wraps the KTO English festival API server-side). The rest of
// that theme is static seed; this is the only part that must be current, so it
// is fetched at render time rather than baked in.
export type FestivalNow = {
  title: string;
  titleKo: string;
  start: string; // "MM/DD"
  end: string;
  endsSoon: boolean;
  where: string;
  image: string;
};

export async function fetchFestivalsNow(): Promise<FestivalNow[]> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const res = await fetch(`${base}/functions/v1/festivals-now`);
  if (!res.ok) throw new Error(`festivals-now ${res.status}`);
  const json = (await res.json()) as { festivals?: FestivalNow[]; error?: string };
  if (json.error) throw new Error(json.error);
  return json.festivals ?? [];
}
