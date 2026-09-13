// Overwrites a small, hand-picked set of landmark rows within the day-trip
// cities (already bulk-imported Korean-only by
// import-tourapi-daytrip-cities.ts) with clean English name/description —
// the reason for a separate pass: KorService2 is Korean-only (see
// import-tourapi.ts header — EngService2 is a *separate* catalog with no ID
// crosswalk to it), and a bulk `arrange=Q` pull of 15/category per city
// mostly surfaces long-tail restaurants/campgrounds rather than the handful
// of actual landmarks the city-day-trips theme's copy already references
// (Haeundae, Gamcheon, Jagalchi, Bulguksa, Seokguram…) — those were fetched
// individually via searchKeyword2 instead (real contentId/coordinates/photo,
// English copy written by hand, same as every other theme this session).
//
// Run with: npx tsx scripts/curate-daytrip-landmarks.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Landmark = {
  slug: string;
  name: string;
  nameKo: string;
  category: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  photoUrl: string;
  description: string;
  swatch: [string, string];
};

const LANDMARKS: Landmark[] = [
  // Busan
  { slug: 'haeundae-beach-126081', name: 'Haeundae Beach', nameKo: '해운대해수욕장', category: 'Attraction', neighborhood: 'Haeundae', city: 'Busan', lat: 35.1590840227225, lng: 129.160278564827, photoUrl: 'https://tong.visitkorea.or.kr/cms/resource/34/3090534_image2_1.jpg', description: "Busan's iconic mile-long white-sand beach, backed by a skyline of high-rises. The city's summer center of gravity, and a lively boardwalk year-round.", swatch: ['#2f4858', '#5b7a99'] },
  { slug: 'gamcheon-culture-village-1997221', name: 'Gamcheon Culture Village', nameKo: '감천문화마을', category: 'Culture', neighborhood: 'Saha', city: 'Busan', lat: 35.0974606978369, lng: 129.010596996534, photoUrl: 'https://tong.visitkorea.or.kr/cms/resource/91/3365491_image2_1.jpg', description: "A hillside maze of pastel houses cascading down toward the sea. Once one of Busan's poorest neighborhoods, now an open-air art village nicknamed Korea's \"Machu Picchu\" for its terraced skyline.", swatch: ['#5a1f4a', '#c2569b'] },
  { slug: 'jagalchi-market-132190', name: 'Jagalchi Market', nameKo: '자갈치시장', category: 'Shopping', neighborhood: 'Jung', city: 'Busan', lat: 35.0966511661, lng: 129.0306042201, photoUrl: 'http://tong.visitkorea.or.kr/cms/resource/13/2941313_image2_1.jpg', description: "Korea's largest seafood market, a Busan institution since the 1950s. Pick a live catch from the tanks downstairs and have it sliced or grilled for you on the spot upstairs.", swatch: ['#5b6f9c', '#8fb0c0'] },
  // Gyeongju
  { slug: 'bulguksa-temple-126166', name: 'Bulguksa Temple', nameKo: '불국사', category: 'Culture', neighborhood: 'Gyeongju', city: 'Gyeongju', lat: 35.7923023161, lng: 129.3317253913, photoUrl: 'https://tong.visitkorea.or.kr/cms/resource/70/3506170_image2_1.jpg', description: 'An 8th-century Silla-dynasty Buddhist temple and UNESCO World Heritage Site (inscribed 1995). Its stone bridges and pagodas are considered among the finest examples of Korean temple architecture.', swatch: ['#5a1f4a', '#c2569b'] },
  { slug: 'seokguram-grotto-126216', name: 'Seokguram Grotto', nameKo: '석굴암', category: 'Culture', neighborhood: 'Gyeongju', city: 'Gyeongju', lat: 35.7952411789, lng: 129.3504717269, photoUrl: 'https://tong.visitkorea.or.kr/cms/resource/69/3581269_image2_1.jpg', description: 'A granite hermitage holding a serene seated Buddha statue overlooking the East Sea, UNESCO-listed alongside Bulguksa. A short bus ride up Tohamsan mountain from the temple.', swatch: ['#5a1f4a', '#c2569b'] },
  { slug: 'daereungwon-tomb-complex-1492402', name: 'Daereungwon Tomb Complex', nameKo: '대릉원', category: 'Attraction', neighborhood: 'Gyeongju', city: 'Gyeongju', lat: 35.8382, lng: 129.2128, photoUrl: 'https://tong.visitkorea.or.kr/cms/resource/71/4056771_image2_1.jpg', description: 'A park of grass-covered royal burial mounds from the Silla kingdom, right in the middle of the city. Walking paths wind between tombs you can get right up close to, including Cheonmachong, the one open to enter.', swatch: ['#2f4858', '#5b7a99'] },
  // Jeonju
  { slug: 'jeonju-hanok-village-264284', name: 'Jeonju Hanok Village', nameKo: '전주한옥마을', category: 'Attraction', neighborhood: 'Jeonju', city: 'Jeonju', lat: 35.8182727649, lng: 127.1536126138, photoUrl: 'https://tong.visitkorea.or.kr/cms/resource_photo/67/3516667_1.jpg', description: "Roughly 700 traditional hanok houses packed into one walkable district, Korea's best-preserved historic neighborhood and the reason most people visit Jeonju at all.", swatch: ['#2f4858', '#5b7a99'] },
  { slug: 'jeonju-hyanggyo-147684', name: 'Jeonju Hyanggyo', nameKo: '전주향교', category: 'Culture', neighborhood: 'Jeonju', city: 'Jeonju', lat: 35.8129451491, lng: 127.1565360613, photoUrl: 'http://tong.visitkorea.or.kr/cms/resource/14/3533014_image2_1.jpg', description: 'A centuries-old Confucian academy inside the hanok village. Its courtyard of gingko and plum trees is one of the quietest, most photogenic corners once the main streets fill up.', swatch: ['#5a1f4a', '#c2569b'] },
  { slug: 'jeonju-nambu-market-132326', name: 'Jeonju Nambu Market', nameKo: '전주 남부시장', category: 'Shopping', neighborhood: 'Jeonju', city: 'Jeonju', lat: 35.8128283393, lng: 127.1475535303, photoUrl: 'http://tong.visitkorea.or.kr/cms/resource/35/3428535_image2_1.jpg', description: "A working traditional market by day; its \"Youth Mall\" (청년몰) alley of small stalls turns into a lively night market on weekend evenings, the real street-food alley locals actually go to.", swatch: ['#5b6f9c', '#8fb0c0'] },
  // Gangneung
  { slug: 'gyeongpo-beach-128758', name: 'Gyeongpo Beach', nameKo: '경포해수욕장', category: 'Attraction', neighborhood: 'Gangneung', city: 'Gangneung', lat: 37.8034055083, lng: 128.9102102476, photoUrl: 'https://tong.visitkorea.or.kr/cms/resource/25/4075925_image2_1.jpg', description: "Gangneung's main beach, a long, gently curving stretch backed by pine trees, with Gyeongpo Lake just behind it. Popular for a sunrise walk or a summer swim.", swatch: ['#2f4858', '#5b7a99'] },
  { slug: 'ojukheon-129784', name: 'Ojukheon', nameKo: '오죽헌', category: 'Culture', neighborhood: 'Gangneung', city: 'Gangneung', lat: 37.779138874844655, lng: 128.87966210169768, photoUrl: 'https://tong.visitkorea.or.kr/cms/resource/38/3527138_image2_1.jpg', description: 'A 15th-century hanok, birthplace of Yi I (Yulgok), one of Korea\'s most revered Confucian scholars, and his mother Shin Saimdang, a celebrated artist. Both once pictured on Korean banknotes.', swatch: ['#5a1f4a', '#c2569b'] },
  { slug: 'terarosa-coffee-factory-1950195', name: 'Terarosa Coffee Factory', nameKo: '테라로사 커피공장', category: 'Restaurant', neighborhood: 'Gangneung', city: 'Gangneung', lat: 37.6960944624, lng: 128.8918383262, photoUrl: 'http://tong.visitkorea.or.kr/cms/resource/90/3557890_image2_1.jpg', description: "A working roastery and cafe that helped put Gangneung's coffee-street scene on the map. Part factory tour, part massive cafe.", swatch: ['#7a4a2a', '#e0a05a'] },
  // Chuncheon
  { slug: 'chuncheon-myeongdong-dakgalbi-alley-264432', name: 'Chuncheon Myeongdong Dakgalbi Alley', nameKo: '춘천 명동 닭갈비 골목', category: 'Restaurant', neighborhood: 'Chuncheon', city: 'Chuncheon', lat: 37.8800898403, lng: 127.7284297351, photoUrl: 'http://tong.visitkorea.or.kr/cms/resource/43/3578143_image2_1.jpg', description: "A street of dakgalbi (spicy stir-fried marinated chicken) restaurants, Chuncheon's signature dish and the reason most day-trippers come. Order it with extra rice to fry in the leftover sauce at the end.", swatch: ['#7a4a2a', '#e0a05a'] },
  { slug: 'samaksan-lake-cable-car-2814588', name: 'Samaksan Lake Cable Car', nameKo: '춘천 삼악산 호수케이블카', category: 'Activity', neighborhood: 'Chuncheon', city: 'Chuncheon', lat: 37.8644965197, lng: 127.6913807924, photoUrl: 'http://tong.visitkorea.or.kr/cms/resource/00/3578100_image2_1.jpg', description: 'A cable car climbing Samaksan mountain over Uiam Lake, one of the longest cable car rides in Korea, with wide lake-and-mountain views from the top station.', swatch: ['#1f4d4a', '#4a9d8e'] },
  { slug: 'uiam-lake-skywalk-2605236', name: 'Uiam Lake Skywalk', nameKo: '의암호스카이워크', category: 'Attraction', neighborhood: 'Chuncheon', city: 'Chuncheon', lat: 37.8471622126, lng: 127.6799656772, photoUrl: 'http://tong.visitkorea.or.kr/cms/resource/13/2748613_image2_1.jpg', description: 'A glass-floored walkway extending out over Uiam Lake. A short, easy stop for a photo with the water visible right underfoot.', swatch: ['#2f4858', '#5b7a99'] },
];

async function main() {
  const dbRows = LANDMARKS.map((p) => ({
    slug: p.slug,
    name: p.name,
    name_ko: p.nameKo,
    category: p.category,
    neighborhood: p.neighborhood,
    city: p.city,
    address: '',
    hours: '',
    price_range: '',
    description: p.description,
    lat: p.lat,
    lng: p.lng,
    swatch: p.swatch,
    solo_ok: false,
    english_menu: false,
    price_transparent: false,
    card_ok: false,
    english_spoken: false,
    votes: {},
    photo_url: p.photoUrl,
  }));

  console.log(`Upserting ${dbRows.length} curated landmark places…`);
  const { error } = await supabase.from('places').upsert(dbRows, { onConflict: 'slug' });
  if (error) throw error;
  console.log('Done.');
}

main().catch((e) => {
  console.error('\nCuration failed:', e.message ?? e);
  process.exit(1);
});
