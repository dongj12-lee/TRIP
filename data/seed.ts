// Seed / mock data ported verbatim from source/data.jsx.
// This doubles as the initial content used to seed Supabase (see supabase/seed.sql).
import {
  Buddy, Country, Creator, ForeignerTag, ForeignerTagKey, Interest, Itinerary, Place, Post,
  Region, Theme, Tier,
} from './types';

// The filterable five — these have boolean columns and power the Explore
// "Foreigner-friendly" filter + the quick pills on place cards.
export const FOREIGNER_TAGS: ForeignerTag[] = [
  { key: 'soloOk', emoji: '🧍', label: 'Solo OK', hint: 'Order / be seated as one person', tone: 'sage' },
  { key: 'englishMenu', emoji: '📋', label: 'English menu', hint: 'An English menu is available', tone: 'gold' },
  { key: 'priceTransparent', emoji: '💸', label: 'Fair price', hint: 'No tourist markup — prices clear', tone: 'terra' },
  { key: 'cardOk', emoji: '💳', label: 'Card OK', hint: 'Foreign cards accepted', tone: 'sage' },
  { key: 'englishSpoken', emoji: '💬', label: 'English spoken', hint: 'Staff can communicate in English', tone: 'gold' },
];

// Full registry of Foreigner-Fit tags (the five above + category-specific ones).
// The place-detail checklist is built per category from this, so a museum asks
// about English audio guides while a restaurant asks about vegetarian options.
export const FIT_TAGS: Record<ForeignerTagKey, { emoji: string; label: string; hint: string }> = {
  soloOk: { emoji: '🧍', label: 'Solo OK', hint: 'Comfortable to visit / dine alone' },
  englishMenu: { emoji: '📋', label: 'English menu', hint: 'An English menu is available' },
  priceTransparent: { emoji: '💸', label: 'Fair price', hint: 'No tourist markup — prices clear' },
  cardOk: { emoji: '💳', label: 'Card OK', hint: 'Foreign cards accepted' },
  englishSpoken: { emoji: '💬', label: 'English spoken', hint: 'Staff can communicate in English' },
  vegFriendly: { emoji: '🥗', label: 'Veg-friendly', hint: 'Vegetarian / vegan options' },
  halalFriendly: { emoji: '🕌', label: 'Halal-friendly', hint: 'Halal or no-pork options' },
  laptopOk: { emoji: '💻', label: 'Laptop-friendly', hint: 'Wi-Fi, outlets, OK to linger' },
  englishInfo: { emoji: '🪧', label: 'English info', hint: 'English signage or audio guide' },
  worthIt: { emoji: '👍', label: 'Worth it', hint: 'Worth the time / ticket price' },
  photoOk: { emoji: '📸', label: 'Photos OK', hint: 'Photography allowed' },
  notCrowded: { emoji: '😌', label: 'Not too crowded', hint: 'Rarely overwhelming' },
  taxFree: { emoji: '🧾', label: 'Tax-free', hint: 'Tourist tax refund available' },
  beginnerOk: { emoji: '🌱', label: 'Beginner OK', hint: 'Fine for first-timers' },
  bookingNeeded: { emoji: '📅', label: 'Booking ahead', hint: 'Reserve before you go' },
  goodFacilities: { emoji: '🚻', label: 'Good facilities', hint: 'Clean restrooms & amenities' },
};

// Which tags a place shows, by its Visit Seoul L1 category (with a couple of
// L2 refinements for cafés/bars). Order matters — most relevant first.
const FIT_BY_CATEGORY: Record<string, ForeignerTagKey[]> = {
  Cuisine: ['soloOk', 'englishMenu', 'vegFriendly', 'halalFriendly', 'englishSpoken', 'cardOk', 'priceTransparent'],
  Shopping: ['englishSpoken', 'cardOk', 'taxFree', 'priceTransparent'],
  Culture: ['englishInfo', 'englishSpoken', 'worthIt', 'photoOk', 'notCrowded'],
  History: ['englishInfo', 'englishSpoken', 'worthIt', 'photoOk', 'notCrowded'],
  Nature: ['beginnerOk', 'goodFacilities', 'worthIt', 'notCrowded'],
  'Experience Programs': ['bookingNeeded', 'beginnerOk', 'englishSpoken', 'soloOk', 'cardOk'],
};
const FIT_DEFAULT: ForeignerTagKey[] = ['englishSpoken', 'cardOk', 'worthIt'];

export function fitTagsFor(category: string, categoryL2?: string | null): ForeignerTagKey[] {
  if (category === 'Cuisine') {
    if (categoryL2 === 'Cafes & Tea Shops') return ['soloOk', 'englishMenu', 'laptopOk', 'vegFriendly', 'englishSpoken', 'cardOk'];
    if (categoryL2 === 'Bars & Clubs') return ['soloOk', 'englishSpoken', 'cardOk', 'priceTransparent', 'notCrowded'];
  }
  return FIT_BY_CATEGORY[category] ?? FIT_DEFAULT;
}

export const POST_TYPES: Record<string, { emoji: string; label: string; tone: 'terra' | 'sage' | 'gold' | 'rose' | 'blue' }> = {
  thought: { emoji: '💭', label: 'Thought', tone: 'blue' },
  tip: { emoji: '💡', label: 'Tip', tone: 'gold' },
  route: { emoji: '🧭', label: 'Route', tone: 'terra' },
  question: { emoji: '❓', label: 'Question', tone: 'sage' },
  review: { emoji: '⭐', label: 'Review', tone: 'rose' },
};

