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

// Three meaningful kinds only. A freeform "post" is the default — it absorbs
// what used to be split across thought/tip/review, since that distinction was
// fuzzy and added posting friction. "Route" is structural (auto when a shared
// itinerary is attached); "question" is a distinct intent (expects answers).
export const POST_TYPES: Record<string, { emoji: string; label: string; tone: 'terra' | 'sage' | 'gold' | 'rose' | 'blue' }> = {
  post: { emoji: '💬', label: 'Post', tone: 'blue' },
  route: { emoji: '🧭', label: 'Route', tone: 'terra' },
  question: { emoji: '❓', label: 'Question', tone: 'sage' },
};

// Maps any stored type (including legacy thought/tip/review rows) onto the
// current three-kind model. Use wherever a post's type drives display/filtering.
export function normalizePostType(t: string | null | undefined): 'post' | 'route' | 'question' {
  return t === 'route' || t === 'question' ? t : 'post';
}

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
    title: 'Olive Young Haul', subtitle: 'The complete K-beauty playbook', badge: '💄 Shopping', updated: 'Jul 2026',
    description: "Korea's beauty mega-chain — 1,300+ stores, open till 10–11pm on every major street. This is the deep guide: what actually sells, when the big sales hit, and every hack the locals use. Prices below are regular shelf prices; during Olive Young Sale weeks most of these drop 30–50%.",
    meta: [{ icon: 'sparkle', label: '30 picks' }, { icon: 'won', label: 'Tax refund ₩15k+' }, { icon: 'clock', label: 'Sales: Mar·Jun·Sep·Dec' }],
    tips: [
      'Instant tax refund at checkout on ₩15,000+ per receipt — just show your passport. No airport paperwork.',
      'Olive Young SALE runs ~10 days each quarter (early Mar / Jun / Sep / Dec) — up to 50% off bestsellers. Plan your haul around it if you can.',
      'Download the Olive Young Global app: membership QR gets member prices, and you can check English ingredient lists + reviews by scanning barcodes.',
      "Myeongdong Town flagship (3 floors) has a Global Lounge with English-speaking staff, luggage storage, and every tester imaginable.",
      'In Seoul, stores offer same-day delivery to hotels (오늘드림) — buy heavy hauls early, travel light all day.',
      'The December Olive Young Awards list = the definitive bestseller bible. Awards-sticker items are safe blind buys.',
      'Myeongdong branches are packed 7–10pm; mornings are calm and testers are clean.',
    ],
    sections: [
      {
        title: '🔥 Trending right now',
        subtitle: 'Currently topping Olive Young\'s own ranking + Glowpick — reflects Jul 2026, rotates a few times a year',
        items: [
          { name: 'Anua PDRN Hyaluronic Capsule 100 Serum', nameKo: '아누아 PDRN 히알루론산 캡슐 100 세럼', tag: '#1 serum', price: '₩39,000 (often ~₩22,500 on promo)', note: 'The single best-selling serum on both Olive Young\'s own ranking and the Hwahae app right now. Salmon-DNA-derived PDRN + 11 types of hyaluronic acid — the ingredient of the moment for uneven tone and post-blemish marks.', swatch: ['#5b6f9c', '#8fb0c0'] },
          { name: 'Goodal Houttuynia Cordata Calming Sun Cream', nameKo: '구달 맑은 어성초 진정 수분 선크림', tag: 'Top 3 sunscreen', price: '₩17,000', note: 'A long-running Glowpick top-3 pick, not a flash trend — calming, lightweight, layers cleanly under makeup.', swatch: ['#a9bf94', '#5f6d53'] },
          { name: 'Mediheal Madecassoside Sun Serum', nameKo: '메디힐 마데카소사이드 수분 선세럼 흔적리페어', tag: 'Glowpick #1 sunscreen', price: '₩18,000', note: 'Currently the #1-voted sunscreen on Glowpick — serum texture, marketed on scar/mark repair alongside SPF.', swatch: ['#dbe7ee', '#8fb0c0'] },
          { name: 'TIRTIR Mask Fit Red Cushion', nameKo: '티르티르 마스크 핏 레드 쿠션', tag: 'Global viral hit', price: '₩24,000 (18g)', note: '20 shades, buildable full coverage — the cushion that blew up internationally on social media and now sits on Olive Young\'s own bestseller shelf.', swatch: ['#c75c54', '#e3a9a0'] },
          { name: 'HERA Black Cushion', nameKo: '헤라 블랙 쿠션', tag: 'Premium #1', price: '₩62,000 (main + refill, 9 shades)', note: 'The current #1 in the premium cushion tier — glow finish, the one Korean office workers actually splurge on.', swatch: ['#3a2c22', '#caa05a'] },
        ],
      },
      {
        title: '☀️ Suncare — the #1 haul category',
        subtitle: 'Korean sunscreens are why people fly here',
        items: [
          { name: 'Beauty of Joseon — Relief Sun', nameKo: '조선미녀 맑은쌀 선크림', tag: 'All-time bestseller', price: '₩18,000', note: 'Rice + probiotics, zero white cast, dewy finish. THE viral one — often purchase-limited during sales.', swatch: ['#caa05a', '#e3c25f'] },
          { name: 'skin1004 Hyalu-Cica Water-Fit Sun Serum', nameKo: '스킨1004 히알루시카 선세럼', tag: 'Awards winner', price: '₩19,000', note: 'Serum-texture SPF50+ that layers under makeup without pilling.', swatch: ['#5f6d53', '#a9bf94'] },
          { name: 'Round Lab Birch Juice Moisturizing Sun Cream', nameKo: '라운드랩 자작나무 선크림', price: '₩17,000', note: 'Hydrating daily SPF for dry/sensitive skin — dermatologist favorite.', swatch: ['#8fb0c0', '#dbe7ee'] },
          { name: 'Isntree Hyaluronic Acid Airy Sun Stick', nameKo: '이즈앤트리 에어리 선스틱', price: '₩16,000', note: 'Stick format for reapplying over makeup — perfect for a walking-heavy trip.', swatch: ['#c8b88a', '#efe2c0'] },
        ],
      },
      {
        title: '💧 Skincare icons',
        subtitle: 'The essences and serums with global cult followings',
        items: [
          { name: 'COSRX Advanced Snail 96 Mucin Essence', nameKo: '코스알엑스 스네일 96', tag: 'Cult classic', price: '₩18,000', note: '96% snail secretion for the glass-skin look. Cheaper here than anywhere on earth.', swatch: ['#5f6d53', '#a9bf94'] },
          { name: 'Anua Heartleaf 77% Soothing Toner', nameKo: '아누아 어성초 77 토너', tag: 'TikTok viral', price: '₩19,000', note: 'Calms redness and irritated skin — the gateway Anua product.', swatch: ['#7a4a2a', '#e0a05a'] },
          { name: 'Torriden DIVE-IN Serum', nameKo: '토리든 다이브인 세럼', tag: 'Awards winner', price: '₩16,000', note: '5-molecule hyaluronic hydration bomb. Korea\'s #1 serum multiple years running.', swatch: ['#5b6f9c', '#8fb0c0'] },
          { name: 'Mixsoon Bean Essence', nameKo: '믹순 콩에센스', price: '₩22,000', note: 'Fermented soybean essence — the “skin flooding” trend hero.', swatch: ['#caa05a', '#e3c25f'] },
          { name: 'Medicube Zero Pore Pads 2.0', nameKo: '메디큐브 제로모공패드', price: '₩25,000', note: 'Exfoliating toner pads; travel-friendly jar. Pairs with their viral booster devices.', swatch: ['#c75c54', '#e3a9a0'] },
        ],
      },
      {
        title: '🎭 Masks & overnight care',
        items: [
          { name: 'Biodance Bio-Collagen Real Deep Mask', nameKo: '바이오던스 콜라겐 마스크', tag: 'Sold-out famous', price: '₩4,000 ea', note: 'Overnight hydrogel that turns transparent when done. The current it-mask — grab multipacks.', swatch: ['#dbe7ee', '#8fb0c0'] },
          { name: 'Mediheal sheet masks', nameKo: '메디힐 마스크팩', tag: 'Buy in bulk', price: '₩900–1,500 ea', note: 'Box of 10 costs less than 3 masks abroad. Tea tree + collagen are the safe picks.', swatch: ['#3a2c22', '#caa05a'] },
          { name: 'Abib Gummy Sheet Mask', nameKo: '아비브 껌딱지 마스크', price: '₩3,500 ea', note: 'Sticks like gum so you can walk around while it works. Heartleaf for calming.', swatch: ['#a9bf94', '#5f6d53'] },
          { name: 'Laneige Lip Sleeping Mask', nameKo: '라네즈 립 슬리핑 마스크', tag: 'Gift favorite', price: '₩22,000', note: "Berry overnight lip mask — the easiest gift in the store, doesn't spill.", swatch: ['#c75c54', '#e3a9a0'] },
        ],
      },
      {
        title: '💄 Makeup that flies home',
        items: [
          { name: "rom&nd Juicy Lasting Tint", nameKo: '롬앤 쥬시 래스팅 틴트', tag: 'Bestseller', price: '₩9,900', note: 'Glassy water-tint in 20+ shades. #06 Figfig is the eternal top seller.', swatch: ['#c75c54', '#e3a9a0'] },
          { name: 'Peripera Ink the Velvet', nameKo: '페리페라 잉크더벨벳', price: '₩9,000', note: 'Weightless matte lip stain — K-drama lips in one swipe.', swatch: ['#b0466a', '#e084a0'] },
          { name: 'CLIO Kill Cover Mesh Glow Cushion', nameKo: '클리오 킬커버 쿠션', price: '₩32,000', note: 'The cushion foundation to try if you\'ve never used one. Testers at every counter.', swatch: ['#c8b88a', '#efe2c0'] },
          { name: 'MUZIGAE MANSION Objet Liquid', nameKo: '무지개맨션 오브제 리퀴드', tag: 'Trendy', price: '₩17,000', note: 'Matte liquid lip in gallery-worthy packaging — Gen-Z Seoul in a bottle.', swatch: ['#5b6f9c', '#8fb0c0'] },
        ],
      },
      {
        title: '🧴 Hair, body & cleansing',
        items: [
          { name: "Ma:nyo Pure Cleansing Oil", nameKo: '마녀공장 클렌징 오일', tag: 'Awards winner', price: '₩15,000', note: 'Korea\'s #1 first-cleanser. Dissolves sunscreen without stripping.', swatch: ['#caa05a', '#e3c25f'] },
          { name: 'mise-en-scène Perfect Serum', nameKo: '미쟝센 퍼펙트세럼', price: '₩9,000', note: 'Argan hair serum — salon gloss for convenience-store money.', swatch: ['#7a4a2a', '#e0a05a'] },
          { name: 'KUNDAL Honey & Macadamia Shampoo', nameKo: '쿤달 샴푸', price: '₩9,900', note: 'Cult perfumed shampoo; cherry blossom scent sells out first.', swatch: ['#a9bf94', '#5f6d53'] },
          { name: 'ILLIYOON Ceramide Ato Lotion', nameKo: '일리윤 세라마이드 로션', price: '₩13,000', note: 'Family-size body lotion for eczema-prone skin — pharmacist recommended.', swatch: ['#dbe7ee', '#8fb0c0'] },
        ],
      },
      {
        title: '📅 Sale calendar & events',
        subtitle: 'Time your haul — the discounts are real',
        items: [
          { name: 'Olive Young SALE (quarterly)', nameKo: '올영세일', tag: 'Up to 50%', price: 'Mar · Jun · Sep · Dec', note: '~10 days at the start of each quarter-month. Suncare and masks hit their yearly lows; popular items sell out by evening.', emoji: '🏷️' },
          { name: 'Olive Young Awards', nameKo: '올리브영 어워즈', price: 'December', note: "Year-end bestseller rankings across every category — look for the Awards shelf tags. It doubles as next year's shopping list.", emoji: '🏆' },
          { name: 'Brand Days & app coupons', price: 'Monthly', note: 'Rotating single-brand deals (20–30%) announced in the Global app. Check the app the morning you shop.', emoji: '📱' },
          { name: 'Global Lounge events (Myeongdong Town)', price: 'Ongoing', note: 'Tourist-only samples, mini-classes and photo events at the flagship — bring your passport.', emoji: '🎁' },
        ],
      },
      {
        title: '🧠 Checkout hacks',
        items: [
          { name: 'Instant tax refund', price: '₩15,000+ / receipt', note: 'Passport at the till = VAT knocked off on the spot (foreign tourists). Works at every branch, purchase caps apply.', emoji: '🛂' },
          { name: 'Today Delivery (오늘드림)', price: '~₩2,500–5,000', note: 'Same-day delivery to your Seoul hotel. Buy at 11am, it beats you home. Staff can set it up at checkout.', emoji: '📦' },
          { name: 'Barcode-scan reviews', price: 'Free', note: 'Scan any product in the Global app for English ingredients + real Korean review scores before you commit.', emoji: '🔎' },
          { name: 'Ask for samples', price: 'Free', note: 'Bigger baskets earn handfuls of sachets — just ask "샘플 주세요" (sample juseyo) at checkout.', emoji: '🫙' },
        ],
      },
    ],
    swatch: ['#c75c54', '#e3a9a0'],
  },
  {
    slug: 'daiso-finds', kind: 'guide', category: 'Shopping', photoUrl: COVER.timesSquare, updated: 'Jul 2026',
    title: 'Daiso ₩1,000 Finds', subtitle: 'Cheap souvenirs & travel hacks', badge: '🛍️ Shopping',
    description: "Korea's everything-store, where almost nothing tops ₩5,000. Equal parts souvenir goldmine and traveler's lifesaver — the trip-saving item you didn't pack is almost always a few thousand won away here. Fixed price tiers (₩1,000 / 2,000 / 3,000 / 5,000) — no haggling, cards accepted.",
    meta: [{ icon: 'sparkle', label: '20 picks' }, { icon: 'won', label: '₩1,000–5,000' }],
    tips: [
      'Price tiers are color-coded on the shelf label — check before the till.',
      'Biggest branches: Myeongdong (multi-floor, tourist-stocked) and Hongdae; the Myeongdong flagship near Euljiro is the largest in the city.',
      'Great for last-minute gifts: socks, masks, snacks, stationery — buy in bulk, it barely dents the wallet.',
      'No tax refund here — prices are already rock-bottom, so Daiso is excluded from most Tax Free schemes.',
      "Daiso's beauty boom is real, not hype: many lines are made by Korea's own top contract manufacturers (Kolmar, Cosmax — the same factories behind Olive Young and department-store brands), just repackaged without the marketing markup. That's why the formulas hold up.",
      'Keep the receipt if you buy anything electronic (chargers, adapters) — exchanges need it within 7 days.',
    ],
    sections: [
      {
        title: '🔥 Beauty sellouts right now',
        subtitle: 'The lines actually causing the "품절 대란" (sellout frenzy) headlines — Jul 2026, rotates a few times a year',
        items: [
          { name: 'ZOOM by Jung Saem Mool', nameKo: '줌 바이 정샘물', tag: 'Sells out fastest', price: 'Toner pads ₩1,000 · cushion/foundation/fixer ₩5,000', note: "A real collab with makeup artist Jung Saem Mool's own brand, priced at a fraction of her department-store line. Word-of-mouth has been calling it \"the next Needleshot\" (the last Olive Young item to sell out this hard) — check more than one branch, city-center stores restock fastest.", emoji: '💄' },
          { name: 'AHC Eye Cream (Daiso line)', nameKo: 'AHC 아이크림', tag: '~1/6 the price', price: '₩5,000', note: 'Three variants (elasticity / hydration / wrinkle-care) from the actual AHC brand, whose full-size originals run ₩30,000+ at Olive Young — same name, stripped-down packaging.', emoji: '👁️' },
          { name: 'TS Scalp & Hair line', nameKo: 'TS 헤어', tag: 'Hair-loss care', price: 'Shampoo/treatment/tonic, ~₩3,000–5,000 ea', note: "Cooling, anti-dandruff shampoo and scalp tonic aimed at 20–30-somethings worried about hair thinning — dermatologist-style claims (hypoallergenic tested) at Daiso pricing.", emoji: '🧴' },
        ],
      },
      {
        title: '🧳 Travel lifesavers',
        subtitle: 'The stuff you forgot to pack',
        items: [
          { name: 'Travel toiletry bottles', nameKo: '여행용 공병', tag: 'Lifesaver', price: '₩1,000–3,000', note: 'Refill your Olive Young finds for carry-on-safe sizes.', emoji: '🧴' },
          { name: 'Packing cubes & pouches', nameKo: '압축 파우치', price: '₩2,000–5,000', note: 'Compress a half-empty suitcase before the flight home.', emoji: '🎒' },
          { name: 'Phone & cable accessories', nameKo: '휴대폰 액세서리', price: '₩2,000–5,000', note: 'Adapters, cables, grips, phone stands — handy mid-trip, cheaper than a convenience store.', emoji: '🔌' },
          { name: 'Portable mini fan / umbrella', nameKo: '휴대용 선풍기·우산', price: '₩3,000–5,000', note: 'Summer humidity and jangma (monsoon) rain both hit fast — grab one the day you need it.', emoji: '🌂' },
          { name: 'Foldable shopping bag', nameKo: '접이식 장바구니', price: '₩1,000–2,000', note: 'Korea charges for plastic bags almost everywhere — bring your own.', emoji: '🛍️' },
        ],
      },
      {
        title: '🎁 Souvenirs & gifts',
        items: [
          { name: 'Korean character socks', nameKo: '캐릭터 양말', tag: 'Souvenir', price: '₩1,000–2,000', note: 'Cheapest, lightest gift to bring home in bulk.', emoji: '🧦' },
          { name: 'Hanji & traditional stationery', nameKo: '한지 문구', price: '₩2,000–5,000', note: 'Pretty notebooks, bookmarks, postcards — nicer than they look at this price.', emoji: '📝' },
          { name: 'Korean snacks & candy', nameKo: '과자 · 사탕', price: '₩1,000–3,000', note: 'A whole aisle of giftable snacks — cheaper than the airport or a convenience store.', emoji: '🍬' },
          { name: 'Mini cosmetics tools', nameKo: '뷰티 소품', price: '₩1,000–3,000', note: 'Makeup sponges, brushes, tweezers, cotton pads — solid basics, no need for a name brand.', emoji: '💄' },
        ],
      },
      {
        title: '🏠 If you\'re staying a while',
        subtitle: 'For longer stays, an Airbnb, or a dorm room',
        items: [
          { name: 'Basic kitchenware', nameKo: '주방용품', price: '₩1,000–5,000', note: 'Bowls, chopsticks, a small pan — enough to self-cater an extended stay cheaply.', emoji: '🍳' },
          { name: 'Hangers & storage boxes', nameKo: '옷걸이·수납함', price: '₩1,000–3,000', note: 'Airbnbs are notoriously short on hangers and closet space.', emoji: '🧺' },
          { name: 'Slippers & bath items', nameKo: '슬리퍼·목욕용품', price: '₩1,000–3,000', note: 'Indoor slippers are a real Korean-home habit — worth adopting even short-term.', emoji: '🩴' },
        ],
      },
    ],
    swatch: ['#5b6f9c', '#8fb0c0'],
  },
  {
    slug: 'korea-souvenirs', kind: 'guide', category: 'Shopping', updated: 'Jul 2026',
    title: 'What to Bring Home', subtitle: 'Beyond beauty — the classic Korea gifts', badge: '🎁 Shopping',
    description: "If Olive Young and Daiso cover the beauty run and the cheap-and-cheerful gifts, this is the other half: the food, drink and craft items Koreans themselves give as gifts — ginseng, seaweed, traditional sweets, and where each one is actually worth buying.",
    meta: [{ icon: 'sparkle', label: '12 picks' }, { icon: 'won', label: '₩3,000–80,000' }],
    tips: [
      'Ginseng and red ginseng (홍삼) products are Korea\'s single most classic gift — look for a KGC (정관장) label for the real, regulated stuff.',
      'Instant/ready meal-kits (라면, 즉석밥, 김치) travel surprisingly well and read as a "real Korea" gift, not a tourist trinket.',
      'Alcohol: 1 bottle of spirits is duty-free per adult — a nice bottle of premium soju or takju (rice wine) is a better gift than the convenience-store green bottle.',
      'Skip fresh/perishable food gifts (rice cakes, fresh kimchi) unless you\'re flying home within a day or two.',
    ],
    sections: [
      {
        title: '🍵 Food & drink gifts',
        items: [
          { name: 'Red ginseng products', nameKo: '홍삼', price: '₩15,000–80,000', note: 'Extract sticks, candy, or tea — KGC Jung Kwan Jang is the trusted, government-regulated brand.', tag: 'Classic', emoji: '🌿' },
          { name: 'Roasted seaweed (gim)', nameKo: '조미김', price: '₩3,000–10,000', note: 'Individually wrapped snack packs travel perfectly and everyone likes them.', emoji: '🌊' },
          { name: 'Yuja (citron) tea', nameKo: '유자차', price: '₩8,000–15,000', note: 'A jar of citron-honey marmalade — just add hot water. Great cold-season gift.', emoji: '🍯' },
          { name: 'Premium instant noodles', nameKo: '고급 라면 세트', price: '₩10,000–20,000', note: 'Gift-boxed ramyeon sets (Shin Ramyeon, Jjapaguri) — a fun, real gift for foodie friends.', emoji: '🍜' },
          { name: 'Hangwa (traditional sweets)', nameKo: '한과', price: '₩10,000–25,000', note: 'Honey cookies and rice-puff candy in a nice box — sold at markets and department stores.', emoji: '🍡' },
          { name: 'Premium soju / takju gift set', nameKo: '전통주 선물세트', price: '₩15,000–40,000', note: 'A boxed bottle of a craft or premium label reads far better than the everyday green bottle.', tag: 'Duty-free eligible', emoji: '🍶' },
        ],
      },
      {
        title: '🪡 Craft & keepsake gifts',
        items: [
          { name: 'Norigae / hanbok tassels', nameKo: '노리개', price: '₩5,000–20,000', note: 'Traditional silk knot ornaments — small, light, genuinely pretty.', emoji: '🎗️' },
          { name: 'Celadon pottery (small)', nameKo: '고려청자 소품', price: '₩10,000–40,000', note: 'Small jade-green celadon dishes or cups — Insadong has the best selection.', emoji: '🏺' },
          { name: 'Mother-of-pearl (najeon) items', nameKo: '자개', price: '₩10,000–50,000', note: 'Inlaid lacquerware boxes, mirrors and jewelry — a genuinely distinctive craft souvenir.', emoji: '✨' },
          { name: 'Dancheong-pattern items', nameKo: '단청무늬 소품', price: '₩5,000–15,000', note: 'Palace-roof color patterns on fans, pouches, and phone cases — very "Seoul" as a keepsake.', emoji: '🎨' },
        ],
      },
    ],
    blocks: [
      {
        type: 'compare', title: 'Where to actually buy them', subtitle: 'Trade-offs by venue',
        columns: ['Airport Duty-Free', 'Supermarket (Emart/Homeplus)', 'Traditional Market'],
        rows: [
          { label: 'Price', values: ['Higher, but tax-free on alcohol', 'Cheapest for packaged food gifts', 'Good for crafts; haggling rare but ask'] },
          { label: 'Selection', values: ['Curated, gift-boxed', 'Widest packaged-food range', 'Best for one-of-a-kind craft items'] },
          { label: 'Best for', values: ['Last-minute, alcohol, ginseng sets', 'Seaweed, ramyeon, tea, hangwa', 'Norigae, celadon, najeon, dancheong'] },
        ],
        note: 'A good split: buy food gifts at a supermarket mid-trip (so you\'re not carrying them the whole time), crafts at Insadong, and save alcohol for the duty-free counter after security.',
      },
    ],
    swatch: ['#7a4a2a', '#e0a05a'],
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
    slug: 'airport-to-seoul', kind: 'guide', category: 'Getting Around', photoUrl: COVER.nseoul, updated: 'Jul 2026',
    title: 'Airport to Seoul', subtitle: 'From Incheon & Gimpo into the city', badge: '✈️ Arrival',
    description: 'Five ways to get from the airport into central Seoul — what each costs, how long it takes, and which to choose with heavy luggage or after a late-night landing. Built to answer one question fast: which one should I actually take?',
    meta: [{ icon: 'clock', label: '30–90 min' }, { icon: 'won', label: '₩1,500–95,000' }],
    tips: [
      'Pick up a T-money card and a SIM/eSIM right on the arrivals floor before you leave the airport — both counters are past customs, before the exit.',
      'AREX express and the limousine buses are the easiest options with big luggage; the all-stop train gets crowded at the door.',
      'Landing after midnight (00:30–05:00)? Every train and most buses have stopped for the night — budget for a taxi (~₩75,000–95,000) or an airport-area hotel instead of waiting it out.',
      'Airport limousine buses take T-money and cards, but keep ₩20,000 cash as backup — card readers occasionally glitch.',
      'Incheon has two terminals (T1 and T2) linked by a free shuttle train — check which one your airline uses before you plan your exit.',
    ],
    itemsTitle: 'Ways into the city',
    items: [
      { name: 'AREX Express Train', nameKo: '공항철도 직통', emoji: '🚄', price: '₩11,000', where: 'Incheon T1/T2 → Seoul Stn', note: 'Non-stop, ~43 min to Seoul Station, with reserved comfy seats and luggage racks.', caution: 'Runs only ~05:20–22:50.' },
      { name: 'AREX All-Stop Train', nameKo: '공항철도 일반', emoji: '🚇', price: '₩4,000–5,000', where: 'Incheon → Hongdae/Seoul Stn', note: 'The cheapest route; stops everywhere, ~60 min, pay with T-money.', caution: 'Packed at rush hour — tough with big bags.' },
      { name: 'Airport Limousine Bus', nameKo: '공항 리무진', emoji: '🚌', price: '₩16,000–18,000', where: 'Stops near major hotels', note: 'A comfortable coach straight to many neighbourhoods, luggage stowed below.', caution: "Check your hotel's nearest stop and the last departure time." },
      { name: 'Taxi / Kakao T', nameKo: '택시', emoji: '🚕', price: '₩70,000–95,000', where: 'Incheon → city center', note: 'Door to door in ~70 min (a highway toll is included); black deluxe costs more.', caution: "Make sure the meter is on — skip touts offering 'flat fares'." },
      { name: 'Gimpo Airport', nameKo: '김포공항', emoji: '🛫', price: '₩1,500+', where: 'Subway Line 5/9 & AREX', note: 'Much closer than Incheon — the subway reaches the city in ~30 min for a normal fare.' },
    ],
    blocks: [
      {
        type: 'compare', title: 'Which one should I take?', subtitle: 'Incheon → central Seoul, side by side',
        columns: ['AREX Express', 'Limousine Bus', 'Taxi'],
        rows: [
          { label: 'Time', values: ['~43 min', '60–90 min (traffic)', '~70 min'] },
          { label: 'Price', values: ['₩11,000', '₩16,000–18,000', '₩70,000–95,000'] },
          { label: 'Luggage', values: ['Racks on board', 'Stowed below — best for 2+ bags', 'Trunk — easiest, no walking'] },
          { label: 'Best for', values: ['Solo travelers → Seoul Stn', 'Hotel drop-off, groups', 'Late arrivals, door-to-door'] },
        ],
        note: 'On a tight budget with light luggage and going near Seoul Station or Hongdae, skip both and take the AREX All-Stop train for ₩4,000–5,000.',
      },
    ],
    swatch: ['#1f4d4a', '#4a9d8e'],
  },
  {
    slug: 'intercity-transport', kind: 'guide', category: 'Getting Around', updated: 'Jul 2026',
    title: 'KTX vs Flight vs Bus', subtitle: 'Getting to other cities, mode by mode', badge: '🚄 Transport',
    description: "Seoul to Busan, Jeonju, Gyeongju, or the east coast — there's almost always a train, a flight and a bus option, and the right pick depends on your bags, your budget and how much you value the 2 extra hours flying eats up in airport time.",
    meta: [{ icon: 'clock', label: '2–5 hrs' }, { icon: 'won', label: '₩17,000–90,000' }],
    tips: [
      'KTX and SRT are the same speed and cover mostly the same routes — SRT is often a bit cheaper but leaves from Suseo or Dongtan, not Seoul Station, so check which is closer to you.',
      "Domestic flights save time on paper, but airport check-in + security + the transfer back into downtown usually eats the time advantage on anything under 3 hours by train.",
      'Book KTX/SRT on the Korail or SRT app (or Naver Map lets you book KTX in-app) — seats sell out fast around weekends and any holiday.',
      'Express and intercity buses (고속버스/시외버스) are the budget option and surprisingly comfortable — reserved seats, onboard USB, and they leave far more often than trains.',
      'For the east coast (Sokcho, Gangneung), the KTX-Gangneung line or a direct bus both beat flying — there is no useful airport near Sokcho.',
    ],
    blocks: [
      {
        type: 'compare', title: 'By destination', subtitle: 'Time and price door-to-door, cheapest booking class',
        columns: ['KTX / SRT', 'Domestic Flight', 'Express Bus'],
        rows: [
          { label: 'Busan', values: ['~2h30m · ₩59,800', '~1h flight + transfers ≈ 3h total · ₩40,000–90,000', '~4h30m · ₩28,700–45,000'] },
          { label: 'Gyeongju', values: ['~2h10m (to Singyeongju) · ₩47,500', 'No direct airport nearby', '~4h · ₩24,000'] },
          { label: 'Jeonju', values: ['~1h50m (via Iksan) · ₩29,700', 'No direct airport nearby', '~2h40m · ₩17,000–24,000'] },
          { label: 'Gangneung / Sokcho', values: ['~2h · ₩27,600', 'No useful airport nearby', '~2h20m · ₩20,000–27,000'] },
          { label: 'Jeju Island', values: ['No rail link (island)', '~1h · ₩40,000–120,000 — the only fast option', 'N/A'] },
        ],
        note: "Jeju is the one route where flying wins outright — it's an island, so KTX/bus aren't options at all. For every mainland city under 3 train-hours away, the train is usually the better call once you count airport time.",
      },
    ],
    itemsTitle: 'Booking apps',
    items: [
      { name: 'Korail (KTX)', nameKo: '코레일톡', emoji: '🚄', price: 'Free app', note: 'Book KTX/ITX/Mugunghwa trains nationwide; English interface, foreign card OK.' },
      { name: 'SRT', nameKo: 'SRT', emoji: '🚈', price: 'Free app', note: 'Slightly cheaper twin to KTX on the same Busan/Mokpo lines — departs Suseo, not Seoul Station.' },
      { name: 'Kobus / Bustago', nameKo: '고속버스', emoji: '🚌', price: 'Free app', note: 'Book express and intercity bus seats — Korean-only UI but Naver Map links straight to seat selection.' },
      { name: 'Naver Map', nameKo: '네이버 지도', emoji: '🗺️', price: 'Free app', note: 'Search a route and it surfaces train, bus and flight options with live prices side by side.' },
    ],
    swatch: ['#2f4858', '#5b7a99'],
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
    slug: 'delivery-app-guide', kind: 'guide', category: 'Essentials', updated: 'Jul 2026',
    title: 'Ordering Delivery as a Tourist', subtitle: 'Baemin & Coupang Eats, step by step', badge: '🛵 Essentials',
    description: "Korea's delivery culture is legendary — hot food to your door in 20–30 minutes, at 1am, in the rain. It's built for residents with a Korean phone number, so tourists hit a few real snags. Here's exactly how to get around them.",
    meta: [{ icon: 'clock', label: '20–40 min' }, { icon: 'won', label: 'Fee ₩2,000–4,000' }],
    tips: [
      "The single biggest blocker: most delivery apps need a Korean phone number for SMS verification. A data-only tourist eSIM won't work — check yours includes an actual Korean number, or ask your hotel/Airbnb host to help register on their number.",
      'Coupang Eats generally has smoother foreign-card checkout than Baemin, and its address-pin map makes it easier without reading Korean.',
      "No tipping — the delivery fee (₩2,000–4,000, sometimes free for larger orders) is the entire cost.",
      'Add a Korean delivery note if you can: "문 앞에 놔주세요" (leave it at the door) is the default now — most riders won\'t knock or call.',
      'Staying in a hotel? Give the address as your hotel name + room number and have the front desk expecting it — easier than a precise map pin.',
    ],
    blocks: [
      {
        type: 'steps', title: 'How to order', subtitle: 'From download to doorstep',
        steps: [
          { title: 'Confirm you have a Korean number', note: 'Check your SIM/eSIM plan includes voice/SMS, not just data — this is the #1 reason tourists get stuck at signup.', emoji: '📱' },
          { title: 'Download Coupang Eats (easiest) or Baemin', note: 'Coupang Eats has better foreign-card support; Baemin has more restaurant selection but a more Korean-only UI — use Papago\'s camera mode to read menus in either.', emoji: '⬇️' },
          { title: 'Set your delivery address', note: 'Drop a pin on the map instead of typing a Korean address — both apps support this. For a hotel, search the hotel name directly.', emoji: '📍' },
          { title: 'Browse & order', note: 'Photos carry most menus even in Korean; Papago\'s camera translate handles the rest. Check the minimum order amount shown at checkout.', emoji: '🍔' },
          { title: 'Pay', note: 'Foreign Visa/Mastercard usually works in-app; cash-on-delivery (만나서 결제) is a fallback if your card is declined.', emoji: '💳' },
          { title: 'Add a delivery note', note: 'Paste in "문 앞에 놔주세요" (leave at the door) — contactless drop-off is the default expectation now.', emoji: '📝' },
          { title: 'Track & receive', note: 'Live rider tracking shows ETA to the minute; a push notification pings when it arrives.', emoji: '✅' },
        ],
      },
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
    slug: 'jjimjilbang-guide', kind: 'guide', category: 'Culture', photoUrl: COVER.sauna, updated: 'Jul 2026',
    title: 'Jjimjilbang: Korean Spa', subtitle: 'How the bathhouse works, start to finish', badge: '♨️ Culture',
    description: "A jjimjilbang is a Korean sauna-and-bathhouse — part spa, part social hangout, part budget overnight stay. Intimidating the first time (there's a nude floor and a mixed-gender floor, and nobody explains which is which); genuinely one of the best-value things to do in Seoul once you know the flow.",
    meta: [{ icon: 'won', label: '₩8,000–15,000' }, { icon: 'clock', label: 'Often 24h' }],
    tips: [
      'They give you everything: uniform, towel, a locker key/wristband. Bring nothing but yourself, your ID, and some cash for snacks.',
      'It\'s two different floors with two different rules — the bathing floor is gender-separated and nude; the sauna/common floor is mixed-gender and you wear the provided uniform. Nobody tells you this on the way in, so it trips up almost every first-timer.',
      'You can stay overnight for just the entry fee — sleep in the communal hall on a mat and pillow. A genuinely cheap, cozy option if you miss the last train.',
      'Visible tattoos can occasionally get a second look at stricter bathhouses (a hangover rule from tattoos = organized crime association) — most tourist-frequented spots in Seoul don\'t enforce it, but it\'s not universal.',
      'Try a sikhye (sweet rice drink) and a baked egg from the snack bar — the classic post-sauna combo everyone does.',
    ],
    blocks: [
      {
        type: 'steps', title: 'How a visit actually flows', subtitle: 'From the front desk to checkout',
        steps: [
          { title: 'Pay at the counter, get a key', note: 'One wristband/key unlocks your shoe locker at the entrance AND your clothing locker inside — don\'t lose it, it\'s also your tab for snacks.', emoji: '🎫' },
          { title: 'Shoes off immediately', note: 'Shoe lockers are right at the entrance, before you go further in — Korean floors are a shoes-off space from the door.', emoji: '👟' },
          { title: 'Split by gender → undress → shower', note: 'Follow the color-coded sign to your gender\'s bathing floor. Fully undress at your locker, then shower thoroughly before touching any pool — this part is strictly nude and strictly by the rules.', emoji: '🚿' },
          { title: 'Soak in the hot/cold pools', note: 'Alternate hot and cold pools as long as you like — this floor is single-gender only, no uniform.', emoji: '♨️' },
          { title: 'Put on the uniform, go up to the sauna floor', note: 'This floor is mixed-gender — everyone wears the same baggy shorts-and-shirt uniform. Multiple kiln-sauna rooms at different temperatures, TV lounge, sleeping hall.', emoji: '👕' },
          { title: 'Snack bar break', note: 'Sikhye (sweet rice drink) + a baked egg is the classic combo, charged to your wristband — settle up at checkout.', emoji: '🥚' },
          { title: 'Sleep over (optional) or check out', note: 'Grab a mat and pillow in the sleeping hall if staying overnight, or return your key/wristband at the counter to pay and leave.', emoji: '💤' },
        ],
      },
    ],
    itemsTitle: 'Well-known spots to try',
    items: [
      { name: 'Dragon Hill Spa', nameKo: '드래곤힐스파', emoji: '🐉', price: '₩13,000–15,000', where: 'Yongsan Stn', note: 'Huge, tourist-famous, genuinely 24h — probably the easiest first jjimjilbang for a foreigner.' },
      { name: 'Siloam Sauna', nameKo: '실로암 사우나', emoji: '🔥', price: '₩8,000–10,000', where: 'Seoul Stn area', note: 'Classic, no-frills neighborhood bathhouse — cheaper, more local, still foreigner-friendly.' },
      { name: 'Spa Lei', nameKo: '스파레이', emoji: '🌸', price: '₩15,000–20,000', where: 'Gangnam', note: 'Upscale, women-only spa — nicer facilities, popular with K-beauty-minded visitors.', caution: 'Women only — check before you plan a group visit.' },
    ],
    swatch: ['#5b3a52', '#b06b98'],
  },

  // ─────────────── Day Trips ───────────────
  {
    slug: 'day-trips', kind: 'guide', category: 'Day Trips', photoUrl: COVER.bukhansan, updated: 'Jul 2026',
    title: 'Day Trips Near Seoul', subtitle: 'Under 90 minutes out, back by dinner', badge: '🚄 Day Trips',
    description: "Some of Korea's best sights are a short subway ride or shuttle from the city — no KTX ticket needed. Where they are, exactly how to get there without a car, and what each one is actually for.",
    meta: [{ icon: 'clock', label: '30–90 min out' }, { icon: 'sparkle', label: '7 picks' }],
    tips: [
      'All seven of these are doable by public transport alone — no rental car needed.',
      'Nami Island and the DMZ are the two that need advance booking (ferry ticket and a licensed tour respectively) — sort those first if your dates are fixed.',
      'Pair a subway-line destination (Suwon, Incheon) with a half-day in the city the same day; save the shuttle-bus ones (Nami, Everland, Paju) for a dedicated full day.',
    ],
    itemsTitle: 'Where to go',
    items: [
      { name: 'DMZ & JSA', nameKo: '비무장지대', emoji: '🪖', price: 'Tour ₩50,000+', where: '~1 hr north', note: 'The tense, fascinating border with North Korea — the Third Tunnel, observatory and JSA.', caution: 'Must join a licensed tour and bring your passport; book days ahead.' },
      { name: 'Nami Island', nameKo: '남이섬', emoji: '🌲', price: 'ITX + ferry ≈ ₩15,000', where: '~1.5 hr (Gapyeong)', note: 'The tree-lined island of Winter Sonata fame — dreamy in autumn foliage. ITX train to Gapyeong, then a short ferry.' },
      { name: 'Everland', nameKo: '에버랜드', emoji: '🎢', price: '₩60,000+', where: '~1 hr (Yongin)', note: "Korea's biggest theme park — coasters, a zoo, and seasonal flower festivals. Direct shuttle bus from Gangnam/Jamsil stations." },
      { name: 'Suwon Hwaseong', nameKo: '수원 화성', emoji: '🏯', price: 'Subway Line 1', where: '~1 hr south', note: 'A UNESCO fortress wall you can walk, with archery and a night market — all reachable straight off Line 1, no transfers.' },
      { name: 'Incheon Chinatown', nameKo: '인천 차이나타운', emoji: '🥟', price: 'Subway Line 1', where: '~1 hr west', note: 'Jjajangmyeon\'s birthplace + the colourful Songwol-dong fairy-tale village.' },
      { name: 'Paju Heyri Art Village', nameKo: '파주 헤이리', emoji: '🎨', price: 'Shuttle ₩3,000+', where: '~1 hr northwest', note: 'A whole village of galleries, bookshops and cafés in odd architecture — pair with Imjingak nearby.' },
      { name: 'Yangpyeong / Semiwon', nameKo: '양평·세미원', emoji: '🪷', price: 'ITX ₩3,000–5,000', where: '~1 hr east', note: 'Riverside lotus gardens and a scenic rail-bike track along the old line — a quiet, green half-day.' },
    ],
    swatch: ['#2f4858', '#5b7a99'],
  },
  {
    slug: 'city-day-trips', kind: 'guide', category: 'Day Trips', updated: 'Jul 2026',
    title: 'Day Trips to Other Cities', subtitle: 'KTX out and back, same day', badge: '🚄 Day Trips',
    description: "Korea is small enough that Busan, Gyeongju, or Jeonju are a real same-day trip by KTX — leave after breakfast, be back for a late dinner. Here's which cities actually work as a day trip, and what to build the day around.",
    meta: [{ icon: 'clock', label: '2–3 hrs each way' }, { icon: 'sparkle', label: '5 cities' }],
    tips: [
      'Book the first KTX out (usually ~06:00–07:00) and the last one back to actually get a full day — fares vary by train time, and early departures tend to be cheaper.',
      'Store bags in a coin locker at the destination station (every KTX station has them) instead of hauling a day bag around all day.',
      "Busan and Gyeongju are the most doable — both have a walkable core near the station. Jeonju's hanok village is a 15-min taxi/bus from its KTX-Jeonju stop.",
      'Check the "KTX vs Flight vs Bus" guide for full fare and time comparisons before you book.',
    ],
    itemsTitle: 'Which city, and why',
    items: [
      { name: 'Busan', nameKo: '부산', emoji: '🌊', price: 'KTX ~2h30m', where: 'Busan Station', note: 'Haeundae beach, Gamcheon culture village, Jagalchi fish market — Korea\'s second city, coastal and completely different energy from Seoul.', caution: "It's a lot for one day — pick 2 neighborhoods max, don't try to see all of Busan." },
      { name: 'Gyeongju', nameKo: '경주', emoji: '🏛️', price: 'KTX ~2h10m (Singyeongju)', where: 'Singyeongju Station', note: 'The open-air museum city — Bulguksa Temple, Seokguram Grotto, and royal burial mounds you can walk right up to.', caution: 'Singyeongju station is ~15 min from the sights by bus/taxi, not walkable.' },
      { name: 'Jeonju', nameKo: '전주', emoji: '🍚', price: 'KTX ~1h50m', where: 'Jeonju Station', note: "Korea's food capital — the hanok village, bibimbap at its birthplace, and the best street-food alley in the country.", caution: "Go hungry. Jeonju is genuinely about the food more than the sights." },
      { name: 'Gangneung / Sokcho', nameKo: '강릉·속초', emoji: '⛰️', price: 'KTX ~2h (Gangneung)', where: 'Gangneung Station', note: 'East-coast beaches and coffee streets (Gangneung), or Seoraksan mountain views (Sokcho, 1 hr further by bus).', caution: 'Doing Seoraksan properly needs a full day on its own — pick one, not both.' },
      { name: 'Chuncheon', nameKo: '춘천', emoji: '🥘', price: 'ITX ~1h20m', where: 'Chuncheon Station', note: 'The closest real "other city" trip — dakgalbi (spicy stir-fried chicken) alley and a lakeside cable car.', caution: 'The most relaxed option if a full KTX day feels like too much.' },
    ],
    swatch: ['#1f4d4a', '#4a9d8e'],
  },
  {
    slug: 'kpop-fan-guide', kind: 'guide', category: 'K-Content', photoUrl: COVER.ddp,
    title: 'K-pop Fan Pilgrimage', subtitle: 'Music shows, birthday cafés & photocards', badge: '🎤 K-Content', updated: 'Jul 2026',
    description: "Seoul is the pilgrimage: watch a live music show taping, hunt photocards in Myeongdong basements, and drink your bias's birthday latte in Seongsu. Here's how fans actually do it — the systems, the neighborhoods, and the etiquette.",
    meta: [{ icon: 'sparkle', label: '13 entries' }, { icon: 'clock', label: 'Shows: Tue–Sun' }],
    tips: [
      'Music-show tapings are FREE but competitive — most require pre-registration with the fan community (or luck at standby lines). Bring your passport and the physical album if required.',
      "Birthday cafés (생일카페) are pop-up events fans throw for idols' birthdays — order a drink, get free photocard 'freebies'. Find them on X by searching '아이돌이름 생일카페'.",
      'Photocard etiquette: prices are set by rarity, sleeves are sacred, and trading happens openly — bring a toploader.',
      'HYBE/SM/JYP buildings are offices, not attractions — the fan spots are their official stores, not the lobbies.',
      'Album prices in Korea (₩15–25k) beat overseas prices, and many stores bundle exclusive photocards or lucky draws.',
    ],
    sections: [
      {
        title: '📺 Music show tapings',
        subtitle: 'One show almost every day of the week',
        items: [
          { name: 'M Countdown (Mnet)', nameKo: '엠카운트다운', price: 'Thu · free', where: 'CJ ENM Center, Sangam', note: 'The flagship. Pre-recording queues form before dawn; global fans enter via Mnet Plus app events.', emoji: '🎬' },
          { name: 'Music Bank (KBS)', nameKo: '뮤직뱅크', price: 'Fri · free', where: 'KBS Hall, Yeouido', note: 'Longest-running. KBS runs a foreigner standby line — passport required, arrive by ~6am for big lineups.', emoji: '📡' },
          { name: 'Inkigayo (SBS)', nameKo: '인기가요', price: 'Sun · free', where: 'SBS Prism Tower, Sangam', note: 'Sunday closer. Fan-club pre-registration dominates seats; standby is a long shot but happens.', emoji: '🌟' },
          { name: 'The Show / Show Champion', price: 'Tue / Wed · free', where: 'Sangam · Ilsan', note: "Smaller shows = best odds of getting in. Check each show's X account for foreigner applications.", emoji: '🎫' },
        ],
      },
      {
        title: '🛍️ Where fans shop',
        items: [
          { name: 'Myeongdong Underground Shopping Center', nameKo: '명동지하쇼핑센터', price: '₩1,000+', where: 'Myeongdong Stn', note: 'The classic photocard/merch basement maze — light haggling is fine here.', emoji: '🃏' },
          { name: 'Ktown4u COEX', nameKo: '케이타운포유', price: 'Albums ₩15–25k', where: 'COEX, Samseong', note: 'Giant official store: albums, lucky draws, fan-sign entry events, tax refund counter.', emoji: '💿' },
          { name: 'WithMuu / Everline stores', price: 'Albums + benefits', where: 'Hongdae · Myeongdong', note: 'Chain music stores with exclusive photocard benefits per version — compare before buying.', emoji: '🎁' },
          { name: 'Label flagship pop-ups', nameKo: '광야서울 등', price: 'Varies', where: 'Seongsu · Yongsan', note: 'SM/HYBE-affiliated stores rotate artist pop-ups constantly — check what opened the week you land.', emoji: '🏢' },
          { name: 'Photoism idol frames', nameKo: '포토이즘', price: '₩4,000–5,000', where: 'Everywhere', note: 'Photo-booth chains run rotating idol collab frames — the fan souvenir that costs pocket change.', emoji: '📸' },
        ],
      },
      {
        title: '☕ Fan neighborhoods',
        items: [
          { name: 'Seongsu-dong birthday café crawl', nameKo: '성수 생일카페', price: 'One drink per café', where: 'Seongsu', note: "Seoul's birthday-café capital — on a big idol birthday, whole blocks turn into shrines with freebies.", emoji: '🎂' },
          { name: 'Hapjeong / Hongdae fan cafés', price: '₩6–8k drinks', where: 'Mapo', note: "Agency-adjacent cafés where comeback cup-sleeve events cluster — check X for this week's events.", emoji: '🧋' },
          { name: 'K-Star Road', nameKo: '케이스타로드', price: 'Free', where: 'Apgujeong Rodeo', note: "GangnamDol bear statues for major groups along the old agencies' block.", emoji: '🐻' },
          { name: 'Idol billboard spotting', price: 'Free', where: 'Subway stations', note: 'Fan-funded birthday billboards fill stations like Seongsu, Hapjeong, Hongdae — part of the streetscape.', emoji: '🖼️' },
        ],
      },
    ],
    swatch: ['#5b6f9c', '#8fb0c0'],
  },

  // ─────────────── Neighborhoods ───────────────
  {
    slug: 'gangnam-guide', kind: 'guide', category: 'Neighborhoods', updated: 'Jul 2026',
    title: 'Gangnam, Beyond the Song', subtitle: 'What the district is actually like on the ground', badge: '🏙️ Neighborhoods',
    description: "Gangnam is Seoul's glossiest district — but it's really three different neighborhoods stitched together, and most first-time visitors only see one of them (the COEX mall). Here's how the area actually breaks down, and a real spot in each to anchor your visit.",
    meta: [{ icon: 'sparkle', label: '3 sub-areas' }, { icon: 'won', label: 'Pricier than average' }],
    tips: [
      "Gangnam isn't one place — it's Gangnam Station (nightlife/office towers), COEX/Samseong (malls, aquarium, K-pop stores), and Apgujeong/Cheongdam/Garosu-gil (fashion, cafés, plastic-surgery clinics) — each a subway stop or two apart.",
      'Prices run noticeably higher here than Hongdae or Jongno — a coffee that\'s ₩4,500 elsewhere is often ₩7,000+ on Garosu-gil.',
      "COEX Mall connects underground to Samseong Station, Starfield Library and the Aquarium — you can spend a whole rainy afternoon without going outside once.",
      'Bongeunsa Temple sits directly across from the COEX convention center — a genuinely quiet, free escape a two-minute walk from the mall crowds.',
    ],
    blocks: [
      {
        type: 'places', title: 'Real spots to start with', subtitle: 'Anchor points across the three sub-areas',
        placeSlugs: ['vs-ENP026558', 'vs-ENP024663', 'vs-ENP000374', 'vs-ENP000411', 'vs-ENP000291', 'vs-ENP001307', 'vs-ENP001414'],
      },
    ],
    swatch: ['#5a1f4a', '#c2569b'],
  },
  {
    slug: 'hidden-seoul', kind: 'guide', category: 'Neighborhoods', updated: 'Jul 2026',
    title: 'Seoul Off the Main Map', subtitle: 'Real spots outside Hongdae, Myeongdong & Gangnam', badge: '🗺️ Neighborhoods',
    description: "Most first trips stay inside four or five neighborhoods. One subway ride further out, Seoul has hanok villages with no tour groups, a glass skywalk almost nobody's heard of, and royal tombs you'll often have entirely to yourself.",
    meta: [{ icon: 'sparkle', label: '7 picks' }, { icon: 'info', label: '1 subway ride out' }],
    tips: [
      'None of these are far — most are 20–35 minutes by subway from the city center, just in gu\'s (districts) tour buses skip.',
      'Go on a weekday if you can — these stay genuinely quiet even on weekends, but weekday mornings are close to empty.',
      "This is a great pairing with a slower, no-agenda day — nothing here needs advance booking or a ticket line.",
    ],
    blocks: [
      {
        type: 'places', title: 'Where to go', subtitle: 'Real places, well outside the usual loop',
        placeSlugs: ['vs-ENP035673', 'vs-ENP998h6q', 'vs-ENPxa3w2o', 'vs-ENP002299', 'vs-ENP023760', 'vs-ENP032546', 'vs-ENP003452'],
      },
    ],
    swatch: ['#2a3225', '#79876b'],
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
