// Search places beyond TRIP's own catalog via the `naver-search` Supabase Edge
// Function (which holds the Naver Local Search credentials server-side).
// Use only where the curated catalog search (lib/screener.ts) comes up short —
// results here have no description/foreigner-fit tags, just name/address/coords.

export type NaverSearchResult = {
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
};

export async function searchNaverPlaces(query: string): Promise<NaverSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const res = await fetch(`${base}/functions/v1/naver-search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`naver-search ${res.status}`);
  const json = (await res.json()) as { results?: NaverSearchResult[]; error?: string };
  if (json.error) throw new Error(`naver-search ${json.error}`);
  return json.results ?? [];
}