// Real theme cover photos — reused from Visit Seoul place photography (same
// source & licence as the rest of the app), keyed for readability below.
const VS = (s: string) => `https://api.visitseoul.net/comm/getImage?${s}`;
const COVER = {
  nogari: VS('srvcId=MEDIA&parentSn=75110&fileTy=MEDIA&fileNo=2&thumbTy=M'),
  hanyakbang: VS('srvcId=MEDIA&parentSn=75106&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  starfield: VS('srvcId=MEDIA&parentSn=68359&fileTy=MEDIA&fileNo=3&thumbTy=M'),
  timesSquare: VS('srvcId=MEDIA&parentSn=72619&fileTy=MEDIA&fileNo=2&thumbTy=M'),
  gwangjang: VS('srvcId=MEDIA&parentSn=77093&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  seoullo: VS('srvcId=POST&parentSn=23965&fileTy=POSTTHUMB&fileNo=2&thumbTy=M&postTy=P'),
  nseoul: VS('srvcId=MEDIA&parentSn=72917&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  ikseon: VS('srvcId=MEDIA&parentSn=67438&fileTy=MEDIA&fileNo=2&thumbTy=M'),
  festival: VS('srvcId=MEDIA&parentSn=80349&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  namdaemun: VS('srvcId=POST&parentSn=86&fileTy=POSTTHUMB&fileNo=3&thumbTy=M&postTy=P'),
  ddp: VS('srvcId=MEDIA&parentSn=68048&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  seoulsky: VS('srvcId=MEDIA&parentSn=60813&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  deoksugung: VS('srvcId=MEDIA&parentSn=68276&fileTy=MEDIA&fileNo=2&thumbTy=M'),
  insadong: VS('srvcId=MEDIA&parentSn=16041&fileTy=MEDIA&fileNo=2&thumbTy=M'),
  cheonggye: VS('srvcId=POST&parentSn=28368&fileTy=POSTTHUMB&fileNo=1&thumbTy=M&postTy=P'),
  gyeonguiForest: VS('srvcId=MEDIA&parentSn=72516&fileTy=MEDIA&fileNo=2&thumbTy=M'),
  tteokbokki: VS('srvcId=MEDIA&parentSn=60579&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  banpo: VS('srvcId=POST&parentSn=16406&fileTy=POSTTHUMB&fileNo=3&thumbTy=M&postTy=P'),
  brewery: VS('srvcId=POST&parentSn=36996&fileTy=POSTTHUMB&fileNo=1&thumbTy=M&postTy=P'),
  gyeongbok: VS('srvcId=POST&parentSn=73&fileTy=POSTTHUMB&fileNo=6&thumbTy=M&postTy=P'),
  sauna: VS('srvcId=MEDIA&parentSn=63365&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  bukhansan: VS('srvcId=MEDIA&parentSn=68895&fileTy=MEDIA&fileNo=1&thumbTy=M'),
};

export const THEMES: Theme[] = [
  {
    // Stops are real Visit Seoul places (vs- slugs), so this walk only
    // resolves stops when live Supabase data is loaded — matches the DB copy
    // of this theme, kept in sync manually (see supabase/themes update).
    slug: 'euljiro-after-dark', kind: 'walk', category: 'K-Content', photoUrl: COVER.nogari,
    title: 'Euljiro After Dark', subtitle: 'A local night crawl',
    kContent: 'K-Variety / K-Drama', kType: 'Variety', stops: 6, hours: '≈ 4 hrs',
    description: "The retro-industrial backstreets of Euljiro that keep showing up in Korean dramas and variety shows. Eat, drink, and wander like a local — not a tourist stuck in Myeongdong.",
    placeSlugs: ['vs-ENPf8bj59', 'vs-ENPyiaqhs', 'vs-ENP025376', 'vs-ENP000286', 'vs-ENPqlv92h', 'vs-ENP32nfdl'],
    swatch: ['#3a2c22', '#c26b4a'],
  },
  {
    slug: 'kdrama-cafe-hop', kind: 'walk', category: 'K-Content', photoUrl: COVER.hanyakbang,
    title: 'K-Drama Café Hop', subtitle: 'Where the scenes were shot',
    kContent: 'K-Drama', kType: 'Drama', stops: 2, hours: '≈ 1.5 hrs',
    description: 'Moody hidden cafés in reclaimed Euljiro workshops that drama directors keep coming back to. Recreate the scene, order what they ordered.',
    placeSlugs: ['vs-ENPyiaqhs', 'vs-ENP025376'],
    swatch: ['#5f6d53', '#a9bf94'],
  },
  {
    slug: 'olive-young-must-buys', kind: 'guide', category: 'Shopping', photoUrl: COVER.starfield,
    title: 'Olive Young Haul', subtitle: 'K-beauty everyone flies home with', badge: '💄 Shopping',
    description: "Korea's beauty mega-store, open late on every major street. Tourists get tax-free on purchases over ₩30,000 — bring your passport to the counter. These are the items that actually earn their suitcase space.",
    meta: [{ icon: 'sparkle', label: '12 picks' }, { icon: 'won', label: 'Tax-free ₩30k+' }],
    tips: [
      'Show your passport at checkout for instant tax-free over ₩30,000.',
      'Download the Olive Young app — members get extra discounts + samples.',
      'Flagship stores (Myeongdong, Gangnam) have testers and English signage.',
    ],
    items: [
      { name: 'Beauty of Joseon — Relief Sun', nameKo: '조선미녀 선크림', tag: 'Bestseller', price: '₩12,000', note: 'Lightweight rice + probiotic sunscreen. The viral one.', swatch: ['#caa05a', '#e3c25f'] },
      { name: 'COSRX Snail Mucin Essence', nameKo: '코스알엑스 스네일 96', tag: 'Cult favorite', price: '₩18,000', note: '96% snail secretion essence for glass skin.', swatch: ['#5f6d53', '#a9bf94'] },
      { name: 'Medicube Zero Pore Pads', nameKo: '메디큐브 제로모공패드', price: '₩25,000', note: 'Exfoliating toner pads — great for travel.', swatch: ['#5b6f9c', '#8fb0c0'] },
      { name: 'Anua Heartleaf Toner', nameKo: '아누아 어성초 토너', tag: 'TikTok viral', price: '₩19,000', note: 'Soothing toner for sensitive, irritated skin.', swatch: ['#7a4a2a', '#e0a05a'] },
      { name: 'Laneige Lip Sleeping Mask', nameKo: '라네즈 립 슬리핑 마스크', price: '₩22,000', note: "Overnight lip mask — easy gift, doesn't spill.", swatch: ['#c75c54', '#e3a9a0'] },
      { name: 'Mediheal sheet masks', nameKo: '메디힐 마스크팩', tag: 'Buy in bulk', price: '₩900–1,500 ea', note: "Grab a box — they're cheaper here than anywhere.", swatch: ['#3a2c22', '#caa05a'] },
    ],
    swatch: ['#c75c54', '#e3a9a0'],
  },
  {
    slug: 'daiso-finds', kind: 'guide', category: 'Shopping', photoUrl: COVER.timesSquare,
    title: 'Daiso ₩1,000 Finds', subtitle: 'Cheap souvenirs & travel hacks', badge: '🛍️ Shopping',
    description: "Korea's everything-store, where almost nothing tops ₩5,000. Equal parts souvenir goldmine and traveler's lifesaver. Fixed price tiers (₩1,000 / 2,000 / 3,000 / 5,000) — no haggling, cards accepted.",
    meta: [{ icon: 'sparkle', label: '8 picks' }, { icon: 'won', label: '₩1,000–5,000' }],
    tips: [
      'Price tiers are color-coded on the shelf label — check before the till.',
      'Biggest branches: Myeongdong (multi-floor) and Hongdae.',
      'Great for last-minute gifts: socks, masks, snacks, stationery.',
    ],
    items: [
      { name: 'Korean character socks', nameKo: '캐릭터 양말', tag: 'Souvenir', price: '₩1,000–2,000', note: 'Cheapest, lightest gift to bring home in bulk.', swatch: ['#5b6f9c', '#8fb0c0'] },
      { name: 'Hanji & traditional stationery', nameKo: '한지 문구', price: '₩2,000–5,000', note: 'Pretty notebooks, bookmarks, postcards.', swatch: ['#7a4a2a', '#e0a05a'] },
      { name: 'Travel toiletry bottles', nameKo: '여행용 공병', tag: 'Lifesaver', price: '₩1,000–3,000', note: 'Refill your Olive Young finds for carry-on.', swatch: ['#5f6d53', '#a9bf94'] },
      { name: 'Korean snacks & candy', nameKo: '과자 · 사탕', price: '₩1,000–3,000', note: 'A whole aisle of giftable snacks.', swatch: ['#caa05a', '#e3c25f'] },
      { name: 'Phone & cable accessories', nameKo: '휴대폰 액세서리', price: '₩2,000–5,000', note: 'Adapters, cables, grips — handy mid-trip.', swatch: ['#3a2c22', '#caa05a'] },
    ],
    swatch: ['#5b6f9c', '#8fb0c0'],
  },
  {
    slug: 'street-food-bucket-list', kind: 'guide', category: 'Food & Drink', photoUrl: COVER.gwangjang,
    title: 'Street Food Bucket List', subtitle: 'What to eat, where, and what it costs', badge: '🍢 Street Food',
    description: 'The pojangmacha (street cart) classics every visitor should try at least once — with the famous streets to find them, what you should pay, and the rookie mistakes to avoid.',
    meta: [{ icon: 'sparkle', label: '6 must-eats' }, { icon: 'won', label: '₩1,000–5,000' }],
    tips: [
      'Most carts are CASH ONLY — carry small ₩1,000 notes.',
      'Confirm the price and quantity before you order (point at the sign).',
      "Eat at the cart — many don't allow walking off with the plate/skewer.",
      'Winter-only treats (bungeoppang, hotteok) vanish in summer.',
    ],
    items: [
      { name: 'Bungeoppang', nameKo: '붕어빵', emoji: '🐟', price: '₩1,000 (2–3 pcs)', where: 'Winter carts citywide', note: 'Fish-shaped pastry filled with sweet red bean (or custard).', caution: 'Winter only · cash · confirm pieces-per-price.' },
      { name: 'Tteokbokki', nameKo: '떡볶이', emoji: '🌶️', price: '₩3,000–4,000', where: 'Sindang Tteokbokki Town', note: 'Chewy rice cakes in sweet-spicy gochujang sauce.', caution: 'Spicier than it looks — ask for 안 맵게 (mild).' },
      { name: 'Hotteok', nameKo: '호떡', emoji: '🥞', price: '₩1,500–2,000', where: 'Namdaemun Market', note: 'Griddled sweet pancake with brown-sugar syrup + nuts.', caution: 'Molten-hot filling — let it cool a few seconds!' },
      { name: 'Gimbap / Cup bap', nameKo: '컵밥', emoji: '🍱', price: '₩3,500–5,000', where: 'Noryangjin exam district', note: 'Rice + toppings in a cup — the student fuel of Seoul.', caution: 'Portions vary wildly by stall; peek before ordering.' },
      { name: 'Eomuk / Odeng', nameKo: '어묵', emoji: '🍢', price: '₩1,000 / skewer', where: 'Any cart, esp. winter', note: 'Fish-cake skewers; the warm broth is usually free.', caution: 'Keep your stick — you pay by the skewer count.' },
      { name: 'Gyeranppang', nameKo: '계란빵', emoji: '🥚', price: '₩1,500–2,000', where: 'Hongdae & Myeongdong', note: 'Fluffy oval bread baked with a whole egg inside.', caution: 'Best eaten hot off the griddle.' },
    ],
    streets: [
      { name: 'Myeongdong Street', nameKo: '명동 거리', note: 'Tourist-central; huge variety but priciest.' },
      { name: 'Gwangjang Market', nameKo: '광장시장', note: 'Classic sit-down stalls — bindaetteok, mayak gimbap.' },
      { name: 'Sindang Tteokbokki Town', nameKo: '신당동 떡볶이 골목', note: 'The home of rabokki and stir-fried tteokbokki.' },
      { name: 'Namdaemun Market', nameKo: '남대문시장', note: 'Hotteok, hairtail stew alley, old-school eats.' },
    ],
    swatch: ['#7a4a2a', '#e0a05a'],
  },
  {
    slug: 'getting-around-seoul', kind: 'guide', category: 'Getting Around', photoUrl: COVER.seoullo,
    title: 'Getting Around', subtitle: 'Subway, buses & the T-money system', badge: '🚇 Transport',
    description: 'How locals actually move around Seoul — one tap-card for everything, color-coded buses, and the unspoken rules that keep you from an awkward moment (or an overcharge).',
    meta: [{ icon: 'won', label: 'Base ₩1,500' }, { icon: 'info', label: 'Transfers free ≤30 min' }],
    tips: [
      'Buy a T-money card at any station or CU/GS25 (~₩3,000) and load cash — it works on the subway, every bus, and taxis.',
      "On buses, tag your card when boarding AND when getting off — skip the exit tap and you're charged the max fare and lose your free transfer.",
      "No eating or drinking on buses or the subway — even a coffee. It's a real rule, not just etiquette.",
      'Free transfers between subway and bus within 30 minutes (60 at night) as long as you tag on and off.',
      'Leave the pink priority seats empty for elderly, pregnant or disabled riders — even on a packed train.',
    ],
    itemsTitle: 'Modes of transport',
    items: [
      { name: 'T-money Card', nameKo: '티머니', emoji: '💳', price: 'Card ₩3,000 + load', where: 'Stations & CU/GS25', note: "One tap pays for subway, buses and taxis — and unlocks free transfers. The smartest first purchase you'll make." },
      { name: 'Subway', nameKo: '지하철', emoji: '🚇', price: '₩1,500+ base', where: 'Lines 1–9 & more', note: 'Fast, cheap, with English signs and announcements. Colour-coded by line — use a metro app.', caution: "Last trains run ~23:30–00:30 — miss it and it's a late-night taxi." },
      { name: 'City Buses', nameKo: '시내버스', emoji: '🚌', price: '₩1,500+ base', where: 'Citywide', note: 'Colour-coded: 🔵 Blue = long trunk routes, 🟢 Green = short neighbourhood hops, 🟡 Yellow = a downtown loop.', caution: 'Announcements are mostly Korean — follow the on-board route map.' },
      { name: 'Red Express Bus', nameKo: '빨간 광역버스', emoji: '🔴', price: '₩2,800+', where: 'Seoul ↔ suburbs', note: 'Wide-area commuter coaches to Gyeonggi cities — seated and highway-fast.', caution: "No large suitcases and limited standing — don't try to board with a carrier." },
      { name: 'Taxi', nameKo: '택시', emoji: '🚕', price: '₩4,800 base', where: 'Street or Kakao T app', note: 'Orange/silver = regular, black = deluxe (pricier). Call and pay cashless with the Kakao T app.', caution: 'A ~20% surcharge applies late night (00:00–04:00).' },
      { name: 'KTX & Intercity', nameKo: 'KTX·고속버스', emoji: '🚄', price: 'Varies', where: 'Seoul/Yongsan stn · express terminals', note: 'Bullet train or express bus to other cities — book KTX on Korail or at the counter.', caution: 'Sells out weeks ahead around Seollal & Chuseok holidays.' },
    ],
    streetsTitle: 'Apps to download',
    streets: [
      { name: 'Naver Map / Kakao Map', nameKo: '네이버·카카오 지도', note: 'Google Maps is limited in Korea — these give real transit & walking directions.' },
      { name: 'Kakao T', nameKo: '카카오 T', note: 'Hail and pay for taxis cashless, Uber-style.' },
      { name: 'Subway apps', nameKo: '지하철 앱', note: 'Live train times, fastest transfers and last-train alerts.' },
    ],
    swatch: ['#2f4858', '#5b7a99'],
  },
  {
    slug: 'airport-to-seoul', kind: 'guide', category: 'Getting Around', photoUrl: COVER.nseoul,
    title: 'Airport to Seoul', subtitle: 'From Incheon & Gimpo into the city', badge: '✈️ Arrival',
    description: 'Five ways to get from the airport into central Seoul — what each costs, how long it takes, and which to choose with heavy luggage or after a late-night landing.',
    meta: [{ icon: 'clock', label: '30–90 min' }, { icon: 'won', label: '₩1,500–95,000' }],
    tips: [
      'Pick up a T-money card and a SIM/eSIM right on the arrivals floor before you leave the airport.',
      'AREX express and the limousine buses are the easiest options with big luggage.',
      'Landing after midnight? Most trains and buses have stopped — plan for a taxi or an airport-area hotel.',
      'Keep a little cash for the bus even though most accept T-money.',
    ],
    itemsTitle: 'Ways into the city',
    items: [
      { name: 'AREX Express Train', nameKo: '공항철도 직통', emoji: '🚄', price: '₩11,000', where: 'Incheon T1/T2 → Seoul Stn', note: 'Non-stop, ~43 min to Seoul Station, with reserved comfy seats and luggage racks.', caution: 'Runs only ~05:20–22:50.' },
      { name: 'AREX All-Stop Train', nameKo: '공항철도 일반', emoji: '🚇', price: '₩4,000–5,000', where: 'Incheon → Hongdae/Seoul Stn', note: 'The cheapest route; stops everywhere, ~60 min, pay with T-money.', caution: 'Packed at rush hour — tough with big bags.' },
      { name: 'Airport Limousine Bus', nameKo: '공항 리무진', emoji: '🚌', price: '₩16,000–18,000', where: 'Stops near major hotels', note: 'A comfortable coach straight to many neighbourhoods, luggage stowed below.', caution: "Check your hotel's nearest stop and the last departure time." },
      { name: 'Taxi / Kakao T', nameKo: '택시', emoji: '🚕', price: '₩70,000–95,000', where: 'Incheon → city center', note: 'Door to door in ~70 min (a highway toll is included); black deluxe costs more.', caution: "Make sure the meter is on — skip touts offering 'flat fares'." },
      { name: 'Gimpo Airport', nameKo: '김포공항', emoji: '🛫', price: '₩1,500+', where: 'Subway Line 5/9 & AREX', note: 'Much closer than Incheon — the subway reaches the city in ~30 min for a normal fare.' },
    ],
    swatch: ['#1f4d4a', '#4a9d8e'],
  },
  {
    slug: 'yajang-culture', kind: 'guide', category: 'Food & Drink', photoUrl: COVER.ikseon,
    title: 'Korean Yajang Nights', subtitle: 'Open-air drinking, plastic stools & all', badge: '🍺 Culture',
    description: "Yajang (야장) is Korea's open-air drinking culture — plastic tables spilling onto the street outside pubs and markets, best from late spring through autumn. Here's how to do it like a local.",
    meta: [{ icon: 'clock', label: 'Best after 7pm' }, { icon: 'won', label: '₩4,000–20,000' }],
    tips: [
      "Yajang literally means 'night field' — outdoor tables on the street, peak season late spring to autumn.",
      'A table usually orders at least one drink plus one anju (안주, sharing food) per group.',
      'Pour for others, never yourself — and hold the bottle with two hands for elders.',
      "You pay when you leave; flag staff with a friendly '여기요!' (yeogiyo).",
      "Cash is king at market yajang — cards aren't always accepted.",
    ],
    itemsTitle: 'The yajang starter kit',
    items: [
      { name: 'Soju', nameKo: '소주', emoji: '🍾', price: '₩4,000–5,000', where: 'Every table', note: 'The classic green-bottle spirit; mix it with beer for somaek (소맥).', caution: 'Sneaky-strong — pace yourself with food and water.' },
      { name: 'Draft Beer', nameKo: '생맥주', emoji: '🍺', price: '₩4,000–6,000', where: 'Hofs & carts', note: "Ice-cold 'saeng-maekju' is the summer yajang staple." },
      { name: 'Anju (sharing food)', nameKo: '안주', emoji: '🍢', price: '₩10,000–20,000', where: 'Order with drinks', note: 'Golbaengi (sea snails), nogari (dried pollack), jokbal or fried chicken — all meant to share.', caution: 'Most spots expect at least one anju per table.' },
      { name: 'Pojangmacha', nameKo: '포장마차', emoji: '🏮', price: 'Varies', where: 'Jongno, Euljiro, markets', note: 'The orange-tented street carts — the original, most atmospheric yajang.', caution: 'Confirm prices first; a few tourist-area tents overcharge.' },
    ],
    streetsTitle: 'Where to find it',
    streets: [
      { name: 'Euljiro Nogari Alley', nameKo: '을지로 노가리골목', note: 'Retro beer alley that turns into a sea of stools after dark.' },
      { name: 'Jongno Pojangmacha Street', nameKo: '종로 포장마차 거리', note: 'Classic tented carts glowing under the city lights.' },
      { name: 'Gwangjang Market', nameKo: '광장시장', note: 'Sit-down market stalls — bindaetteok and makgeolli.' },
      { name: 'Mangwon / Yeonnam', nameKo: '망원·연남동', note: 'Younger crowd, terrace tables and craft beer.' },
    ],
    swatch: ['#5a3a1f', '#d99a4a'],
  },
  {
    slug: 'korea-festivals', kind: 'guide', category: 'Festivals', photoUrl: COVER.festival,
    title: 'Festivals Across Korea', subtitle: 'Province by province, season by season', badge: '🎆 Festivals',
    description: 'Korea throws a festival for every season and region — cherry blossoms, mud, ice fishing, lanterns and fire. A by-province cheat sheet so you can time a day trip around one.',
    meta: [{ icon: 'globe', label: 'Nationwide' }, { icon: 'sparkle', label: 'Year-round' }],
    tips: [
      'Dates shift yearly with the lunar calendar and the blossoms — check the official date before you travel.',
      'Big festivals fill KTX trains and buses — book intercity tickets early.',
      "Many are strictly seasonal (spring blossoms, summer mud, winter ice) — pick by when you're visiting.",
    ],
    itemsTitle: 'Festivals by region',
    items: [
      { name: 'Jinhae Cherry Blossom (Gunhangje)', nameKo: '진해 군항제', emoji: '🌸', price: 'Spring · early Apr', where: 'Gyeongsang · Changwon', note: 'Korea\'s biggest cherry-blossom festival — tunnels of pink over rail tracks and streams.', caution: 'Insanely crowded on weekends; arrive early.' },
      { name: 'Boryeong Mud Festival', nameKo: '보령 머드축제', emoji: '🌊', price: 'Summer · Jul', where: 'Chungcheong · Boryeong', note: 'Wrestle, slide and paint in mineral mud on Daecheon Beach — the long-time foreigner favourite.', caution: 'Strong sun and big crowds — bring sunscreen and a waterproof bag.' },
      { name: 'Hwacheon Sancheoneo Ice Festival', nameKo: '화천 산천어축제', emoji: '🧊', price: 'Winter · Jan', where: 'Gangwon · Hwacheon', note: 'Ice-fishing for trout through holes in a frozen river — bare-hand catching too.', caution: 'Bitterly cold — serious winter gear required.' },
      { name: 'Andong Mask Dance Festival', nameKo: '안동 탈춤축제', emoji: '🎭', price: 'Autumn · Sep–Oct', where: 'Gyeongsang · Andong', note: 'Traditional masked dance-drama in a UNESCO hanok-village setting.' },
      { name: 'Jinju Namgang Lantern Festival', nameKo: '진주 남강유등축제', emoji: '🏮', price: 'Autumn · Oct', where: 'Gyeongsang · Jinju', note: 'Thousands of lanterns floating on the Namgang River after dark.' },
      { name: 'Jeju Fire Festival', nameKo: '제주 들불축제', emoji: '🔥', price: 'Early spring · Mar', where: 'Jeju Island', note: 'A whole hillside set ablaze under fireworks to wish for a good year.', caution: 'Weather-dependent — can be rescheduled.' },
      { name: 'Seoul Lantern Festival', nameKo: '서울 등축제', emoji: '🪔', price: 'Autumn · Nov', where: 'Seoul · Cheonggyecheon', note: 'Giant illuminated lanterns lining the downtown stream — easy to reach in the city.' },
      { name: 'Boseong Green Tea Festival', nameKo: '보성 다향대축제', emoji: '🍵', price: 'Spring · May', where: 'Jeolla · Boseong', note: 'Rolling green-tea terraces with hands-on picking and tastings.' },
    ],
    swatch: ['#5a1f4a', '#c2569b'],
  },

  // ─────────────── Essentials ───────────────
  {
    slug: 'money-in-korea', kind: 'guide', category: 'Essentials', photoUrl: COVER.namdaemun,
    title: 'Money & Payments', subtitle: 'Cards, cash, and no tipping', badge: '💳 Essentials',
    description: "Korea is almost entirely cashless, and nobody tips anywhere. A few situations still need cash — and there's real money to claim back at the airport. Here's how to pay like a local.",
    meta: [{ icon: 'won', label: 'No tipping' }, { icon: 'info', label: 'Tax-free ₩15k+' }],
    tips: [
      'Foreign Visa/Mastercard work almost everywhere — subway shops, cafés, taxis, convenience stores.',
      'Keep some cash for street-food carts, traditional markets and small pojangmacha.',
      'No tipping — not in restaurants, taxis or hotels. The listed price is the final price.',
      'Withdraw won from ATMs marked "Global" or "Foreign Card" (7-Eleven, GS25, major banks).',
      'Get an instant tax refund at the register on purchases over ₩15,000 at "Tax Free" stores — just show your passport.',
      'For bigger buys, use the tax-refund kiosks at the airport before security; keep the receipt and goods unopened.',
    ],
    swatch: ['#5b6f9c', '#8fb0c0'],
  },
  {
    slug: 'stay-connected', kind: 'guide', category: 'Essentials', photoUrl: COVER.ddp,
    title: 'Stay Connected', subtitle: 'SIM, eSIM & pocket WiFi', badge: '📶 Essentials',
    description: "Data is the first thing to sort — maps, translation and taxis all need it. Here are your options and where to grab them the moment you land.",
    meta: [{ icon: 'bolt', label: 'eSIM easiest' }, { icon: 'won', label: 'from ₩3k/day' }],
    tips: [
      'eSIM is fastest: install before you fly, activate on landing — no counter queue.',
      'Physical SIM counters (KT, SKT, LG U+) sit right on the arrivals floor at Incheon & Gimpo.',
      'Traveling as a group? A pocket-WiFi rental is cheaper to share across phones.',
      'Free WiFi is everywhere — cafés, subway stations, and public "Seoul WiFi" hotspots.',
    ],
    itemsTitle: 'Which to pick',
    items: [
      { name: 'eSIM', nameKo: '이심', emoji: '📲', price: '₩3,000–7,000/day', note: 'Buy & install online before the trip; scan a QR to go live on arrival. Keeps your home number for texts.', caution: 'Check your phone supports eSIM first.' },
      { name: 'Tourist SIM', nameKo: '유심', emoji: '📶', price: '₩5,000–8,000/day', note: 'Physical SIM from an airport counter — unlimited data, sometimes a local number.', where: 'Incheon / Gimpo arrivals' },
      { name: 'Pocket WiFi', nameKo: '포켓 와이파이', emoji: '📡', price: '~₩5,000/day', note: 'A rental hotspot for 3–5 devices — best value for families and groups.', caution: 'One more thing to charge and return.' },
    ],
    swatch: ['#2f4858', '#5b7a99'],
  },
  {
    slug: 'essential-apps', kind: 'guide', category: 'Essentials', photoUrl: COVER.seoulsky,
    title: 'Essential Apps', subtitle: 'The apps locals live by', badge: '📱 Essentials',
    description: "Google Maps barely does transit or walking directions in Korea. Download these before you go — they cover navigation, taxis, translation and trains.",
    meta: [{ icon: 'sparkle', label: '6 must-haves' }, { icon: 'won', label: 'All free' }],
    itemsTitle: 'Download before you fly',
    items: [
      { name: 'Naver Map', nameKo: '네이버 지도', emoji: '🗺️', price: 'Free', note: 'The most accurate maps + transit directions in Korea, with an English mode.' },
      { name: 'KakaoMap', nameKo: '카카오맵', emoji: '🧭', price: 'Free', note: 'The other great map app — many prefer its walking directions and indoor maps.' },
      { name: 'Papago', nameKo: '파파고', emoji: '💬', price: 'Free', note: "Naver's translator — far better at Korean than Google, with camera and voice modes." },
      { name: 'Kakao T', nameKo: '카카오 T', emoji: '🚕', price: 'Free', note: 'Hail and pay for taxis cashless, Uber-style.', caution: 'Needs a card that works in Korea for in-app payment.' },
      { name: 'Subway', nameKo: '지하철', emoji: '🚇', price: 'Free', note: 'Live train times, fastest transfers and last-train alerts (Kakao/Naver both do this).' },
      { name: 'Korail / SRT', nameKo: '코레일·SRT', emoji: '🚄', price: 'Free', note: 'Book KTX/SRT high-speed trains for day trips and other cities.' },
    ],
    swatch: ['#3a2c44', '#7a6a9c'],
  },
  {
    slug: 'korean-etiquette', kind: 'guide', category: 'Essentials', photoUrl: COVER.deoksugung,
    title: 'Etiquette & Customs', subtitle: 'Small gestures that go a long way', badge: '🙏 Essentials',
    description: "Koreans are forgiving with visitors, but a few gestures instantly mark you as a considerate guest — and help you sidestep the occasional faux pas.",
    meta: [{ icon: 'info', label: '2 hands' }, { icon: 'sparkle', label: 'No tipping' }],
    tips: [
      'Give and receive things — money, cards, gifts — with two hands (or one hand supported by the other).',
      'Take your shoes off in homes, hanok, temples and many floor-seating restaurants.',
      "Pour drinks for others, never yourself; when an elder pours for you, hold your glass with two hands.",
      'Keep your voice down on public transport, and leave the pink priority seats free.',
      "Don't plant chopsticks upright in rice — it echoes a funeral rite.",
      'Wait for the eldest at the table to start before you dig in.',
      'No tipping — offering one usually causes confusion, not delight.',
    ],
    swatch: ['#2a3225', '#79876b'],
  },
  {
    slug: 'survival-korean', kind: 'guide', category: 'Essentials', photoUrl: COVER.insadong,
    title: 'Survival Korean', subtitle: 'Ten phrases that carry you', badge: '🗣️ Essentials',
    description: "You don't need fluency — a handful of phrases and a smile unlock warmer service everywhere. Romanization on the right; tap Papago for anything else.",
    meta: [{ icon: 'sparkle', label: '10 phrases' }, { icon: 'info', label: '+ Papago' }],
    itemsTitle: 'Phrases to know',
    items: [
      { name: 'Hello', nameKo: '안녕하세요', price: 'an-nyeong-ha-se-yo', note: 'The all-purpose greeting, any time of day.' },
      { name: 'Thank you', nameKo: '감사합니다', price: 'gam-sa-ham-ni-da', note: 'Polite thanks — use it liberally.' },
      { name: 'Excuse me / Here please', nameKo: '여기요', price: 'yeo-gi-yo', note: 'Call staff over in a restaurant (totally normal, not rude).' },
      { name: 'How much is it?', nameKo: '얼마예요?', price: 'eol-ma-ye-yo', note: 'For markets and street carts without price tags.' },
      { name: 'This one, please', nameKo: '이거 주세요', price: 'i-geo ju-se-yo', note: 'Point and say it — works for anything.' },
      { name: 'Please make it mild', nameKo: '안 맵게 해주세요', price: 'an maep-ge hae-ju-se-yo', note: 'A lifesaver if you can\'t take the heat.' },
      { name: 'I can\'t eat meat', nameKo: '고기 못 먹어요', price: 'go-gi mot meo-geo-yo', note: 'For vegetarians — swap 고기 for the food you avoid.' },
      { name: 'Where is the toilet?', nameKo: '화장실 어디예요?', price: 'hwa-jang-sil eo-di-ye-yo', note: 'Self-explanatory, always useful.' },
      { name: 'Card, please', nameKo: '카드요', price: 'ka-deu-yo', note: 'Paying by card (say 현금 hyeon-geum for cash).' },
      { name: 'It\'s delicious!', nameKo: '맛있어요', price: 'ma-si-sseo-yo', note: 'The compliment every cook loves to hear.' },
    ],
    swatch: ['#7a4a2a', '#e0a05a'],
  },
  {
    slug: 'health-safety', kind: 'guide', category: 'Essentials', photoUrl: COVER.cheonggye,
    title: 'Health & Emergencies', subtitle: 'Numbers, pharmacies & the tourist hotline', badge: '🚑 Essentials',
    description: "Seoul is one of the safest big cities in the world, but it helps to know who to call and where to go if something comes up. Save these before you need them.",
    meta: [{ icon: 'info', label: '1330 · 24/7' }, { icon: 'sparkle', label: 'Very safe' }],
    tips: [
      'Dial 1330 — the free 24/7 Korea Travel Hotline, in English/Chinese/Japanese and more. They help with directions, medical, interpreting, anything.',
      'Emergencies: 119 for fire & ambulance, 112 for police.',
      'Pharmacies (약국, yakguk) handle minor ills; look for the green cross. Many staff read basic English.',
      'For a doctor, international clinics at big hospitals (Severance, Asan, Samsung) have English-speaking staff.',
      'Tap water is safe to drink, though most locals prefer bottled or filtered.',
      'Travel insurance is worth it — foreigners pay out of pocket without it.',
    ],
    swatch: ['#1f4d4a', '#4a9d8e'],
  },
  {
    slug: 'what-to-pack', kind: 'guide', category: 'Essentials', photoUrl: COVER.gyeonguiForest,
    title: 'What to Pack by Season', subtitle: 'Seoul weather, month by month', badge: '🧳 Essentials',
    description: "Korea has four sharp seasons — pack for the wrong one and you'll be miserable (or shopping for a coat). Here's what each brings and what to bring for it.",
    meta: [{ icon: 'info', label: '4 seasons' }, { icon: 'sparkle', label: 'Fall = best' }],
    itemsTitle: 'By season',
    items: [
      { name: 'Spring', nameKo: '봄 · Mar–May', emoji: '🌸', price: '5–20°C', note: 'Cherry blossoms and mild days. Layers for cool mornings.', caution: 'Yellow dust & pollen — pack a mask on hazy days.' },
      { name: 'Summer', nameKo: '여름 · Jun–Aug', emoji: '🌦️', price: '24–33°C', note: 'Hot, humid, and the July monsoon (jangma) brings heavy rain.', caution: 'Umbrella + quick-dry clothes; AC indoors is strong.' },
      { name: 'Autumn', nameKo: '가을 · Sep–Nov', emoji: '🍁', price: '8–22°C', note: 'Crisp, clear and the foliage season — most travelers\' favourite.', caution: 'Cool evenings — bring a light jacket.' },
      { name: 'Winter', nameKo: '겨울 · Dec–Feb', emoji: '❄️', price: '-10–4°C', note: 'Cold and dry with occasional snow. Heat-tech layers, gloves, a warm coat.', caution: 'Wind chill bites — cover ears and hands.' },
    ],
    swatch: ['#5f6d53', '#a9bf94'],
  },

  // ─────────────── Food & Drink ───────────────
  {
    slug: 'eating-out', kind: 'guide', category: 'Food & Drink', photoUrl: COVER.tteokbokki,
    title: 'Eating Out in Korea', subtitle: 'How to order, share & not overpay', badge: '🍽️ Food & Drink',
    description: "Korean dining has its own rhythm — free side dishes, shared mains, self-serve water and a call-button culture. Once you get it, eating out here is a joy.",
    meta: [{ icon: 'sparkle', label: 'Free banchan' }, { icon: 'won', label: 'No tipping' }],
    tips: [
      'Banchan (side dishes) are free and refillable — just ask, or point to the empty dish.',
      "Water, cups and cutlery are usually self-serve — look for the metal cutlery drawer at the table edge.",
      "Many mains are made to share and priced for 2 — great for splitting, awkward for true solo diners.",
      'Press the table call button (or say "여기요!") when you\'re ready to order — no need to wait to be noticed.',
      'Halal/vegetarian is growing: look for spots in Itaewon, and use the app\'s "Cuisine" filters.',
      'Pay at the counter on the way out, not at the table. No tip.',
    ],
    swatch: ['#7a4a2a', '#e0a05a'],
  },
  {
    slug: 'convenience-store', kind: 'guide', category: 'Food & Drink', photoUrl: COVER.banpo,
    title: 'Convenience Store Mastery', subtitle: 'The 24/7 traveler\'s best friend', badge: '🏪 Food & Drink',
    description: "GS25, CU, 7-Eleven and Emart24 are on every corner, open all night, and stocked with genuinely great cheap eats. Locals do full meals here — so can you.",
    meta: [{ icon: 'sparkle', label: 'Open 24/7' }, { icon: 'won', label: '₩1,000–5,000' }],
    itemsTitle: 'What to grab',
    items: [
      { name: 'Ramyeon (hot bar)', nameKo: '라면', emoji: '🍜', price: '₩1,300+', note: 'Buy a cup, use the in-store hot-water machine and seating. The classic move.' },
      { name: 'Gimbap & triangle kimbap', nameKo: '삼각김밥', emoji: '🍙', price: '₩1,000–3,500', note: 'Cheap, filling, everywhere. Follow the numbered wrapper to open it.' },
      { name: 'Banana milk', nameKo: '바나나맛우유', emoji: '🥛', price: '₩1,500', note: "Korea's iconic drink — try it at least once." },
      { name: 'Hot bar & corn dogs', nameKo: '핫바', emoji: '🌭', price: '₩1,500–2,500', note: 'Warm snacks by the register — grab-and-go fuel.' },
      { name: 'Yogurt / Yakult', nameKo: '요구르트', emoji: '🧃', price: '₩1,000+', note: 'Great for the humid mornings.' },
      { name: 'T-money reload & ATM', nameKo: '티머니 충전', emoji: '💳', price: '—', note: 'Top up your transit card and use the Global ATM — all under one roof.' },
    ],
    swatch: ['#1f4d4a', '#4a9d8e'],
  },
  {
    slug: 'drinking-culture', kind: 'guide', category: 'Food & Drink', photoUrl: COVER.brewery,
    title: 'Soju, Beer & Drinking Rules', subtitle: 'How Koreans actually drink', badge: '🍻 Food & Drink',
    description: "Drinking is deeply social here, with a few unspoken rules that make it fun rather than a minefield. Learn the pour, the toast, and what to order.",
    meta: [{ icon: 'sparkle', label: 'Somaek!' }, { icon: 'won', label: '₩4,000–6,000' }],
    tips: [
      'Never pour your own glass — pour for others and someone will fill yours.',
      'Pour and receive with two hands for elders; turn your head away slightly when you drink with them.',
      'Somaek (soju + beer) is the crowd-pleaser; makgeolli (rice wine) pairs with pancakes on rainy days.',
      'Anju (안주) — sharing food — is expected with drinks; most bars want at least one per table.',
      'Cheers with "건배!" (geon-bae) — glasses clink lower than an elder\'s as a sign of respect.',
      'Know your limit: rounds move fast and refusing politely ("천천히요" — slowly) is fine.',
    ],
    swatch: ['#3a2c22', '#c26b4a'],
  },

  // ─────────────── Culture ───────────────
  {
    slug: 'palaces-hanbok', kind: 'guide', category: 'Culture', photoUrl: COVER.gyeongbok,
    title: 'Palaces & Hanbok', subtitle: 'The five grand palaces — free in hanbok', badge: '👘 Culture',
    description: "Seoul's five Joseon-era palaces are its cultural heart. Rent a hanbok nearby and you walk in free — the reason every photo of Gyeongbokgung is full of colour.",
    meta: [{ icon: 'won', label: 'Free in hanbok' }, { icon: 'info', label: '₩3,000 each' }],
    tips: [
      'Wearing hanbok gets you in free at all the palaces — rental shops cluster around Gyeongbokgung & Bukchon (~₩15,000/day).',
      'Gyeongbokgung closes Tuesdays; the others (Changdeokgung, etc.) close Mondays.',
      'Catch the changing-of-the-guard ceremony at Gyeongbokgung (usually 10:00 & 14:00).',
      "Changdeokgung's Secret Garden (Huwon) is guided and ticketed separately — book ahead.",
      'The integrated palace ticket (₩10,000) covers four palaces + Jongmyo Shrine over a month.',
    ],
    itemsTitle: 'The five palaces',
    items: [
      { name: 'Gyeongbokgung', nameKo: '경복궁', emoji: '🏯', price: '₩3,000', note: 'The grandest and most famous — changing of the guard, huge grounds.' },
      { name: 'Changdeokgung', nameKo: '창덕궁', emoji: '🌳', price: '₩3,000', note: 'UNESCO-listed, home to the beautiful Secret Garden.', caution: 'Secret Garden needs a separate timed ticket.' },
      { name: 'Changgyeonggung', nameKo: '창경궁', emoji: '🌉', price: '₩1,000', note: 'Quiet and lovely, with a serene pond and greenhouse. Great at dusk.' },
      { name: 'Deoksugung', nameKo: '덕수궁', emoji: '🏛️', price: '₩1,000', note: 'A blend of Korean and Western architecture, right downtown by the stonewall walk.' },
      { name: 'Gyeonghuigung', nameKo: '경희궁', emoji: '🍃', price: 'Free', note: 'The smallest and least crowded — a peaceful escape.' },
    ],
    swatch: ['#5a1f4a', '#c2569b'],
  },
  {
    slug: 'jjimjilbang-guide', kind: 'guide', category: 'Culture', photoUrl: COVER.sauna,
    title: 'Jjimjilbang: Korean Spa', subtitle: 'How the bathhouse works', badge: '♨️ Culture',
    description: "A jjimjilbang is a Korean sauna-and-bathhouse — part spa, part social hangout, part budget overnight. Intimidating the first time; blissful once you know the ropes.",
    meta: [{ icon: 'won', label: '₩8,000–15,000' }, { icon: 'clock', label: 'Often 24h' }],
    tips: [
      'Bathing pools are gender-separated and fully nude — totally normal, nobody stares. Shower thoroughly first.',
      'The communal floors (sauna rooms, sleeping halls, snack bar) are mixed-gender — you wear the provided uniform there.',
      'They give you everything: uniform, towels, a locker. Bring nothing but yourself and cash.',
      'You can stay overnight for the entry fee — a cheap, cozy option if you miss the last train.',
      'Try a sikhye (sweet rice drink) and a baked egg from the snack bar — the classic combo.',
      'Optional add-on: a seshin (때밀이) full-body scrub — vigorous, and you\'ll feel brand new.',
    ],
    swatch: ['#5b3a52', '#b06b98'],
  },

  // ─────────────── Day Trips ───────────────
  {
    slug: 'day-trips', kind: 'guide', category: 'Day Trips', photoUrl: COVER.bukhansan,
    title: 'Day Trips from Seoul', subtitle: 'Big adventures, back by dinner', badge: '🚄 Day Trips',
    description: "Some of Korea's best sights are a short train or bus from the city. Here are five easy day trips — where they are, how to get there, and what they're for.",
    meta: [{ icon: 'clock', label: '30–90 min out' }, { icon: 'sparkle', label: '5 picks' }],
    itemsTitle: 'Where to go',
    items: [
      { name: 'DMZ & JSA', nameKo: '비무장지대', emoji: '🪖', price: 'Tour ₩50,000+', where: '~1 hr north', note: 'The tense, fascinating border with North Korea — the Third Tunnel, observatory and JSA.', caution: 'Must join a licensed tour and bring your passport; book days ahead.' },
      { name: 'Nami Island', nameKo: '남이섬', emoji: '🌲', price: 'ITX + ferry', where: '~1.5 hr (Gapyeong)', note: 'The tree-lined island of Winter Sonata fame — dreamy in autumn foliage.' },
      { name: 'Everland', nameKo: '에버랜드', emoji: '🎢', price: '₩60,000+', where: '~1 hr (Yongin)', note: "Korea's biggest theme park — coasters, a zoo, and seasonal flower festivals." },
      { name: 'Suwon Hwaseong', nameKo: '수원 화성', emoji: '🏯', price: 'Subway Line 1', where: '~1 hr south', note: 'A UNESCO fortress wall you can walk, with archery and a night market.' },
      { name: 'Incheon Chinatown', nameKo: '인천 차이나타운', emoji: '🥟', price: 'Subway Line 1', where: '~1 hr west', note: 'Jjajangmyeon\'s birthplace + the colourful Songwol-dong fairy-tale village.' },
    ],
    swatch: ['#2f4858', '#5b7a99'],
  },
];

export const PLACES: Place[] = [
  {
    slug: 'nogari-alley-manseon', lat: 37.5664, lng: 126.991,
    name: 'Nogari Alley (Manseon Hof)', nameKo: '을지로 노가리골목 (만선호프)',
    category: 'Pub / Hof', neighborhood: 'Euljiro', city: 'Seoul',
    address: '13-1 Euljiro13-gil, Jung-gu, Seoul', hours: '15:00–24:00', priceRange: '₩₩',
    rating: 4.6, reviews: 312,
    description: 'Open-air beer alley where locals down cheap draft beer with dried pollack snacks (nogari). The whole street turns into plastic-stool seating after sunset.',
    soloOk: false, englishMenu: false, priceTransparent: true, cardOk: true, englishSpoken: false,
    votes: { priceTransparent: { yes: 41, no: 0 }, cardOk: { yes: 28, no: 0 } },
    kContentTitle: 'K-Variety', kContentType: 'Variety',
    kContentNote: "The quintessential 'after-work beer' alley you've seen in countless Korean variety shows.",
    swatch: ['#3a2c22', '#c26b4a'],
  },
  {
    slug: 'eulji-myeonok', lat: 37.5645, lng: 126.9938,
    name: 'Eulji Myeonok', nameKo: '을지면옥',
    category: 'Naengmyeon (cold noodles)', neighborhood: 'Euljiro', city: 'Seoul',
    address: 'Chungmuro 14-gil, Jung-gu, Seoul', hours: '11:00–21:00', priceRange: '₩₩',
    rating: 4.7, reviews: 540,
    description: 'Legendary Pyongyang-style cold buckwheat noodles in a clean, subtle broth. A serious local institution.',
    soloOk: true, englishMenu: false, priceTransparent: true, cardOk: true, englishSpoken: false,
    votes: { soloOk: { yes: 63, no: 0 }, priceTransparent: { yes: 52, no: 0 }, cardOk: { yes: 30, no: 0 } },
    kContentTitle: 'K-Drama', kContentType: 'Drama',
    kContentNote: "A go-to 'real Seoul food' spot featured in food-focused dramas.",
    swatch: ['#4a5240', '#a9bf94'],
  },
  {
    slug: 'euljiro-coffee-hanyak', lat: 37.5668, lng: 126.9925,
    name: 'Coffee Hanyakbang', nameKo: '커피한약방',
    category: 'Cafe', neighborhood: 'Euljiro', city: 'Seoul',
    address: '16-6 Samil-daero 12-gil, Jung-gu, Seoul', hours: '10:00–21:00', priceRange: '₩₩',
    rating: 4.8, reviews: 1204,
    description: 'Hidden antique-style cafe tucked in an alley, named after an old herbal-medicine shop. Atmospheric and very photogenic.',
    soloOk: true, englishMenu: true, priceTransparent: true, cardOk: true, englishSpoken: true,
    votes: { soloOk: { yes: 88, no: 0 }, englishMenu: { yes: 71, no: 0 }, priceTransparent: { yes: 60, no: 0 }, cardOk: { yes: 44, no: 0 }, englishSpoken: { yes: 39, no: 0 } },
    kContentTitle: 'K-Drama', kContentType: 'Drama',
    kContentNote: 'The kind of moody hidden cafe that drama directors love.',
    swatch: ['#3a2c22', '#caa05a'],
  },
  {
    slug: 'gwangjang-yukhoe', lat: 37.5701, lng: 126.9999,
    name: 'Gwangjang Market — Yukhoe Alley', nameKo: '광장시장 육회골목',
    category: 'Market / Street food', neighborhood: 'Jongno', city: 'Seoul',
    address: '88 Changgyeonggung-ro, Jongno-gu, Seoul', hours: '10:00–22:00', priceRange: '₩₩',
    rating: 4.4, reviews: 2310,
    description: 'Famous market for yukhoe (beef tartare), bindaetteok, and mayak gimbap. TIP: confirm the price before you sit — some stalls overcharge tourists.',
    soloOk: true, englishMenu: true, priceTransparent: false, cardOk: true, englishSpoken: true,
    votes: { soloOk: { yes: 55, no: 0 }, englishMenu: { yes: 47, no: 0 }, cardOk: { yes: 33, no: 0 }, englishSpoken: { yes: 40, no: 0 } },
    warnTip: 'Some stalls quote inflated prices to foreigners — confirm before you sit.',
    kContentTitle: 'K-Travel', kContentType: 'Variety',
    kContentNote: 'Constantly featured in food vlogs — go for the food, watch the prices.',
    swatch: ['#7a4a2a', '#e0a05a'],
  },
  {
    slug: 'gs25-euljiro-combo', lat: 37.566, lng: 126.9915,
    name: 'GS25 Euljiro — combo stop', nameKo: 'GS25 을지로점',
    category: 'Convenience store', neighborhood: 'Euljiro', city: 'Seoul',
    address: 'Euljiro, Jung-gu, Seoul', hours: '24h', priceRange: '₩',
    rating: 4.3, reviews: 96,
    description: "Try the famous celebrity 'combos': ramyeon + triangle gimbap, or the viral cup-noodle hacks. Self-serve hot water inside.",
    soloOk: true, englishMenu: false, priceTransparent: true, cardOk: true, englishSpoken: false,
    votes: { soloOk: { yes: 33, no: 0 }, priceTransparent: { yes: 49, no: 0 }, cardOk: { yes: 51, no: 0 } },
    kContentTitle: 'K-Pop', kContentType: 'KPop',
    kContentNote: 'Recreate the convenience-store ramyeon combos idols rave about in their own content.',
    swatch: ['#8a6a1f', '#e3c25f'],
  },
  {
    slug: 'siloam-sauna', lat: 37.5556, lng: 126.9706,
    name: 'Siloam Fire Pot Sauna', nameKo: '실로암 불가마 사우나',
    category: 'Jjimjilbang', neighborhood: 'Seoul Station', city: 'Seoul',
    address: '49 Jungnim-ro, Jung-gu, Seoul', hours: '24h', priceRange: '₩₩',
    rating: 4.5, reviews: 870,
    description: 'Classic 24-hour Korean bathhouse + sauna. Foreigner-friendly, great after a long day of walking. You can even sleep over.',
    soloOk: true, englishMenu: true, priceTransparent: true, cardOk: true, englishSpoken: true,
    votes: { soloOk: { yes: 77, no: 0 }, englishMenu: { yes: 58, no: 0 }, priceTransparent: { yes: 66, no: 0 }, cardOk: { yes: 50, no: 0 }, englishSpoken: { yes: 45, no: 0 } },
    kContentTitle: 'K-Drama', kContentType: 'Drama',
    kContentNote: "That sheep-towel, sikhye-drinking jjimjilbang scene you've seen on screen — do it yourself.",
    swatch: ['#3f4a52', '#8fb0c0'],
  },
];

export const REGIONS: Region[] = [
  { key: 'asia', emoji: '🌏', label: 'Asia', hint: 'Japan, China, SE Asia…' },
  { key: 'europe', emoji: '🌍', label: 'Europe', hint: 'UK, France, Germany…' },
  { key: 'n-america', emoji: '🌎', label: 'North America', hint: 'USA, Canada, Mexico' },
  { key: 's-america', emoji: '🌎', label: 'South America', hint: 'Brazil, Argentina…' },
  { key: 'oceania', emoji: '🌏', label: 'Oceania', hint: 'Australia, NZ…' },
  { key: 'mideast', emoji: '🕌', label: 'Middle East', hint: 'UAE, Saudi, Türkiye…' },
  { key: 'africa', emoji: '🌍', label: 'Africa', hint: 'Egypt, Nigeria…' },
  { key: 'other', emoji: '✈️', label: 'Somewhere else', hint: '' },
];

export const COUNTRIES: Country[] = [
  { flag: '🇺🇸', name: 'United States' }, { flag: '🇯🇵', name: 'Japan' },
  { flag: '🇫🇷', name: 'France' }, { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇩🇪', name: 'Germany' }, { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇦🇺', name: 'Australia' }, { flag: '🇸🇬', name: 'Singapore' },
  { flag: '🇹🇭', name: 'Thailand' }, { flag: '🇧🇷', name: 'Brazil' },
  { flag: '🇲🇽', name: 'Mexico' }, { flag: '🇮🇩', name: 'Indonesia' },
];

export const INTERESTS: Interest[] = [
  { key: 'kdrama', emoji: '🎬', label: 'K-Drama' },
  { key: 'kpop', emoji: '🎤', label: 'K-Pop' },
  { key: 'kmovie', emoji: '🎞️', label: 'K-Movie' },
  { key: 'kvariety', emoji: '📺', label: 'K-Variety' },
  { key: 'kfood', emoji: '🍜', label: 'Food & Markets' },
  { key: 'kbeauty', emoji: '💄', label: 'Beauty & Skincare' },
  { key: 'history', emoji: '🏯', label: 'Palaces & Hanok' },
  { key: 'nature', emoji: '🏔️', label: 'Nature & Hiking' },
  { key: 'nightlife', emoji: '🍸', label: 'Nightlife & Bars' },
  { key: 'shopping', emoji: '🛍️', label: 'Shopping & Fashion' },
  { key: 'cafe', emoji: '☕', label: 'Café Hopping' },
  { key: 'gaming', emoji: '🎮', label: 'Webtoons & Gaming' },
];

export const TIERS: Tier[] = [
  { key: 'newcomer', label: 'Newcomer', emoji: '🌱', min: 0, blurb: 'Just landed' },
  { key: 'explorer', label: 'Explorer', emoji: '🧭', min: 100, blurb: 'Finding your way' },
  { key: 'guide', label: 'Local Guide', emoji: '📍', min: 300, blurb: 'Helping others' },
  { key: 'expert', label: 'Korea Expert', emoji: '⭐', min: 700, blurb: 'The real deal' },
];
