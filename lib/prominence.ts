// Place prominence, "is this somewhere a first-time visitor should actually
// spend one of their few Seoul hours?"
//
// WHY THIS EXISTS: the catalog is ~4,000 places, but every quality signal the
// planner used to lean on is empty in practice, `rating` is null on 100% of
// rows, `like_count` > 0 on exactly one, `reviews` is 0 everywhere, and the
// crowd-voted foreigner booleans (soloOk/englishMenu/…) are all false. So for a
// brand-new user with nothing saved, scoring collapsed to "has a photo" plus
// proximity, and Gyeongbokgung Palace ranked no higher than a neighborhood
// underground shopping arcade. On a 2–3 day trip that's the difference between
// a great first visit and a wasted morning.
//
// Rather than invent per-place ratings we don't have, this file grades places
// into three tiers from things we DO know:
//   S, hand-curated canonical must-sees. Every slug below was matched against
//       the live DB and verified by category + neighborhood (many landmark
//       names collide with restaurants named after them, "N Seoul Tower" also
//       matches a bunsik shop, "Insadong" matches several eateries).
//   A, solid, tourist-facing entries: Visit Seoul-sourced (`source === 'seed'`,
//       a tourist-facing curated catalog) with the depth markers that catalog
//       fills in for real attractions, subway access, a real description, a photo.
//   B, everything else. Still fine as a meal, a coffee, or local colour, but
//       never the backbone of a day.
//
// B is not "bad", it's mostly the 1,247 Korean-TourAPI rows, which are great
// for finding a genuine neighbourhood restaurant but also include community
// centres, local libraries and municipal parks that no visitor is looking for.
import { Place } from '@/data/types';

export type Tier = 'S' | 'A' | 'B';

// Canonical Seoul must-sees. Slugs verified against the live catalog, do not
// hand-edit without re-checking the slug still resolves to the intended place.
export const S_TIER_SLUGS: ReadonlySet<string> = new Set([
  //. Palaces, shrines & historic quarters
  'vs-ENP000072', // Gyeongbokgung Palace
  'vs-ENP000295', // Changdeokgung Palace
  'vs-ENPl8f5md', // Changdeokgung Secret Garden (Huwon)
  'vs-ENP002046', // Deoksugung Palace
  'vs-ENP000297', // Changgyeonggung Palace
  'vs-ENP000507', // Jongmyo Shrine
  'vs-ENP022888', // Sungnyemun Gate (Namdaemun)
  'vs-ENP001899', // Gwanghwamun Square
  'vs-ENP000261', // Bukchon Hanok Village
  'vs-ENP000276', // Namsangol Hanok Village
  'vs-ENP037008', // Ikseon-dong Hanok Village
  'vs-ENP002121', // Samcheongdong
  'vs-ENP000080', // Insadong
  'vs-ENPz90c1l', // Ihwa Mural Village

  //. Modern landmarks & views
  'vs-ENP000036', // Namsan Seoul Tower (N Seoul Tower)
  'vs-ENP024679', // Dongdaemun Design Plaza (DDP)
  'vs-ENP021278', // Lotte World Tower
  'vs-ENPowtoyc', // Seoul Sky
  'vs-ENP026558', // Starfield Library
  'vs-ENP023496', // Seoullo 7017
  'vs-ENP002220', // Banpodaegyo Bridge Moonlight Rainbow Fountain

  //. Markets & shopping districts
  'vs-ENP000286', // Gwangjang Market
  'vs-ENP000085', // Namdaemun Market
  'vs-ENP000281', // Tongin Market
  'vs-ENP000067', // Myeongdong
  'vs-ENP009730', // Myeongdong Underground Shopping Center
  'vs-ENP029550', // Common Ground
  'vs-ENP027649', // Seongsu Handmade Shoes Street
  '신사동-가로수길-987720', // Sinsa-dong Garosugil

  //. Neighbourhoods with a real "go and wander" draw
  'vs-ENP000032', // Hongdae
  'vs-ENP002077', // Itaewon
  'vs-ENPf8bj59', // Euljiro Nogari Alley

  //. Museums & culture
  'vs-ENP000433', // The National Museum of Korea
  'vs-ENP000859', // The War Memorial of Korea
  'vs-ENP001232', // Leeum Museum of Art
  'vs-ENP001644', // National Folk Museum of Korea
  'vs-ENP004036', // Myeongdong Cathedral

  //. Parks, river & nature
  'vs-ENP000034', // Cheonggyecheon Stream
  'vs-ENP003631', // Namsan Park
  'vs-ENP001838', // Seoul Forest
  'vs-ENP002139', // Olympic Park
  'vs-ENP003968', // Banpo Hangang Park
  'vs-ENP012993', // Yeouido Hangang Park
  'vs-ENP037160', // Gyeongui Line Forest Park
  'vs-ENP000369', // Bukhansan National Park
]);

// A place earns tier A when it comes from the tourist-facing Visit Seoul
// catalog AND carries that catalog's depth markers. Those markers are only
// filled in for places it treats as real destinations, so together they're a
// usable stand-in for the prominence signal the data doesn't have.
function isTierA(p: Place): boolean {
  const hasDescription = (p.description ?? '').length >= 300;
  const hasSubway = !!p.subway;
  const hasPhoto = !!p.photoUrl;
  // `source` isn't on the Place type (it's an import-provenance column), so
  // read it defensively, absent means "not known to be Visit Seoul".
  const source = (p as unknown as { source?: string }).source;
  return source === 'seed' && hasPhoto && (hasSubway || hasDescription);
}

export function tierOf(p: Place): Tier {
  if (S_TIER_SLUGS.has(p.slug)) return 'S';
  if (isTierA(p)) return 'A';
  return 'B';
}

// Score bonus fed into the planner. Deliberately large relative to the other
// baseScore terms (a single interest match is +0.7): for a cold-start user with
// no saved places and no reactions, prominence SHOULD be the dominant signal —
// it's the only thing standing between them and a day built out of municipal
// parks. Personalisation still overtakes it once someone saves a few places
// (a saved place is +3, and a matching interest/vibe stacks on top).
export const TIER_BONUS: Record<Tier, number> = { S: 4, A: 1.5, B: 0 };

export function prominenceBonus(p: Place): number {
  return TIER_BONUS[tierOf(p)];
}

// Places that shouldn't anchor a sightseeing slot even if they score well —
// civic/among-locals facilities that turn up in the Korean-TourAPI rows and
// read as filler in an itinerary. Matched on name so it works regardless of
// how the source categorised them.
const FILLER_PATTERNS = [
  /community (centre|center)/i,
  /\bward office\b/i,
  /resident|residents'/i,
  /public library/i,
  /lifelong learning/i,
  /welfare (centre|center)/i,
  /sports (centre|center)|gymnasium/i,
  /parking lot/i,
  /사무소|주민센터|구청|도서관|복지관|체육관/,
];

export function isCivicFiller(p: Place): boolean {
  const hay = `${p.name} ${p.nameKo ?? ''}`;
  return FILLER_PATTERNS.some((re) => re.test(hay));
}
