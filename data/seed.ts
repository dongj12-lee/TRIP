// Seed / mock data ported verbatim from source/data.jsx.
// This doubles as the initial content used to seed Supabase (see supabase/seed.sql).
import {
  Buddy, Country, Creator, ForeignerTag, ForeignerTagKey, Interest, Itinerary, Place, Post,
  Region, Theme, Tier,
} from './types';

// The filterable five, these have boolean columns and power the Explore
// "Foreigner-friendly" filter + the quick pills on place cards.
export const FOREIGNER_TAGS: ForeignerTag[] = [
  { key: 'soloOk', emoji: '🧍', label: 'Solo OK', hint: 'Order / be seated as one person', tone: 'sage' },
  { key: 'englishMenu', emoji: '📋', label: 'English menu', hint: 'An English menu is available', tone: 'gold' },
  { key: 'priceTransparent', emoji: '💸', label: 'Fair price', hint: 'No tourist markup, prices clear', tone: 'blue' },
  { key: 'cardOk', emoji: '💳', label: 'Card OK', hint: 'Foreign cards accepted', tone: 'sage' },
  { key: 'englishSpoken', emoji: '💬', label: 'English spoken', hint: 'Staff can communicate in English', tone: 'gold' },
];

// Full registry of Foreigner-Fit tags (the five above + category-specific ones).
// The place-detail checklist is built per category from this, so a museum asks
// about English audio guides while a restaurant asks about vegetarian options.
export const FIT_TAGS: Record<ForeignerTagKey, { emoji: string; label: string; hint: string }> = {
  soloOk: { emoji: '🧍', label: 'Solo OK', hint: 'Comfortable to visit / dine alone' },
  englishMenu: { emoji: '📋', label: 'English menu', hint: 'An English menu is available' },
  priceTransparent: { emoji: '💸', label: 'Fair price', hint: 'No tourist markup, prices clear' },
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
// L2 refinements for cafes/bars). Order matters, most relevant first.
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

// Three meaningful kinds only. A freeform "post" is the default, it absorbs
// what used to be split across thought/tip/review, since that distinction was
// fuzzy and added posting friction. "Route" is structural (auto when a shared
// itinerary is attached); "question" is a distinct intent (expects answers).
export const POST_TYPES: Record<string, { emoji: string; label: string; tone: 'terra' | 'sage' | 'gold' | 'rose' | 'blue' }> = {
  post: { emoji: '💬', label: 'Post', tone: 'blue' },
  route: { emoji: '🧭', label: 'Route', tone: 'blue' },
  question: { emoji: '❓', label: 'Question', tone: 'sage' },
};

// Maps any stored type (including legacy thought/tip/review rows) onto the
// current three-kind model. Use wherever a post's type drives display/filtering.
export function normalizePostType(t: string | null | undefined): 'post' | 'route' | 'question' {
  return t === 'route' || t === 'question' ? t : 'post';
}

// Real theme cover photos, reused from Visit Seoul place photography (same
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
  // Real storefront signage photos from Wikimedia Commons (CC BY-SA, credited
  // in the app's Photo credits, see app/settings.tsx). These show the actual
  // shopfront and sign, which a generic mall exterior didn't. GS25 stays on the
  // Visit Seoul catalog shot (a real store already).
  oliveYoung: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/OliveYoung_store.png/960px-OliveYoung_store.png',
  // Namdaemun-ro flagship, the real "다이소" red storefront sign (a clear Korean
  // store, unlike the ambiguous earlier shot).
  daiso: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Daiso_Namdaemun-ro_No.1_store.JPG/960px-Daiso_Namdaemun-ro_No.1_store.JPG',
  gs25: VS('srvcId=MEDIA&parentSn=76086&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  // Incheon Airport station pillar sign (AREX platform), fits "Airport → Seoul"
  // far better than a tower shot. Wikimedia Commons, CC BY-SA.
  arex: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Q54255_Incheon_International_Airport_A01.JPG/960px-Q54255_Incheon_International_Airport_A01.JPG',
  // Literal subject covers (Wikimedia Commons, CC BY-SA), the user wanted the
  // card to *show the thing*: a SIM in a phone tray, a card terminal, Gangnam
  // Station at night, an adhesive bandage.
  simCard: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Insert_SIM_Card_-_Android_LG_Nexus_5X_-_Project_Fi_%2842034815022%29.jpg/960px-Insert_SIM_Card_-_Android_LG_Nexus_5X_-_Project_Fi_%2842034815022%29.jpg',
  cardTerminal: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Ingenico_iPP350_payment_terminal.jpg/960px-Ingenico_iPP350_payment_terminal.jpg',
  gangnamStn: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Night_view_at_Gangnam_station_bus_stop_20251024.jpg/960px-Night_view_at_Gangnam_station_bus_stop_20251024.jpg',
  bandage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Pl%C3%A5ster_-_Adhesive_bandage_-_2025.jpg/960px-Pl%C3%A5ster_-_Adhesive_bandage_-_2025.jpg',
  brewery: VS('srvcId=POST&parentSn=36996&fileTy=POSTTHUMB&fileNo=1&thumbTy=M&postTy=P'),
  gyeongbok: VS('srvcId=POST&parentSn=73&fileTy=POSTTHUMB&fileNo=6&thumbTy=M&postTy=P'),
  sauna: VS('srvcId=MEDIA&parentSn=63365&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  bukhansan: VS('srvcId=MEDIA&parentSn=68895&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  ssamziegil: VS('srvcId=POST&parentSn=6364&fileTy=POSTTHUMB&fileNo=2&thumbTy=M&postTy=P'),
  hwarangdaeRail: VS('srvcId=MEDIA&parentSn=77191&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  gyeongchunLine: VS('srvcId=MEDIA&parentSn=65113&fileTy=MEDIA&fileNo=2&thumbTy=M'),
  bongeunsa: VS('srvcId=MEDIA&parentSn=60970&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  ihwaMural: VS('srvcId=MEDIA&parentSn=63016&fileTy=MEDIA&fileNo=2&thumbTy=M'),
  chicken: VS('srvcId=POST&parentSn=23127&fileTy=POSTTHUMB&fileNo=1&thumbTy=M&postTy=P'),
  buamdong: 'https://tong.visitkorea.or.kr/cms/resource/19/3109519_image2_1.JPG',
  // Location photos for the filming-locations guide. Deliberately photos of
  // the PLACE, never posters or stills, those are copyrighted and cannot ship.
  naksan: VS('srvcId=MEDIA&parentSn=68260&fileTy=MEDIA&fileNo=3&thumbTy=M'),
  namsanTower: VS('srvcId=MEDIA&parentSn=68273&fileTy=MEDIA&fileNo=3&thumbTy=M'),
  bukchonV: VS('srvcId=MEDIA&parentSn=77135&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  cheonggyeS: VS('srvcId=MEDIA&parentSn=77161&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  sewoon: VS('srvcId=MEDIA&parentSn=77171&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  ddpV: VS('srvcId=MEDIA&parentSn=68048&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  ikseonV: VS('srvcId=MEDIA&parentSn=67438&fileTy=MEDIA&fileNo=2&thumbTy=M'),
  olympicStadium: VS('srvcId=MEDIA&parentSn=74468&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  gyeongbokV: VS('srvcId=POST&parentSn=73&fileTy=POSTTHUMB&fileNo=6&thumbTy=M&postTy=P'),
  lotteWorld: VS('srvcId=MEDIA&parentSn=75612&fileTy=MEDIA&fileNo=1&thumbTy=M'),
  seongbuk: 'https://tong.visitkorea.or.kr/cms/resource/84/3043884_image2_1.jpg',
  myeongdongV: VS('srvcId=MEDIA&parentSn=66689&fileTy=MEDIA&fileNo=1&thumbTy=M'),
};

export const THEMES: Theme[] = [
  {
    // Stops are real Visit Seoul places (vs- slugs), so this walk only
    // resolves stops when live Supabase data is loaded, matches the DB copy
    // of this theme, kept in sync manually (see supabase/themes update).
    slug: 'euljiro-after-dark', kind: 'walk', category: 'K-Content', photoUrl: COVER.nogari,
    title: 'Euljiro After Dark', subtitle: 'A local night crawl',
    kContent: 'K-Variety / K-Drama', kType: 'Variety', stops: 6, hours: '≈ 4 hrs',
    meta: [{ icon: 'sparkle', label: '6 stops' }, { icon: 'clock', label: '≈ 4 hrs' }],
    description: "The retro-industrial backstreets of Euljiro that keep showing up in Korean dramas and variety shows. Eat, drink, and wander like a local, not a tourist stuck in Myeongdong.",
    tips: [
      "Take Euljiro 3(sam)-ga Station (Line 2 or 3), Exit 4, the bar alleys start right outside and spread from there.",
      "Most of these bars sit on the second and third floors above hardware, tool and lighting-fixture shops that still trade by day, look up: the shutters you'd walk past at noon are a different scene after dark.",
      "Nogari (dried, grilled pollack) with a cold draft beer is the signature order here, cheap and built for sharing, it's the reason locals call this Nogari Alley.",
      "Go early evening for a rooftop table if you want the neon-and-skyline shot without a wait, tables fill fast after 8pm on weekends.",
      "Sunday is the one night this area actually goes quiet, most bars close; Friday and Saturday nights are when it's loudest.",
      "The scene turns over fast, over 100 new bars have opened in the last three years, so a spot you saw on social media may already be under new management.",
    ],
    placeSlugs: ['vs-ENPf8bj59', 'vs-ENPyiaqhs', 'vs-ENP025376', 'vs-ENP000286', 'vs-ENPqlv92h', 'vs-ENP32nfdl'],
    swatch: ['#3a2c22', '#c26b4a'],
  },
  {
    slug: 'filming-locations', kind: 'guide', category: 'K-Content', photoUrl: COVER.buamdong,
    title: 'You’ve Seen This Place Before', subtitle: 'The Seoul you already know from the screen',
    badge: '🎬 K-Content', updated: 'Jul 2026',
    // Sourcing rule: Korea Tourism Organization (대한민국 구석구석) and Seoul
    // city's own media hub only, filming-location lists online copy each other
    // and are frequently wrong. Each production collapses to a card; tap to see
    // its real locations. Poster art is original (see data/titleCards.ts), not
    // copyrighted stills.
    description: 'You have walked these streets already, on a screen. Tap any title to see exactly where it was shot, every location checked against Korea’s tourism board and Seoul city, not the blog lists that copy each other.',
    meta: [{ icon: 'sparkle', label: '18 titles' }, { icon: 'info', label: 'Officially sourced' }],
    tips: [
      'Most of these are ordinary streets where people live and work. Film them, don’t block them. The Parasite stairs in particular are somebody’s route home.',
      'Search the Korean title + 촬영지 on Naver Map, not Google. Korean location data barely exists on Google Maps.',
      'A set is not a location. Itaewon Class’s bar, Squid Game’s dormitory and Old Boy’s corridor were all built on soundstages and no longer exist, tour listings still sell them, so don’t go hunting.',
    ],
    productions: [
      {
        title: 'In & around Seoul', subtitle: 'Reachable on the subway or a short ride',
        items: [
          {
            title: 'KPop Demon Hunters', titleKo: '케이팝 데몬 헌터스', meta: 'Netflix · 2025', price: 'Free', posterKey: 'kpop-demon-hunters',
            tagline: 'Animated, but every backdrop is a real Seoul place.',
            spots: [
              { place: 'Naksan Park fortress wall', placeKo: '낙산공원 성곽길', scene: 'Rumi and Jinu’s rooftop confession', where: 'Seongbuk-gu', caution: 'Visitors jumped from ~6,000 to 15,000–20,000 a month after release. Sunset on a weekday for the shot without the queue.' },
              { place: 'Seoul Oriental Medicine Centre', placeKo: '서울한방진흥센터', scene: 'The model for Rumi’s clinic, “HAN의원”, there’s a recreation booth on the 2nd floor', where: 'Dongdaemun-gu' },
              { place: 'N Seoul Tower', placeKo: 'N서울타워', scene: 'The finale stage', where: 'Namsan, Yongsan-gu' },
              { place: 'Myeongdong street', placeKo: '명동거리', scene: 'The Saja Boys’ street gig', where: 'Jung-gu' },
              { place: 'Bukchon Hanok Village', placeKo: '북촌한옥마을', scene: 'The rooftop duet', where: 'Jongno-gu' },
              { place: 'Cheongdam Bridge', placeKo: '청담대교', scene: 'The chase', where: 'Gwangjin-gu' },
              { place: 'Jamsil Olympic Stadium', placeKo: '잠실종합운동장', scene: 'The opening concert', where: 'Songpa-gu', caution: 'Currently under renovation.' },
              { place: 'Samseong station media screen', placeKo: '삼성역 전광판', scene: 'The “Golden” video billboard', where: 'Gangnam-gu' },
            ],
          },
          {
            title: 'Parasite', titleKo: '기생충', meta: 'Film · 2019', price: 'Free', posterKey: 'parasite',
            tagline: 'Bong Joon-ho’s Palme d’Or descent, mapped by Seoul city.',
            spots: [
              { place: 'Jahamun Tunnel stairs', placeKo: '자하문터널 계단', scene: 'The rainstorm descent back to the basement flat', where: 'Jahamun-ro 219, Jongno-gu', caution: 'A residential right of way, not an attraction. Early morning is quiet.' },
              { place: 'Doeji Rice Supermarket', placeKo: '돼지쌀슈퍼', scene: '“Woori Super”, where the family drinks outside', where: 'Songijeong-ro 32, Mapo-gu', caution: 'Still a working shop, buy something if you photograph it.' },
              { place: 'Sky Pizza', placeKo: '스카이피자', scene: 'The pizza-box folding job (“Pizza Time”)', where: 'Noryangjin-ro 6-gil 86, Dongjak-gu', caution: 'A real pizzeria you can eat in.' },
            ],
          },
          {
            title: 'Squid Game', titleKo: '오징어 게임', meta: 'Netflix · 2021', price: 'Free', posterKey: 'squid-game',
            tagline: 'The arena was a set; Gi-hun’s neighbourhood is real.',
            spots: [
              { place: 'Baegun Market', placeKo: '백운시장', scene: 'Where Gi-hun and Sang-woo talk about the debt', where: 'Ssangmun-dong, Dobong-gu' },
              { place: 'Paldo Dried Fish', placeKo: '팔도건어물', scene: 'The fish shop Sang-woo’s mother runs', where: 'Samyang-ro 154-gil 36, Dobong-gu' },
            ],
          },
          {
            title: 'Reply 1988', titleKo: '응답하라 1988', meta: 'tvN · 2015', price: 'Free', posterKey: 'reply-1988',
            tagline: 'The real market its beloved set was modelled on.',
            spots: [
              { place: 'Ssangmun Market', placeKo: '쌍문시장', scene: 'The shops and alleys behind the show’s Ssangmun-dong', where: 'Dobong-gu', caution: 'A ten-minute walk from the Squid Game spots, do both in one trip.' },
            ],
          },
          {
            title: 'Itaewon Class', titleKo: '이태원 클라쓰', meta: 'JTBC · 2020', price: 'Free', posterKey: 'itaewon-class',
            tagline: 'One bar’s fight, on a footbridge under Namsan.',
            spots: [
              { place: 'Noksapyeong overpass', placeKo: '녹사평 육교', scene: 'The plot-turning conversations, with Namsan Tower framed at the end', where: 'Exit 1, Noksapyeong Stn (Line 6)', caution: 'DanBam, the bar, was a soundstage set, it was never in Itaewon.' },
            ],
          },
          {
            title: 'Vincenzo', titleKo: '빈센조', meta: 'tvN · 2021', price: 'Free', posterKey: 'vincenzo',
            tagline: 'Geumga Plaza is a 1968 concrete megastructure.',
            spots: [
              { place: 'Sewoon Sangga', placeKo: '세운상가', scene: 'The crumbling arcade the whole show revolves around', where: 'Jongno-gu', caution: 'Korea’s first mixed-use megastructure, a Kim Swoo-geun design, still full of electronics shops, with a rooftop walkway.' },
            ],
          },
          {
            title: 'Lovely Runner', titleKo: '선재 업고 튀어', meta: 'tvN · 2024', price: 'Free', posterKey: 'lovely-runner',
            tagline: 'A time-slip romance stitched across Seoul.',
            spots: [
              { place: 'Dongdaemun Design Plaza', placeKo: 'DDP', scene: 'The concert venue', where: 'Jung-gu' },
              { place: 'Seongbuk-cheon bridge', placeKo: '성북천 다리', scene: 'The bridge that triggers the time-slip', where: 'Seongbuk-gu' },
              { place: 'Bokjeong Well', placeKo: '복정우물', scene: 'Sol’s fortune-telling scene', where: 'Bukchon, Jongno-gu' },
              { place: 'Seongsan-ro 22-gil tunnel & stairs', placeKo: '성산로 22길', scene: 'Where Sol patches up Tae-seong', where: 'near Yonsei University' },
              { place: 'Seoul Jungang High School', placeKo: '서울중앙고', scene: 'The high-school scenes, shared with Our Beloved Summer', where: 'Bukchon', caution: 'A working school: weekends only.' },
            ],
          },
          {
            title: 'Queen of Tears', titleKo: '눈물의 여왕', meta: 'tvN · 2024', price: 'Free', posterKey: 'queen-of-tears',
            tagline: 'A chaebol marriage, filmed around Seongbuk-dong.',
            spots: [
              { place: 'Woojung Museum of Korean Stone Art', placeKo: '우리옛돌박물관', scene: 'Baek Hyun-woo’s house', where: 'top of the Seongbuk-dong embassy road' },
              { place: 'CU Myeongdong YWCA', placeKo: 'CU 명동 YWCA점', scene: 'The convenience store he breaks down in early on', where: 'next to the Yi Hoe-yeong bust, Jung-gu' },
              { place: 'BBM baseball centre', placeKo: 'BBM야구장', scene: 'The batting-cage date', where: 'near Namyeong stn' },
            ],
          },
          {
            title: 'Our Beloved Summer', titleKo: '그 해 우리는', meta: 'SBS · 2021', price: 'Free', posterKey: 'our-beloved-summer',
            tagline: 'Bukchon rooftops and a Suwon mural village.',
            spots: [
              { place: 'Seoul Jungang High School', placeKo: '서울중앙고', scene: 'The gothic campus of the high-school years', where: 'Changdeokgung-gil 164, Bukchon', caution: 'Weekends only: Sat 13:00–18:00 (odd weeks) / 09:00–18:00 (even weeks); Sun & holidays 09:00–18:00.' },
              { place: 'Haenggung-dong mural village', placeKo: '행궁동 벽화마을', scene: 'Choi Ung’s studio, the alleys, the Hwaseong fortress-wall walk', where: 'Suwon · ~1 hr from Seoul', caution: 'Choi Ung’s house was briefly a cafe and is now empty and private, don’t go looking for it.' },
              { place: 'Gungpyeong Port', placeKo: '궁평항', scene: 'The seaside episode, including the rain-shower kiss', where: 'Hwaseong' },
            ],
          },
        ],
      },
      {
        title: 'Further afield', subtitle: 'Day trips and overnights, roughly nearest first',
        items: [
          {
            title: 'Goblin', titleKo: '도깨비', meta: 'tvN · 2016', price: 'Free', posterKey: 'goblin',
            tagline: 'The candle scene, on a Gangneung breakwater.',
            spots: [
              { place: 'Jumunjin groyne', placeKo: '주문진 방사제', scene: 'Where Ji Eun-tak blows out the candles and Kim Shin appears', where: 'Gangneung · KTX ~2 hrs', caution: 'It’s a 방사제 (groyne) between Yeongjin and Jumunjin beaches, not the harbour breakwater everyone mislabels. Go early morning or sunset.' },
            ],
          },
          {
            title: 'My Love from the Star', titleKo: '별에서 온 그대', meta: 'SBS · 2013', price: 'Ticketed', posterKey: 'my-love-from-the-star',
            tagline: 'The French storybook village in Gapyeong.',
            spots: [
              { place: 'Petite France', placeKo: '쁘띠프랑스', scene: 'The couple’s escape episodes', where: 'Gapyeong · ~1.5 hrs', caution: 'Pairs with Nami Island on the usual Gapyeong day tour.' },
            ],
          },
          {
            title: 'All of Us Are Dead', titleKo: '지금 우리 학교는', meta: 'Netflix · 2022', price: 'Free outside', posterKey: 'all-of-us-are-dead',
            tagline: 'Hyosan High is a real, disused Andong school.',
            spots: [
              { place: 'Former Seonghui Girls’ High School', placeKo: '옛 성희여고', scene: 'Hyosan High, where the outbreak starts', where: 'Andong · ~3 hrs', caution: 'Andong is worth the trip for Hahoe Folk Village, itself a model behind KPop Demon Hunters.' },
            ],
          },
          {
            title: 'Mr. Sunshine', titleKo: '미스터 션샤인', meta: 'tvN · 2018', price: 'Ticketed', posterKey: 'mr-sunshine',
            tagline: 'A standing open-air set of 1900s Korea.',
            spots: [
              { place: 'Sunshine Studio', placeKo: '선샤인스튜디오', scene: 'Glory Hotel and the whole turn-of-the-century town', where: 'Nonsan · ~2.5 hrs', caution: 'Part of Nonsan Sunshine Land, with a 1950s street set alongside.' },
            ],
          },
          {
            title: 'The Glory', titleKo: '더 글로리', meta: 'Netflix · 2022', price: 'Free', posterKey: 'the-glory',
            tagline: 'The baduk park is the easy one, in Incheon.',
            spots: [
              { place: 'Cheongna Lake Park', placeKo: '청라호수공원', scene: 'The baduk park where Dong-eun and Yeo-jeong play', where: 'Incheon' },
              { place: 'Solbit Elementary & a Nonsan high school', placeKo: '솔빛초 · 논산', scene: 'The school scenes', where: 'Sejong & Nonsan', caution: 'Much further out than the Incheon park.' },
            ],
          },
          {
            title: 'Descendants of the Sun', titleKo: '태양의 후예', meta: 'KBS · 2016', price: 'Ticketed', posterKey: 'descendants-of-the-sun',
            tagline: 'The fictional Uruk was a Gangwon coal mine.',
            spots: [
              { place: 'Samtan Art Mine', placeKo: '삼탄아트마인', scene: 'The Uruk base', where: 'Jeongseon', caution: 'A decommissioned mine, now a genuinely striking art space. The old Hanbo mine in Taebaek was also used.' },
            ],
          },
          {
            title: 'Crash Landing on You', titleKo: '사랑의 불시착', meta: 'tvN · 2019', price: 'Free', posterKey: 'crash-landing-on-you',
            tagline: 'The Korean scenes, not the Swiss postcards.',
            spots: [
              { place: 'Jeongseon hills', placeKo: '정선', scene: 'The paraglider crash', where: 'Gangwon' },
              { place: 'Cheongpodae Beach', placeKo: '청포대해변', scene: 'The lakeside walk', where: 'Taean' },
              { place: 'Binaeseom reed flats', placeKo: '비내섬', scene: 'The reed-field scenes', where: 'Chungju', caution: 'The North Korean village was a temporary set and is gone, don’t book a “village” tour.' },
            ],
          },
          {
            title: 'Twenty-Five Twenty-One', titleKo: '스물다섯 스물하나', meta: 'tvN · 2022', price: 'Free', posterKey: 'twenty-five-twenty-one',
            tagline: 'Jeonju’s hanok quarter, the bibimbap city.',
            spots: [
              { place: 'Omokdae', placeKo: '오목대', scene: 'Where Hee-do and Yi-jin first meet, in the Jeonju Hanok Village', where: 'Jeonju · KTX ~1.5 hrs' },
            ],
          },
          {
            title: 'Extraordinary Attorney Woo', titleKo: '이상한 변호사 우영우', meta: 'ENA · 2022', price: 'Free', posterKey: 'extraordinary-attorney-woo',
            tagline: 'The 500-year-old tree from the Sodeok-dong case.',
            spots: [
              { place: 'Bukbu-ri hackberry tree', placeKo: '북부리 팽나무', scene: 'The Sodeok-dong tree, 16m tall, 27m crown', where: 'Changwon · ~3.5 hrs', caution: 'A village tree in a farming hamlet with no tourist infrastructure. A pilgrimage, not a stop.' },
            ],
          },
        ],
      },
    ],
    swatch: ['#5f6d53', '#a9bf94'],
  },
  {
    slug: 'olive-young-must-buys', kind: 'guide', category: 'Shopping', photoUrl: COVER.oliveYoung,
    title: 'Olive Young Haul', subtitle: 'The complete K-beauty playbook', badge: '💄 Shopping', updated: 'Jul 2026',
    refresh: {
      source: "Olive Young's own in-app ranking (올리브영 랭킹) + Glowpick/Hwahae top-rated, cross-checked against r/AsianBeauty & r/KoreanBeauty chatter",
      cadence: 'quarterly',
      targets: ['🔥 Trending right now'],
      lastRefreshed: '2026-07',
      recipe: "Rewrite ONLY the '🔥 Trending right now' items with what's actually topping the rankings this quarter, real product + brand names, current shelf price AND typical promo price, and a one-line reason each is trending (ranking position, viral moment, or a collab). No generic category filler. Also refresh the section subtitle's date and bump both `updated` and refresh.lastRefreshed. Live-research via WebSearch/WebFetch (rankings 403 on plain scrape), don't reuse stale knowledge.",
    },
    description: "Korea's beauty mega-chain, 1,300+ stores, open till 10–11pm on every major street. This is the deep guide: what actually sells, when the big sales hit, and every hack the locals use. Prices below are regular shelf prices; during Olive Young Sale weeks most of these drop 30–50%.",
    meta: [{ icon: 'sparkle', label: '30 picks' }, { icon: 'won', label: 'Tax refund ₩15k+' }, { icon: 'clock', label: 'Sales: Mar·Jun·Sep·Dec' }],
    tips: [
      'Instant tax refund at checkout on ₩15,000+ per receipt, just show your passport. No airport paperwork.',
      'Olive Young SALE runs ~10 days each quarter (early Mar / Jun / Sep / Dec), up to 50% off bestsellers. Plan your haul around it if you can.',
      'Download the Olive Young Global app: membership QR gets member prices, and you can check English ingredient lists + reviews by scanning barcodes.',
      "Myeongdong Town flagship (3 floors) has a Global Lounge with English-speaking staff, luggage storage, and every tester imaginable.",
      'In Seoul, stores offer same-day delivery to hotels (오늘드림), buy heavy hauls early, travel light all day.',
      'The December Olive Young Awards list = the definitive bestseller bible. Awards-sticker items are safe blind buys.',
      'Myeongdong branches are packed 7–10pm; mornings are calm and testers are clean.',
    ],
    sections: [
      {
        title: '🔥 Trending right now',
        subtitle: 'What\'s actually topping Olive Young\'s ranking + Glowpick as of Jul 2026. PDRN serums and suncare are dominating. Rotates a few times a year',
        items: [
          { name: 'Anua PDRN Hyaluronic Capsule 100 Serum', nameKo: '아누아 PDRN 히알루론산 캡슐 100 세럼', tag: 'OY ranking top-5', price: '₩39,000 (often deeply discounted on promo)', note: 'The serum that made PDRN mainstream and still sits in Olive Young\'s skincare top 5 more than a year on. Salmon-DNA-derived PDRN + 11 types of hyaluronic acid + collagen, 30ml, for hydration and plumping.', swatch: ['#5b6f9c', '#8fb0c0'] },
          { name: 'VT Cosmetics PDRN Riddle Shot 100', nameKo: '브이티 PDRN 리들샷 100', tag: 'Rising PDRN pick', price: 'from ~₩30,000 (50ml)', note: 'The PDRN ampoule climbing fastest right now. VT\'s microneedle "spicule" tech physically boosts absorption, aimed at rough, uneven texture. Bigger 50ml bottle than most PDRN rivals.', swatch: ['#c75c54', '#e3a9a0'] },
          { name: 'Medicube PDRN Pink Peptide Ampoule', nameKo: '메디큐브 PDRN 핑크 펩타이드 앰플', tag: 'Budget PDRN', price: '~₩10,000–30,000 (30ml)', note: 'The accessible way into the PDRN trend, a light water-layering texture with none of the stickiness or pilling that put people off ampoules.', swatch: ['#e3a9a0', '#c75c54'] },
          { name: 'Goodal Houttuynia Cordata Calming Sun Cream', nameKo: '구달 맑은 어성초 진정 수분 선크림', tag: '#1 sunscreen', price: '₩22,000', note: 'Now the outright #1 sunscreen on the Olive Young rankings, not just a top-3 regular. The reason people keep repurchasing: it\'s light enough that base makeup never slides or pills over it.', swatch: ['#a9bf94', '#5f6d53'] },
          { name: 'Wellage Real Hyaluronic Blue Sun Cream', nameKo: '웰라쥬 리얼 히알루로닉 블루 선크림', tag: 'Top 3 sunscreen', price: '₩25,000', note: 'The current #3, zero white cast and, unusually, no stinging around the eyes, with a slip closer to a moisturiser than a sunscreen.', swatch: ['#8fb0c0', '#dbe7ee'] },
        ],
      },
      {
        title: '☀️ Suncare, the #1 haul category',
        subtitle: 'Korean sunscreens are why people fly here',
        items: [
          { name: 'Beauty of Joseon Relief Sun', nameKo: '조선미녀 맑은쌀 선크림', tag: 'All-time bestseller', price: '₩18,000', note: 'Rice + probiotics, zero white cast, dewy finish. THE viral one, often purchase-limited during sales.', swatch: ['#caa05a', '#e3c25f'] },
          { name: 'skin1004 Hyalu-Cica Water-Fit Sun Serum', nameKo: '스킨1004 히알루시카 선세럼', tag: 'Awards winner', price: '₩19,000', note: 'Serum-texture SPF50+ that layers under makeup without pilling.', swatch: ['#5f6d53', '#a9bf94'] },
          { name: 'Round Lab Birch Juice Moisturizing Sun Cream', nameKo: '라운드랩 자작나무 수분 선크림', tag: '#2 sunscreen', price: '₩25,000', note: 'Hydrating daily SPF for dry/sensitive skin, sits at #2 on the current rankings. Lotion-like and white-cast-free enough to be anyone\'s everyday one.', swatch: ['#8fb0c0', '#dbe7ee'] },
          { name: 'Isntree Hyaluronic Acid Airy Sun Stick', nameKo: '이즈앤트리 에어리 선스틱', price: '₩16,000', note: 'Stick format for reapplying over makeup, perfect for a walking-heavy trip.', swatch: ['#c8b88a', '#efe2c0'] },
        ],
      },
      {
        title: '💧 Skincare icons',
        subtitle: 'The essences and serums with global cult followings',
        items: [
          { name: 'COSRX Advanced Snail 96 Mucin Essence', nameKo: '코스알엑스 스네일 96', tag: 'Cult classic', price: '₩18,000', note: '96% snail secretion for the glass-skin look. Cheaper here than anywhere on earth.', swatch: ['#5f6d53', '#a9bf94'] },
          { name: 'Anua Heartleaf 77% Soothing Toner', nameKo: '아누아 어성초 77 토너', tag: 'TikTok viral', price: '₩19,000', note: 'Calms redness and irritated skin, the gateway Anua product.', swatch: ['#7a4a2a', '#e0a05a'] },
          { name: 'Torriden DIVE-IN Serum', nameKo: '토리든 다이브인 세럼', tag: 'Awards winner', price: '₩16,000', note: '5-molecule hyaluronic hydration bomb. Korea\'s #1 serum multiple years running.', swatch: ['#5b6f9c', '#8fb0c0'] },
          { name: 'Mixsoon Bean Essence', nameKo: '믹순 콩에센스', price: '₩22,000', note: 'Fermented soybean essence, the “skin flooding” trend hero.', swatch: ['#caa05a', '#e3c25f'] },
          { name: 'Medicube Zero Pore Pads 2.0', nameKo: '메디큐브 제로모공패드', price: '₩25,000', note: 'Exfoliating toner pads; travel-friendly jar. Pairs with their viral booster devices.', swatch: ['#c75c54', '#e3a9a0'] },
        ],
      },
      {
        title: '🎭 Masks & overnight care',
        items: [
          { name: 'Biodance Bio-Collagen Real Deep Mask', nameKo: '바이오던스 콜라겐 마스크', tag: 'Sold-out famous', price: '₩4,000 ea', note: 'Overnight hydrogel that turns transparent when done. The current it-mask, grab multipacks.', swatch: ['#dbe7ee', '#8fb0c0'] },
          { name: 'Mediheal sheet masks', nameKo: '메디힐 마스크팩', tag: 'Buy in bulk', price: '₩900–1,500 ea', note: 'Box of 10 costs less than 3 masks abroad. Tea tree + collagen are the safe picks.', swatch: ['#3a2c22', '#caa05a'] },
          { name: 'Abib Gummy Sheet Mask', nameKo: '아비브 껌딱지 마스크', price: '₩3,500 ea', note: 'Sticks like gum so you can walk around while it works. Heartleaf for calming.', swatch: ['#a9bf94', '#5f6d53'] },
          { name: 'Laneige Lip Sleeping Mask', nameKo: '라네즈 립 슬리핑 마스크', tag: 'Gift favorite', price: '₩22,000', note: "Berry overnight lip mask, the easiest gift in the store, doesn't spill.", swatch: ['#c75c54', '#e3a9a0'] },
        ],
      },
      {
        title: '💄 Makeup that flies home',
        items: [
          { name: "rom&nd Juicy Lasting Tint", nameKo: '롬앤 쥬시 래스팅 틴트', tag: 'Bestseller', price: '₩9,900', note: 'Glassy water-tint in 20+ shades. #06 Figfig is the eternal top seller.', swatch: ['#c75c54', '#e3a9a0'] },
          { name: 'Peripera Ink the Velvet', nameKo: '페리페라 잉크더벨벳', price: '₩9,000', note: 'Weightless matte lip stain. K-drama lips in one swipe.', swatch: ['#b0466a', '#e084a0'] },
          { name: 'CLIO Kill Cover Mesh Glow Cushion', nameKo: '클리오 킬커버 쿠션', price: '₩32,000', note: 'The cushion foundation to try if you\'ve never used one. Testers at every counter.', swatch: ['#c8b88a', '#efe2c0'] },
          { name: 'MUZIGAE MANSION Objet Liquid', nameKo: '무지개맨션 오브제 리퀴드', tag: 'Trendy', price: '₩17,000', note: 'Matte liquid lip in gallery-worthy packaging. Gen-Z Seoul in a bottle.', swatch: ['#5b6f9c', '#8fb0c0'] },
        ],
      },
      {
        title: '🧴 Hair, body & cleansing',
        items: [
          { name: "Ma:nyo Pure Cleansing Oil", nameKo: '마녀공장 클렌징 오일', tag: 'Awards winner', price: '₩15,000', note: 'Korea\'s #1 first-cleanser. Dissolves sunscreen without stripping.', swatch: ['#caa05a', '#e3c25f'] },
          { name: 'mise-en-scène Perfect Serum', nameKo: '미쟝센 퍼펙트세럼', price: '₩9,000', note: 'Argan hair serum, salon gloss for convenience-store money.', swatch: ['#7a4a2a', '#e0a05a'] },
          { name: 'KUNDAL Honey & Macadamia Shampoo', nameKo: '쿤달 샴푸', price: '₩9,900', note: 'Cult perfumed shampoo; cherry blossom scent sells out first.', swatch: ['#a9bf94', '#5f6d53'] },
          { name: 'ILLIYOON Ceramide Ato Lotion', nameKo: '일리윤 세라마이드 로션', price: '₩13,000', note: 'Family-size body lotion for eczema-prone skin, pharmacist recommended.', swatch: ['#dbe7ee', '#8fb0c0'] },
        ],
      },
      {
        title: '📅 Sale calendar & events',
        subtitle: 'Time your haul, the discounts are real',
        items: [
          { name: 'Olive Young SALE (quarterly)', nameKo: '올영세일', tag: 'Up to 50%', price: 'Mar · Jun · Sep · Dec', note: '~10 days at the start of each quarter-month. Suncare and masks hit their yearly lows; popular items sell out by evening.', emoji: '🏷️' },
          { name: 'Olive Young Awards', nameKo: '올리브영 어워즈', price: 'December', note: "Year-end bestseller rankings across every category, look for the Awards shelf tags. It doubles as next year's shopping list.", emoji: '🏆' },
          { name: 'Brand Days & app coupons', price: 'Monthly', note: 'Rotating single-brand deals (20–30%) announced in the Global app. Check the app the morning you shop.', emoji: '📱' },
          { name: 'Global Lounge events (Myeongdong Town)', price: 'Ongoing', note: 'Tourist-only samples, mini-classes and photo events at the flagship, bring your passport.', emoji: '🎁' },
        ],
      },
      {
        title: '🧠 Checkout hacks',
        items: [
          { name: 'Instant tax refund', price: '₩15,000+ / receipt', note: 'Passport at the till = VAT knocked off on the spot (foreign tourists). Works at every branch, purchase caps apply.', emoji: '🛂' },
          { name: 'Today Delivery (오늘드림)', price: '~₩2,500–5,000', note: 'Same-day delivery to your Seoul hotel. Buy at 11am, it beats you home. Staff can set it up at checkout.', emoji: '📦' },
          { name: 'Barcode-scan reviews', price: 'Free', note: 'Scan any product in the Global app for English ingredients + real Korean review scores before you commit.', emoji: '🔎' },
          { name: 'Ask for samples', price: 'Free', note: 'Bigger baskets earn handfuls of sachets, just ask "샘플 주세요" (sample juseyo) at checkout.', emoji: '🫙' },
        ],
      },
    ],
    swatch: ['#c75c54', '#e3a9a0'],
  },
  {
    slug: 'daiso-finds', kind: 'guide', category: 'Shopping', photoUrl: COVER.daiso, updated: 'Jul 2026',
    title: 'Daiso ₩1,000 Finds', subtitle: 'Cheap souvenirs & travel hacks', badge: '🛍️ Shopping',
    refresh: {
      source: "Daiso beauty sellout ('품절 대란') coverage in Korean beauty press + Olive Young/Daiso viral collab news; r/AsianBeauty for the ones foreigners actually seek out",
      cadence: 'quarterly',
      targets: ['🔥 Beauty sellouts right now'],
      lastRefreshed: '2026-07',
      recipe: "Rewrite ONLY the '🔥 Beauty sellouts right now' items with the lines currently driving the sellout headlines, real product + brand, exact Daiso price tier, and why it sold out (a specific collab, a dupe of a pricier product, a viral post). Refresh the subtitle date and bump `updated` + refresh.lastRefreshed. Daiso Mall is a JS SPA, research via WebSearch, not a fetch.",
    },
    description: "Korea's everything-store, where almost nothing tops ₩5,000. Equal parts souvenir goldmine and traveler's lifesaver, the trip-saving item you didn't pack is almost always a few thousand won away here. Fixed price tiers (₩1,000 / 2,000 / 3,000 / 5,000), no haggling, cards accepted.",
    meta: [{ icon: 'sparkle', label: '20 picks' }, { icon: 'won', label: '₩1,000–5,000' }],
    tips: [
      'Price tiers are color-coded on the shelf label, check before the till.',
      'Biggest branches: Myeongdong (multi-floor, tourist-stocked) and Hongdae; the Myeongdong flagship near Euljiro is the largest in the city.',
      'Great for last-minute gifts: socks, masks, snacks, stationery, buy in bulk, it barely dents the wallet.',
      'No tax refund here, prices are already rock-bottom, so Daiso is excluded from most Tax Free schemes.',
      "Daiso's beauty boom is real, not hype: many lines are made by Korea's own top contract manufacturers (Kolmar, Cosmax, the same factories behind Olive Young and department-store brands), just repackaged without the marketing markup. That's why the formulas hold up.",
      'Keep the receipt if you buy anything electronic (chargers, adapters), exchanges need it within 7 days.',
    ],
    sections: [
      {
        title: '🔥 Beauty sellouts right now',
        subtitle: 'The lines actually causing the "품절 대란" (sellout frenzy) headlines (Jul 2026). Daiso beauty has shifted to ingredient-led skincare (PDRN, retinol), all at the ₩5,000 ceiling. Rotates a few times a year',
        items: [
          { name: 'ZOOM by Jung Saem Mool', nameKo: '줌 바이 정샘물', tag: 'The defining sellout', price: 'Toner pads ₩1,000 · cushion/foundation/fixer ₩5,000', note: "A real collab with makeup artist Jung Saem Mool's own brand, priced at a fraction of her department-store line, it emptied shelves nationwide on launch and still restocks-and-vanishes. Check more than one branch; city-center stores restock fastest.", emoji: '💄' },
          { name: 'VT PDRN Radiance Toner', nameKo: 'VT PDRN 광채 토너', tag: 'PDRN for ₩5,000', price: '₩5,000', note: "PDRN, the salmon-DNA ingredient driving Olive Young's entire trending shelf right now, in a Daiso-priced toner, from the same VT that makes the ₩30,000 PDRN ampoule. The cheapest way on earth to try the trend.", emoji: '💧' },
          { name: 'Bonsep Retinol 500 IU Serum', nameKo: '본셉 레티놀 500 IU 세럼', tag: 'Retinol, drugstore price', price: '₩5,000 (30ml)', note: 'Real retinol home-care for pores and firmness at a price that makes it a no-risk first try, the reason ingredient-led skincare, not makeup, is now what sells out here.', emoji: '🧪' },
          { name: 'Vitamin Brightening Peeling Pads', nameKo: '비타민 미백 필링패드', tag: 'Restock-and-gone', price: '₩5,000 (60 pads)', note: 'Daily exfoliating pads with a fast repurchase cycle, which is exactly why they are permanently out of stock, 60 sheets for ₩5,000 undercuts every Olive Young equivalent.', emoji: '🍋' },
          { name: 'The Lab by Blanc Doux Clear Hyal Glow Cream', nameKo: '더랩 바이 블랑두 클리어 히알 물광 크림', tag: 'Makeup-base hit', price: '₩5,000 (50ml)', note: 'A hydrating base cream that stops foundation separating, light enough to layer under makeup, which is what pushed it past the "cheap cream" reputation.', emoji: '✨' },
        ],
      },
      {
        title: '🧳 Travel lifesavers',
        subtitle: 'The stuff you forgot to pack',
        items: [
          { name: 'Travel toiletry bottles', nameKo: '여행용 공병', tag: 'Lifesaver', price: '₩1,000–3,000', note: 'Refill your Olive Young finds for carry-on-safe sizes.', emoji: '🧴' },
          { name: 'Packing cubes & pouches', nameKo: '압축 파우치', price: '₩2,000–5,000', note: 'Compress a half-empty suitcase before the flight home.', emoji: '🎒' },
          { name: 'Phone & cable accessories', nameKo: '휴대폰 액세서리', price: '₩2,000–5,000', note: 'Adapters, cables, grips, phone stands, handy mid-trip, cheaper than a convenience store.', emoji: '🔌' },
          { name: 'Portable mini fan / umbrella', nameKo: '휴대용 선풍기·우산', price: '₩3,000–5,000', note: 'Summer humidity and jangma (monsoon) rain both hit fast, grab one the day you need it.', emoji: '🌂' },
          { name: 'Foldable shopping bag', nameKo: '접이식 장바구니', price: '₩1,000–2,000', note: 'Korea charges for plastic bags almost everywhere, bring your own.', emoji: '🛍️' },
        ],
      },
      {
        title: '🎁 Souvenirs & gifts',
        items: [
          { name: 'Korean character socks', nameKo: '캐릭터 양말', tag: 'Souvenir', price: '₩1,000–2,000', note: 'Cheapest, lightest gift to bring home in bulk.', emoji: '🧦' },
          { name: 'Hanji & traditional stationery', nameKo: '한지 문구', price: '₩2,000–5,000', note: 'Pretty notebooks, bookmarks, postcards, nicer than they look at this price.', emoji: '📝' },
          { name: 'Korean snacks & candy', nameKo: '과자 · 사탕', price: '₩1,000–3,000', note: 'A whole aisle of giftable snacks, cheaper than the airport or a convenience store.', emoji: '🍬' },
          { name: 'Mini cosmetics tools', nameKo: '뷰티 소품', price: '₩1,000–3,000', note: 'Makeup sponges, brushes, tweezers, cotton pads, solid basics, no need for a name brand.', emoji: '💄' },
        ],
      },
      {
        title: '🏠 If you\'re staying a while',
        subtitle: 'For longer stays, an Airbnb, or a dorm room',
        items: [
          { name: 'Basic kitchenware', nameKo: '주방용품', price: '₩1,000–5,000', note: 'Bowls, chopsticks, a small pan, enough to self-cater an extended stay cheaply.', emoji: '🍳' },
          { name: 'Hangers & storage boxes', nameKo: '옷걸이·수납함', price: '₩1,000–3,000', note: 'Airbnbs are notoriously short on hangers and closet space.', emoji: '🧺' },
          { name: 'Slippers & bath items', nameKo: '슬리퍼·목욕용품', price: '₩1,000–3,000', note: 'Indoor slippers are a real Korean-home habit, worth adopting even short-term.', emoji: '🩴' },
        ],
      },
    ],
    swatch: ['#5b6f9c', '#8fb0c0'],
  },
  {
    slug: 'korea-souvenirs', kind: 'guide', category: 'Shopping', photoUrl: COVER.ssamziegil, updated: 'Jul 2026',
    title: 'What to Bring Home', subtitle: 'Beyond beauty, the classic Korea gifts', badge: '🎁 Shopping',
    refresh: {
      source: 'Retail price spot-checks at the venues named in the card (Namdaemun, marts, department-store food halls, duty-free) + any new must-buy gift trend',
      cadence: 'annual',
      targets: ['🍵 Food & drink gifts', '🪡 Craft & keepsake gifts', 'Where to actually buy them'],
      lastRefreshed: '2026-07',
      recipe: "Yearly price sanity-check: verify the ₩ figures on the gift items and the 'Where to actually buy them' compare table haven't drifted, and swap in any newly-popular gift if the classics have shifted. Prices drift slowly here, so this is a correction pass, not a rewrite. Bump `updated` + refresh.lastRefreshed.",
    },
    description: "If Olive Young and Daiso cover the beauty run and the cheap-and-cheerful gifts, this is the other half: the food, drink and craft items Koreans themselves give as gifts, ginseng, seaweed, traditional sweets, and where each one is actually worth buying.",
    meta: [{ icon: 'sparkle', label: '12 picks' }, { icon: 'won', label: '₩3,000–140,000' }],
    tips: [
      'Ginseng and red ginseng (홍삼) products are Korea\'s single most classic gift, look for a KGC (정관장) label for the real, regulated stuff.',
      'Instant/ready meal-kits (라면, 즉석밥, 김치) travel surprisingly well and read as a "real Korea" gift, not a tourist trinket.',
      'Alcohol: 1 bottle of spirits is duty-free per adult, a nice bottle of premium soju or takju (rice wine) is a better gift than the convenience-store green bottle.',
      'Skip fresh/perishable food gifts (rice cakes, fresh kimchi) unless you\'re flying home within a day or two.',
    ],
    sections: [
      {
        title: '🍵 Food & drink gifts',
        items: [
          { name: 'Red ginseng products', nameKo: '홍삼', price: '₩15,000–140,000', note: 'Extract sticks, candy or tea start around ₩15,000; a proper KGC (정관장) boxed gift set, the one that actually reads as a serious gift in Korea, runs ₩57,000 for the entry sets up to ₩140,000 for the Everytime Limited tier.', tag: 'Classic', emoji: '🌿' },
          { name: 'Roasted seaweed (gim)', nameKo: '조미김', price: '₩3,000–10,000', note: 'Individually wrapped snack packs travel perfectly and everyone likes them.', emoji: '🌊' },
          { name: 'Yuja (citron) tea', nameKo: '유자차', price: '₩8,000–15,000', note: 'A jar of citron-honey marmalade, just add hot water. Great cold-season gift.', emoji: '🍯' },
          { name: 'Premium instant noodles', nameKo: '고급 라면 세트', price: '₩10,000–20,000', note: 'Gift-boxed ramyeon sets (Shin Ramyeon, Jjapaguri), a fun, real gift for foodie friends.', emoji: '🍜' },
          { name: 'Hangwa (traditional sweets)', nameKo: '한과', price: '₩10,000–25,000', note: 'Honey cookies and rice-puff candy in a nice box, sold at markets and department stores.', emoji: '🍡' },
          { name: 'Premium soju / takju gift set', nameKo: '전통주 선물세트', price: '₩15,000–40,000', note: 'A boxed bottle of a craft or premium label reads far better than the everyday green bottle.', tag: 'Duty-free eligible', emoji: '🍶' },
        ],
      },
      {
        title: '🪡 Craft & keepsake gifts',
        items: [
          { name: 'Norigae / hanbok tassels', nameKo: '노리개', price: '₩5,000–20,000', note: 'Traditional silk knot ornaments, small, light, genuinely pretty.', emoji: '🎗️' },
          { name: 'Celadon pottery (small)', nameKo: '고려청자 소품', price: '₩10,000–40,000', note: 'Small jade-green celadon dishes or cups. Insadong has the best selection.', emoji: '🏺' },
          { name: 'Mother-of-pearl (najeon) items', nameKo: '자개', price: '₩10,000–50,000', note: 'Inlaid lacquerware boxes, mirrors and jewelry, a genuinely distinctive craft souvenir.', emoji: '✨' },
          { name: 'Dancheong-pattern items', nameKo: '단청무늬 소품', price: '₩5,000–15,000', note: 'Palace-roof color patterns on fans, pouches, and phone cases, very "Seoul" as a keepsake.', emoji: '🎨' },
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
    refresh: {
      source: 'Recent Gwangjang/Myeongdong street-food price reports (news + travel blogs), the ₩ figures are the perishable part',
      cadence: 'annual',
      targets: ['items'],
      lastRefreshed: '2026-07',
      recipe: "Yearly pass: the dishes are evergreen, but the `price` on each item drifts with inflation (tteokbokki, hotteok, gyeranppang have all crept up). Verify current typical cart prices and correct them; leave the picks and notes unless a famous stall closed. Bump `updated` + refresh.lastRefreshed.",
    },
    description: 'The pojangmacha (street cart) classics every visitor should try at least once, with the famous streets to find them, what you should pay, and the rookie mistakes to avoid.',
    meta: [{ icon: 'sparkle', label: '9 must-eats' }, { icon: 'won', label: '₩1,000–10,000' }],
    tips: [
      'Cash is still king at most carts, carry small ₩1,000 notes, though QR/mobile payment is spreading fast, especially at busier stalls.',
      'Confirm the price and quantity before you order (point at the sign).',
      "Eat at the cart, many don't allow walking off with the plate/skewer.",
      'Winter-only treats (bungeoppang, hotteok) vanish in summer.',
    ],
    items: [
      { name: 'Bungeoppang', nameKo: '붕어빵', emoji: '🐟', price: '~₩1,000 each', where: 'Winter carts citywide', note: 'Fish-shaped pastry filled with sweet red bean (or custard). Once the cheapest snack in Korea at 3–5 for ₩1,000, flour, red bean and gas costs have pushed it to roughly ₩1,000 a piece, which locals grumble about every winter.', caution: 'Winter only · cash · confirm pieces-per-price before handing over money.' },
      { name: 'Tteokbokki', nameKo: '떡볶이', emoji: '🌶️', price: '₩3,000–4,000', where: 'Sindang Tteokbokki Town', note: 'Chewy rice cakes in sweet-spicy gochujang sauce.', caution: 'Spicier than it looks, ask for 안 맵게 (mild).' },
      { name: 'Twigim', nameKo: '튀김', emoji: '🍤', price: '₩4,000–5,000', where: 'Sold alongside tteokbokki, almost everywhere', note: 'Battered, deep-fried skewers and vegetables, sweet potato, squid, mandu (dumplings). Usually a set alongside tteokbokki, dip it in the sauce.' },
      { name: 'Korean Corn Dog', nameKo: '콘도그 · 핫도그', emoji: '🌭', price: '₩3,000–7,000', where: 'Hongdae, Myeongdong, most markets', note: 'The modern viral one, a hot dog on a stick in a thick batter crust, often rolled in cubed potato, ramen crumbs, or cheese pull filling. The potato version runs around ₩4,000.' },
      { name: 'Sundae', nameKo: '순대', emoji: '🌀', price: '₩5,000–10,000', where: 'Markets, esp. Gwangjang & Namdaemun', note: 'Korean blood sausage, glass noodles and pork stuffed into intestine casing, sliced and served with a salt-and-pepper dip. Ask for 순대곱창 if you want it with grilled offal too.', caution: 'A genuinely different texture from Western sausage, order a small portion first if unsure.' },
      { name: 'Hotteok', nameKo: '호떡', emoji: '🥞', price: '₩1,500–2,000', where: 'Namdaemun Market', note: 'Griddled sweet pancake with brown-sugar syrup + nuts.', caution: 'Molten-hot filling, let it cool a few seconds!' },
      { name: 'Gimbap / Cup bap', nameKo: '컵밥', emoji: '🍱', price: '₩3,500–5,000', where: 'Noryangjin exam district', note: 'Rice + toppings in a cup, the student fuel of Seoul.', caution: 'Portions vary wildly by stall; peek before ordering.' },
      { name: 'Eomuk / Odeng', nameKo: '어묵', emoji: '🍢', price: '₩1,000 / skewer', where: 'Any cart, esp. winter', note: 'Fish-cake skewers; the warm broth is usually free.', caution: 'Keep your stick, you pay by the skewer count.' },
      { name: 'Gyeranppang', nameKo: '계란빵', emoji: '🥚', price: '₩1,500–2,000', where: 'Hongdae & Myeongdong', note: 'Fluffy oval bread baked with a whole egg inside.', caution: 'Best eaten hot off the griddle.' },
    ],
    streets: [
      { name: 'Myeongdong Street', nameKo: '명동 거리', note: 'Tourist-central; huge variety but priciest.' },
      { name: 'Gwangjang Market', nameKo: '광장시장', note: 'Classic sit-down stalls, bindaetteok, mayak gimbap.' },
      { name: 'Sindang Tteokbokki Town', nameKo: '신당동 떡볶이 골목', note: 'The home of rabokki and stir-fried tteokbokki.' },
      { name: 'Namdaemun Market', nameKo: '남대문시장', note: 'Hotteok, hairtail stew alley, old-school eats.' },
    ],
    swatch: ['#7a4a2a', '#e0a05a'],
  },
  {
    slug: 'getting-around-seoul', kind: 'guide', category: 'Getting Around', photoUrl: COVER.seoullo,
    title: 'Getting Around', subtitle: 'Subway, buses & the T-money system', badge: '🚇 Transport',
    refresh: {
      source: 'Seoul Metro / TOPIS official base-fare notices (fares change by government announcement, not continuously)',
      cadence: 'annual',
      targets: ['Modes of transport'],
      lastRefreshed: '2026-07',
      recipe: "Check whether Seoul's base transit fare or the T-money card price changed since last refresh (fare hikes are announced events, easy to verify). Update the ₩ figures in the 'Modes of transport' items only if there was an actual change. Bump `updated` + refresh.lastRefreshed.",
    },
    description: 'How locals actually move around Seoul, one tap-card for everything, color-coded buses, and the unspoken rules that keep you from an awkward moment (or an overcharge).',
    meta: [{ icon: 'won', label: 'Subway base ₩1,550' }, { icon: 'info', label: 'Transfers free ≤30 min' }, { icon: 'sparkle', label: 'Subway vs bus vs taxi' }],
    tips: [
      'Buy a T-money card at any station or CU/GS25 (~₩3,000) and load cash, it works on the subway, every bus, and taxis.',
      "On buses, tag your card when boarding AND when getting off, skip the exit tap and you're charged the max fare and lose your free transfer.",
      "No eating or drinking on buses or the subway, even a coffee. It's a real rule, not just etiquette.",
      'Free transfers between subway and bus within 30 minutes (60 at night) as long as you tag on and off.',
      'Leave the pink priority seats empty for elderly, pregnant or disabled riders, even on a packed train.',
    ],
    blocks: [
      {
        type: 'compare', title: 'Which should you take?', subtitle: 'A typical ~5km hop across the city',
        columns: ['Subway', 'City Bus', 'Taxi'],
        rows: [
          { label: 'Speed', values: ['Fast, unaffected by traffic', 'Slower, stuck in the same traffic as cars', 'Fastest door-to-door outside rush hour'] },
          { label: 'Cost', values: ['₩1,550+', '₩1,500+', '₩7,000–10,000+'] },
          { label: 'Best for', values: ['Any long cross-city trip', 'A stop that\'s a subway-free gap, or a one-seat ride you\'d otherwise transfer for', 'Late at night, heavy luggage, or a group splitting the fare'] },
          { label: 'Watch for', values: ['Last trains ~23:30–00:30', 'Mostly Korean-only announcements', '+20–40% surcharge 22:00–04:00'] },
        ],
        note: 'Default to the subway unless one of the "best for" cases applies, it\'s the one mode traffic can\'t touch.',
      },
    ],
    itemsTitle: 'Modes of transport',
    items: [
      { name: 'T-money Card', nameKo: '티머니', emoji: '💳', price: 'Card ₩3,000 + load', where: 'Stations & CU/GS25', note: "One tap pays for subway, buses and taxis, and unlocks free transfers. The smartest first purchase you'll make." },
      { name: 'Subway', nameKo: '지하철', emoji: '🚇', price: '₩1,550+ base', where: 'Lines 1–9 & more', note: 'Fast, cheap, with English signs and announcements. Colour-coded by line, use a metro app. Base fare covers the first 10km, then rises in steps.', caution: "Last trains run ~23:30–00:30, miss it and it's a late-night taxi." },
      { name: 'City Buses', nameKo: '시내버스', emoji: '🚌', price: '₩1,500+ base', where: 'Citywide', note: 'Slightly cheaper than the subway since the 2025 rail-only fare rise. Colour-coded: 🔵 Blue = long trunk routes, 🟢 Green = short neighbourhood hops, 🟡 Yellow = a downtown loop.', caution: 'Announcements are mostly Korean, follow the on-board route map.' },
      { name: 'Red Express Bus', nameKo: '빨간 광역버스', emoji: '🔴', price: '₩2,800+', where: 'Seoul ↔ suburbs', note: 'Wide-area commuter coaches to Gyeonggi cities, seated and highway-fast.', caution: "No large suitcases and limited standing, don't try to board with a carrier." },
      { name: 'Taxi', nameKo: '택시', emoji: '🚕', price: '₩4,800 base', where: 'Street or Kakao T app', note: 'Orange/silver = regular, black = deluxe (pricier). Call and pay cashless with the Kakao T app. Base fare covers 1.6km, then ₩100 per 131m.', caution: 'Late-night surcharge starts at 22:00, not midnight: +20% from 22:00–23:00 and 02:00–04:00 (₩5,800 base), +40% from 23:00–02:00 (₩6,700 base). Leaving the city limits adds another 20%.' },
      { name: 'KTX & Intercity', nameKo: 'KTX·고속버스', emoji: '🚄', price: 'Varies', where: 'Seoul/Yongsan stn · express terminals', note: 'Bullet train or express bus to other cities, book KTX on Korail or at the counter.', caution: 'Sells out weeks ahead around Seollal & Chuseok holidays.' },
    ],
    streetsTitle: 'Apps to download',
    streets: [
      { name: 'Naver Map / Kakao Map', nameKo: '네이버·카카오 지도', note: 'Google Maps is limited in Korea, these give real transit & walking directions.' },
      { name: 'Kakao T', nameKo: '카카오 T', note: 'Hail and pay for taxis cashless, Uber-style.' },
      { name: 'Subway apps', nameKo: '지하철 앱', note: 'Live train times, fastest transfers and last-train alerts.' },
    ],
    swatch: ['#2f4858', '#5b7a99'],
  },
  {
    slug: 'airport-to-seoul', kind: 'guide', category: 'Getting Around', photoUrl: COVER.arex, updated: 'Jul 2026',
    title: 'Airport to Seoul', subtitle: 'From Incheon & Gimpo into the city', badge: '✈️ Arrival',
    refresh: {
      source: 'AREX (공항철도), airport limousine-bus operators, and taxi base-fare notices for current fares/times',
      cadence: 'annual',
      targets: ['Which one should I take?'],
      lastRefreshed: '2026-07',
      recipe: "Verify the fares and journey times in the 'Which one should I take?' compare block against current AREX / limousine-bus / taxi rates (these change by announcement). Correct any drifted figures; the mode line-up is stable. Bump `updated` + refresh.lastRefreshed.",
    },
    description: 'Five ways to get from the airport into central Seoul, what each costs, how long it takes, and which to choose with heavy luggage or after a late-night landing. Built to answer one question fast: which one should I actually take?',
    meta: [{ icon: 'clock', label: '30–90 min' }, { icon: 'won', label: '₩1,550–95,000' }],
    tips: [
      'Pick up a T-money card and a SIM/eSIM right on the arrivals floor before you leave the airport, both counters are past customs, before the exit.',
      'AREX express and the limousine buses are the easiest options with big luggage; the all-stop train gets crowded at the door.',
      'Landing after midnight (00:30–05:00)? Every train and most buses have stopped for the night, budget for a taxi (~₩75,000–95,000) or an airport-area hotel instead of waiting it out.',
      'Airport limousine buses take T-money and cards, but keep ₩20,000 cash as backup, card readers occasionally glitch.',
      'Incheon has two terminals (T1 and T2) linked by a free shuttle train, check which one your airline uses before you plan your exit.',
    ],
    itemsTitle: 'Ways into the city',
    items: [
      { name: 'AREX Express Train', nameKo: '공항철도 직통', emoji: '🚄', price: '₩11,000', where: 'Incheon T1/T2 → Seoul Stn', note: 'Non-stop, ~43 min to Seoul Station, with reserved comfy seats and luggage racks.', caution: 'Runs only ~05:20–22:50.' },
      { name: 'AREX All-Stop Train', nameKo: '공항철도 일반', emoji: '🚇', price: '₩4,750–5,350', where: 'Incheon → Hongdae/Seoul Stn', note: 'The cheapest route; stops everywhere, ~60 min, pay with T-money. T1→Seoul Stn ₩4,750, T2→Seoul Stn ₩5,350 (T2 is further out).', caution: 'Packed at rush hour, tough with big bags.' },
      { name: 'Airport Limousine Bus', nameKo: '공항 리무진', emoji: '🚌', price: '₩16,000–18,000', where: 'Stops near major hotels', note: 'A comfortable coach straight to many neighbourhoods, luggage stowed below.', caution: "Check your hotel's nearest stop and the last departure time." },
      { name: 'Taxi / Kakao T', nameKo: '택시', emoji: '🚕', price: '₩70,000–95,000', where: 'Incheon → city center', note: 'Door to door in ~70 min (a highway toll is included); black deluxe costs more.', caution: "Make sure the meter is on, skip touts offering 'flat fares'." },
      { name: 'Gimpo Airport', nameKo: '김포공항', emoji: '🛫', price: '₩1,550+', where: 'Subway Line 5/9 & AREX', note: 'Much closer than Incheon, the subway reaches the city in ~30 min for a normal fare.' },
    ],
    blocks: [
      {
        type: 'compare', title: 'Which one should I take?', subtitle: 'Incheon → central Seoul, side by side',
        columns: ['AREX Express', 'Limousine Bus', 'Taxi'],
        rows: [
          { label: 'Time', values: ['~43 min', '60–90 min (traffic)', '~70 min'] },
          { label: 'Price', values: ['₩11,000', '₩16,000–18,000', '₩70,000–95,000'] },
          { label: 'Luggage', values: ['Racks on board', 'Stowed below, best for 2+ bags', 'Trunk, easiest, no walking'] },
          { label: 'Best for', values: ['Solo travelers → Seoul Stn', 'Hotel drop-off, groups', 'Late arrivals, door-to-door'] },
        ],
        note: 'On a tight budget with light luggage and going near Seoul Station or Hongdae, skip both and take the AREX All-Stop train for ₩4,750–5,350.',
      },
    ],
    swatch: ['#1f4d4a', '#4a9d8e'],
  },
  {
    slug: 'intercity-transport', kind: 'guide', category: 'Getting Around', photoUrl: COVER.hwarangdaeRail, updated: 'Jul 2026',
    title: 'KTX vs Flight vs Bus', subtitle: 'Getting to other cities, mode by mode', badge: '🚄 Transport',
    refresh: {
      source: 'KORAIL (KTX/SRT), domestic-flight fare ranges, and express-bus fares per route in the compare table',
      cadence: 'annual',
      targets: ['By destination'],
      lastRefreshed: '2026-07',
      recipe: "Verify the door-to-door times and per-mode fares in the 'By destination' compare block against current KORAIL/SRT, domestic-flight, and express-bus prices. Routes/modes are stable; only the ₩ and cheapest-booking-class notes drift. Bump `updated` + refresh.lastRefreshed.",
    },
    description: "Seoul to Busan, Jeonju, Gyeongju, or the east coast, there's almost always a train, a flight and a bus option, and the right pick depends on your bags, your budget and how much you value the 2 extra hours flying eats up in airport time.",
    meta: [{ icon: 'clock', label: '2–5 hrs' }, { icon: 'won', label: '₩17,000–90,000' }],
    tips: [
      'KTX and SRT are the same speed and cover mostly the same routes. SRT is often a bit cheaper but leaves from Suseo or Dongtan, not Seoul Station, so check which is closer to you.',
      "Domestic flights save time on paper, but airport check-in + security + the transfer back into downtown usually eats the time advantage on anything under 3 hours by train.",
      'Book KTX/SRT on the Korail or SRT app (or Naver Map lets you book KTX in-app), seats sell out fast around weekends and any holiday.',
      'Express and intercity buses (고속버스/시외버스) are the budget option and surprisingly comfortable, reserved seats, onboard USB, and they leave far more often than trains.',
      'For the east coast (Sokcho, Gangneung), the KTX-Gangneung line or a direct bus both beat flying, there is no useful airport near Sokcho.',
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
          { label: 'Jeju Island', values: ['No rail link (island)', '~1h · ₩40,000–120,000, the only fast option', 'N/A'] },
        ],
        note: "Jeju is the one route where flying wins outright, it's an island, so KTX/bus aren't options at all. For every mainland city under 3 train-hours away, the train is usually the better call once you count airport time. Note: KTX fares have been frozen since 2011, but Korail is pushing a ~17% rise (Seoul–Busan would go from ₩59,800 to roughly ₩70,000), not in effect yet, so check the app when you book.",
      },
    ],
    itemsTitle: 'Booking apps',
    items: [
      { name: 'Korail (KTX)', nameKo: '코레일톡', emoji: '🚄', price: 'Free app', note: 'Book KTX/ITX/Mugunghwa trains nationwide; English interface, foreign card OK.' },
      { name: 'SRT', nameKo: 'SRT', emoji: '🚈', price: 'Free app', note: 'Slightly cheaper twin to KTX on the same Busan/Mokpo lines, departs Suseo, not Seoul Station.' },
      { name: 'Kobus / Bustago', nameKo: '고속버스', emoji: '🚌', price: 'Free app', note: 'Book express and intercity bus seats. Korean-only UI but Naver Map links straight to seat selection.' },
      { name: 'Naver Map', nameKo: '네이버 지도', emoji: '🗺️', price: 'Free app', note: 'Search a route and it surfaces train, bus and flight options with live prices side by side.' },
    ],
    swatch: ['#2f4858', '#5b7a99'],
  },
  {
    slug: 'yajang-culture', kind: 'guide', category: 'Food & Drink', photoUrl: COVER.ikseon,
    title: 'Korean Yajang Nights', subtitle: 'Open-air drinking, plastic stools & all', badge: '🍺 Culture',
    description: "Yajang (야장) is Korea's open-air drinking culture, plastic tables spilling onto the street outside pubs and markets, best from late spring through autumn. Here's how to do it like a local.",
    meta: [{ icon: 'clock', label: 'Best after 7pm' }, { icon: 'won', label: '₩4,000–20,000' }],
    tips: [
      "Yajang literally means 'night field', outdoor tables on the street, peak season late spring to autumn.",
      'A table usually orders at least one drink plus one anju (안주, sharing food) per group.',
      'Pour for others, never yourself, and hold the bottle with two hands for elders.',
      "You pay when you leave; flag staff with a friendly '여기요!' (yeogiyo).",
      "Cash is king at market yajang, though QR/card readers are becoming more common even at street stalls.",
    ],
    blocks: [
      {
        type: 'steps', title: 'How a yajang night actually goes', subtitle: 'Start to finish',
        steps: [
          { title: 'Grab any open table', note: "No host stand, no reservation, sit wherever there's an open plastic stool.", emoji: '🪑' },
          { title: 'Order at least one drink + one anju', note: 'Anju (안주) is shared food, ordered per table, not per person. A table of 4 splitting one plate is normal.', emoji: '📋' },
          { title: 'Pour for others, never yourself', note: 'Fill your neighbor\'s glass, they fill yours. Hold the bottle with two hands (or one hand + the other touching your forearm) when pouring for someone older.', emoji: '🍶' },
          { title: 'Turn away to drink around elders', note: "A small courtesy: angle your head away and cover your glass slightly when drinking in front of someone senior to you.", emoji: '🙇' },
          { title: 'Reorder as the table empties', note: 'Rounds keep coming until someone calls it, there\'s no last-call rush like Western bars.', emoji: '🔁' },
          { title: 'Flag staff to close out', note: 'You pay when you leave, not per round, call "여기요!" (yeogiyo) and ask for the bill (계산해주세요).', emoji: '🧾' },
        ],
      },
    ],
    itemsTitle: 'The yajang starter kit',
    items: [
      { name: 'Soju', nameKo: '소주', emoji: '🍾', price: '₩4,000–5,000', where: 'Every table', note: 'The classic green-bottle spirit; mix it with beer for somaek (소맥).', caution: 'Sneaky-strong, pace yourself with food and water.' },
      { name: 'Draft Beer', nameKo: '생맥주', emoji: '🍺', price: '₩4,000–6,000', where: 'Hofs & carts', note: "Ice-cold 'saeng-maekju' is the summer yajang staple." },
      { name: 'Anju (sharing food)', nameKo: '안주', emoji: '🍢', price: '₩10,000–20,000', where: 'Order with drinks', note: 'Golbaengi (sea snails), nogari (dried pollack), jokbal or fried chicken, all meant to share.', caution: 'Most spots expect at least one anju per table.' },
      { name: 'Pojangmacha', nameKo: '포장마차', emoji: '🏮', price: 'Varies', where: 'Jongno, Euljiro, markets', note: 'The orange-tented street carts, the original, most atmospheric yajang.', caution: 'Confirm prices first; a few tourist-area tents overcharge.' },
    ],
    streetsTitle: 'Where to find it',
    streets: [
      { name: 'Euljiro Nogari Alley', nameKo: '을지로 노가리골목', note: 'Retro beer alley that turns into a sea of stools after dark.' },
      { name: 'Jongno Pojangmacha Street', nameKo: '종로 포장마차 거리', note: 'Classic tented carts glowing under the city lights.' },
      { name: 'Gwangjang Market', nameKo: '광장시장', note: 'Sit-down market stalls, bindaetteok and makgeolli.' },
      { name: 'Mangwon / Yeonnam', nameKo: '망원·연남동', note: 'Younger crowd, terrace tables and craft beer.' },
    ],
    swatch: ['#5a3a1f', '#d99a4a'],
  },
  {
    slug: 'korea-festivals', kind: 'guide', category: 'Festivals', updated: 'Jul 2026', photoUrl: COVER.festival,
    title: 'Festivals Across Korea', subtitle: 'Province by province, season by season', badge: '🎆 Festivals',
    refresh: {
      source: 'Korea Tourism Organization festival calendar + each festival\'s official dates for the coming season (this card is the evergreen overview; the live dated events live in the separate events pipeline)',
      cadence: 'seasonal',
      targets: ['Festivals by region'],
      lastRefreshed: '2026-07',
      recipe: "Ahead of each season, confirm the marquee festivals in 'Festivals by region' are still running and their rough timing/month is right (some festivals get cancelled or move). Add a newly notable one if warranted. This is the evergreen by-province cheat sheet, dated one-off events belong to the events pipeline, not here. Bump `updated` + refresh.lastRefreshed.",
    },
    description: 'Korea throws a festival for every season and region, cherry blossoms, mud, ice fishing, lanterns and fire. A by-province cheat sheet so you can time a day trip around one.',
    meta: [{ icon: 'globe', label: 'Nationwide' }, { icon: 'sparkle', label: 'Year-round' }],
    tips: [
      'Dates shift yearly with the lunar calendar and the blossoms, check the official date before you travel.',
      'Big festivals fill KTX trains and buses, book intercity tickets early.',
      "Many are strictly seasonal (spring blossoms, summer mud, winter ice), pick by when you're visiting.",
    ],
    itemsTitle: 'Festivals by region',
    items: [
      { name: 'Jinhae Cherry Blossom (Gunhangje)', nameKo: '진해 군항제', emoji: '🌸', price: 'Spring · early Apr', where: 'Gyeongsang · Changwon', note: 'Korea\'s biggest cherry-blossom festival, tunnels of pink over rail tracks and streams.', caution: 'Insanely crowded on weekends; arrive early.' },
      { name: 'Boryeong Mud Festival', nameKo: '보령 머드축제', emoji: '🌊', price: 'Summer · late Jul–early Aug', where: 'Chungcheong · Boryeong', note: 'Wrestle, slide and paint in mineral mud on Daecheon Beach, the long-time foreigner favourite. The 2026 edition runs 24 Jul–9 Aug, so it now spans into August rather than being a Jul-only weekend.', caution: 'Strong sun and big crowds, bring sunscreen and a waterproof bag.' },
      { name: 'Hwacheon Sancheoneo Ice Festival', nameKo: '화천 산천어축제', emoji: '🧊', price: 'Winter · Jan', where: 'Gangwon · Hwacheon', note: 'Ice-fishing for trout through holes in a frozen river, bare-hand catching too.', caution: 'Bitterly cold, serious winter gear required.' },
      { name: 'Andong Mask Dance Festival', nameKo: '안동 탈춤축제', emoji: '🎭', price: 'Autumn · Sep–Oct', where: 'Gyeongsang · Andong', note: 'Traditional masked dance-drama in a UNESCO hanok-village setting.' },
      { name: 'Jinju Namgang Lantern Festival', nameKo: '진주 남강유등축제', emoji: '🏮', price: 'Autumn · Oct', where: 'Gyeongsang · Jinju', note: 'Thousands of lanterns floating on the Namgang River after dark.' },
      { name: 'Jeju Fire Festival', nameKo: '제주 들불축제', emoji: '🔥', price: 'Early spring · Mar', where: 'Jeju · Saebyeol Oreum, Aewol', note: 'Historically a whole hillside was set ablaze, that burning was scrapped over wildfire risk and environmental criticism, and it now runs as a media-art "virtual fire" show with light projection and live performances on the same slope.', caution: 'The most disrupted festival on this list, fully cancelled in 2022, fire elements dropped in 2023, skipped in 2024, and wind-hit in 2025. Confirm it is running before planning a trip around it.' },
      { name: 'Seoul Lantern Festival', nameKo: '서울 등축제', emoji: '🪔', price: 'Autumn · Nov', where: 'Seoul · Cheonggyecheon', note: 'Giant illuminated lanterns lining the downtown stream, easy to reach in the city.' },
      { name: 'Boseong Green Tea Festival', nameKo: '보성 다향대축제', emoji: '🍵', price: 'Spring · May', where: 'Jeolla · Boseong', note: 'Rolling green-tea terraces with hands-on picking and tastings.' },
      { name: 'Busan International Film Festival', nameKo: '부산국제영화제 (BIFF)', emoji: '🎬', price: 'Autumn · Oct', where: 'Gyeongsang · Busan', note: 'Asia’s biggest film festival, centred on the Busan Cinema Center in Haeundae, red carpets, premieres and open-air screenings by the sea.' },
      { name: 'Busan Fireworks Festival', nameKo: '부산불꽃축제', emoji: '🎆', price: 'Autumn · late Oct–Nov', where: 'Gyeongsang · Gwangalli Beach', note: 'One of Asia’s largest fireworks shows, launched over Gwangalli Beach against the Gwangan Bridge.', caution: 'Enormous crowds, arrive hours early or book a paid seat.' },
      { name: 'Gangneung Danoje', nameKo: '강릉 단오제', emoji: '🎏', price: 'Early summer · May–Jun', where: 'Gangwon · Gangneung', note: 'A UNESCO-listed shamanic festival with mask drama, wrestling and swing-riding, the country’s most important folk celebration.' },
      { name: 'Damyang Bamboo Festival', nameKo: '담양 대나무축제', emoji: '🎋', price: 'Spring · May', where: 'Jeolla · Damyang', note: 'Set in the Juknokwon bamboo forest, crafts, bamboo rafting and shaded walks.' },
      { name: 'Taebaeksan Snow Festival', nameKo: '태백산 눈축제', emoji: '❄️', price: 'Winter · Jan–Feb', where: 'Gangwon · Taebaek', note: 'Giant snow sculptures along a national-park ridge, paired with an easy winter hike.', caution: 'High-altitude cold, dress for the mountain, not the city.' },
      { name: 'Jindo Sea-Parting Festival', nameKo: '진도 신비의 바닷길 축제', emoji: '🌊', price: 'Spring · Mar–Apr', where: 'Jeolla · Jindo', note: 'Korea’s own “Moses miracle”, the tide drops to reveal a 2.8km land bridge to a nearby island, and you walk across it.', caution: 'The parting only happens on a few days around the spring tides, check the exact dates.' },
      { name: 'Gwangyang Maehwa Festival', nameKo: '광양 매화축제', emoji: '🌼', price: 'Early spring · Mar', where: 'Jeolla · Gwangyang', note: 'Hillsides of white plum blossom above the Seomjin River, the first bloom of the Korean spring, ahead of the cherries.' },
      { name: 'Gurye Sansuyu Festival', nameKo: '구례 산수유축제', emoji: '💛', price: 'Early spring · Mar', where: 'Jeolla · Gurye', note: 'Villages under a haze of yellow cornelian-cherry blossom at the foot of Jirisan.' },
      { name: 'Hampyeong Butterfly Festival', nameKo: '함평 나비대축제', emoji: '🦋', price: 'Spring · Apr–May', where: 'Jeolla · Hampyeong', note: 'Fields of flowers and greenhouses full of live butterflies, the big family-friendly spring festival.' },
      { name: 'Icheon Ceramics Festival', nameKo: '이천 도자기축제', emoji: '🏺', price: 'Spring · Apr–May', where: 'Gyeonggi · Icheon', note: 'Korea’s ceramics capital opens its kilns, throw a pot, browse the potters’ market, watch masters work.' },
      { name: 'Chuncheon Mime Festival', nameKo: '춘천마임축제', emoji: '🤡', price: 'Spring · May', where: 'Gangwon · Chuncheon', note: 'One of Asia’s biggest physical-theatre festivals, spilling out of the venues onto the streets.' },
      { name: 'Daegu Chimac Festival', nameKo: '대구 치맥페스티벌', emoji: '🍗', price: 'Summer · Jul', where: 'Gyeongsang · Daegu', note: 'Fried chicken + beer (chi-mac) on a city-wide scale, a summer-night favourite with foreigners.' },
      { name: 'Muju Firefly Festival', nameKo: '무주 반딧불축제', emoji: '✨', price: 'Late summer · Aug–Sep', where: 'Jeolla · Muju', note: 'Guided night walks to see wild fireflies. Muju’s air is clean enough that they still thrive.' },
      { name: 'Suwon Hwaseong Cultural Festival', nameKo: '수원화성문화제', emoji: '🏛️', price: 'Autumn · Oct', where: 'Gyeonggi · Suwon', note: 'A royal procession and night-time performances around the UNESCO Hwaseong fortress, an easy day trip from Seoul.' },
      { name: 'Jeonju Bibimbap Festival', nameKo: '전주비빔밥축제', emoji: '🍚', price: 'Autumn · Oct', where: 'Jeolla · Jeonju', note: 'The city that defines bibimbap throws a festival for it, tastings, giant communal mixes, and the hanok village next door.' },
      { name: 'Seoul Kimchi Festival', nameKo: '서울김장문화제', emoji: '🥬', price: 'Autumn · Nov', where: 'Seoul · Seoul Plaza', note: 'Thousands gather to make kimchi together (kimjang, a UNESCO tradition), you can join a table and take some home.' },
    ],
    swatch: ['#5a1f4a', '#c2569b'],
  },

  // ─────────────── Essentials ───────────────
  {
    slug: 'money-in-korea', kind: 'guide', category: 'Essentials', photoUrl: COVER.cardTerminal,
    title: 'Money & Payments', subtitle: 'Cards, cash, and no tipping', badge: '💳 Essentials',
    description: "Korea is almost entirely cashless, and nobody tips anywhere. A few situations still need cash, and there's real money to claim back at the airport. Here's how to pay like a local.",
    meta: [{ icon: 'won', label: 'No tipping' }, { icon: 'info', label: 'Tax-free ₩15k+' }],
    tips: [
      'Foreign Visa/Mastercard work almost everywhere, subway shops, cafes, taxis, convenience stores.',
      'Keep some cash for street-food carts, traditional markets and small pojangmacha.',
      'No tipping, not in restaurants, taxis or hotels. The listed price is the final price.',
      'Most ATMs here do not take foreign cards. Look for the "Global" or "Foreign Card" sticker, convenience stores (CU, GS25, 7-Eleven, Emart24) and the big four banks (Woori, KB, Hana, Shinhan) are the reliable ones.',
      'Bank ATMs charge less per withdrawal than convenience-store ones and let you take out more at once, so take fewer, larger amounts.',
      'Get an instant tax refund at the register on purchases over ₩15,000 at "Tax Free" stores, just show your passport.',
      'From 2026 the instant-refund caps doubled: up to ₩1,000,000 per purchase and ₩5,000,000 across your whole trip.',
      'Above those caps, claim at the airport kiosks before security instead, keep the receipts and leave the goods unopened.',
      'Apple Pay and Google Pay work in Korea, but only where there is an NFC terminal, roughly a tenth of shops. That tenth happens to include convenience stores, chain cafes and department stores. Treat it as a backup, not your only card.',
    ],
        blocks: [
      {
        // Visitors keep asking "which card do I actually buy". The honest
        // answer is that these solve different problems and most people end up
        // with two of them.
        type: 'compare', title: 'Which card should you actually carry?',
        subtitle: 'Most visitors end up with a payment card plus a transit card',
        columns: ['Your own Visa/MC', 'WOWPASS / NAMANE', 'Climate Card'],
        rows: [
          { label: 'What it is', values: ['The card already in your wallet', 'Prepaid card sold to tourists, tops up with foreign cash or card', 'Seoul’s unlimited-ride transit pass'] },
          { label: 'Pays for', values: ['Almost everything, shops, taxis, restaurants', 'Shops and transit, from two separate balances', 'Subway and Seoul city buses only'] },
          { label: 'Cost', values: ['Your bank’s foreign-transaction fee', 'Card fee plus the exchange spread', '1-day ₩5,000 · 3-day ₩10,000 · 5-day ₩20,000'] },
          { label: 'Where to get it', values: ['Already have it', 'Kiosks in major subway stations and tourist areas', 'Convenience stores and subway information centres'] },
          { label: 'Worth it when', values: ['Always, carry it regardless', 'You want a set spending budget, or a T-money you can top up by card', 'You ride more than about four times a day'] },
        ],
      },
      {
        type: 'steps', title: 'Getting your tax back',
        subtitle: 'Two routes, pick by how much you spent',
        steps: [
          { emoji: '🛍️', title: 'Under ₩1,000,000, at the till', note: 'Hand over your passport at a "Tax Free" store and the VAT comes straight off the price. Nothing to claim later. Works from ₩15,000 per purchase.' },
          { emoji: '🧾', title: 'Over that, or a non-participating shop', note: 'Keep the tax-refund receipt and the goods sealed. Your trip total for instant refunds is capped at ₩5,000,000 anyway.' },
          { emoji: '🛂', title: 'At the airport, before security', note: 'Scan the receipts at the refund kiosks in departures. Do this before you check bags, customs may want to see the items.' },
          { emoji: '⚠️', title: 'One thing that changed', note: 'The 10% VAT refund on cosmetic and aesthetic medical procedures ended on 1 January 2026. Clinics may still advertise it; it no longer exists.' },
        ],
      },
    ],
    swatch: ['#5b6f9c', '#8fb0c0'],
  },
  {
    slug: 'stay-connected', kind: 'guide', category: 'Essentials', photoUrl: COVER.simCard,
    title: 'Stay Connected', subtitle: 'SIM, eSIM & pocket WiFi', badge: '📶 Essentials',
    description: "Data is the first thing to sort, maps, translation and taxis all need it. Here are your options and where to grab them the moment you land.",
    meta: [{ icon: 'bolt', label: 'eSIM easiest' }, { icon: 'won', label: 'from ₩3k/day' }, { icon: 'info', label: '3 sellers compared' }],
    tips: [
      'eSIM is fastest: install before you fly, activate on landing, no counter queue.',
      'Physical SIM counters (KT, SKT, LG U+) sit right on the arrivals floor at Incheon & Gimpo.',
      'Traveling as a group? A pocket-WiFi rental is cheaper to share across phones.',
      'Free WiFi is everywhere, cafes, subway stations, and public "Seoul WiFi" hotspots.',
      'Coverage differs slightly by carrier: SKT tourist eSIMs tend to run full-speed with no throttling, while KT and LG U+ plans usually give a data cap per day (often 3GB) at full speed before dropping to a slower unlimited tier.',
      "Almost all tourist eSIMs are data-only, no Korean phone number. That's fine for maps and Instagram, but apps that need SMS verification to sign up (Baemin, Coupang Eats, some banking) will block you, check the 'Ordering Delivery' guide if that matters for your trip.",
    ],
    blocks: [
      {
        type: 'compare', title: 'Where to actually buy it', subtitle: 'Same three carriers, different ways in',
        columns: ['Airport counter', 'Airalo (app)', 'Klook / Trazy'],
        rows: [
          { label: 'What it is', values: ['KT/SKT/LG U+ desks on the arrivals floor', 'A dedicated eSIM marketplace app', 'Travel-booking sites reselling Korea eSIM/SIM plans'] },
          { label: 'Buy when', values: ['On landing, if you didn\'t plan ahead', 'Before you fly, install and hold it, activate on landing', 'Before you fly, often bundled with other bookings'] },
          { label: 'Best for', values: ['A physical SIM with a local number', 'Simplicity, one app, clear per-GB pricing', 'Comparing several sellers\' prices at once, occasional discount codes'] },
        ],
        note: "Whichever seller, check whether the plan is single-carrier or a multi-network blend, blended plans (common on marketplaces) tend to hold a strong signal in more corners of the city than a single carrier alone.",
      },
    ],
    itemsTitle: 'Which to pick',
    items: [
      { name: 'eSIM', nameKo: '이심', emoji: '📲', price: '₩3,000–7,000/day', note: 'Buy & install online before the trip; scan a QR to go live on arrival. Keeps your home number for texts.', caution: 'Check your phone supports eSIM first.' },
      { name: 'Tourist SIM', nameKo: '유심', emoji: '📶', price: '₩5,000–8,000/day', note: 'Physical SIM from an airport counter, unlimited data, sometimes a local number.', where: 'Incheon / Gimpo arrivals' },
      { name: 'Pocket WiFi', nameKo: '포켓 와이파이', emoji: '📡', price: '~₩5,000/day', note: 'A rental hotspot for 3–5 devices, best value for families and groups.', caution: 'One more thing to charge and return.' },
    ],
    swatch: ['#2f4858', '#5b7a99'],
  },
  {
    slug: 'essential-apps', kind: 'guide', category: 'Essentials', photoUrl: COVER.seoulsky, updated: 'Aug 2026',
    title: 'Essential Apps', subtitle: 'The apps locals live by', badge: '📱 Essentials',
    description: "Google Maps barely does transit or walking directions in Korea. Download these before you go, they cover navigation, taxis, translation and trains.",
    meta: [{ icon: 'sparkle', label: '7 must-haves' }, { icon: 'won', label: 'All free' }],
    tips: [
      'Switch Naver Map and Papago to English in their settings, both ship with a full English mode that is off by default.',
      "Don't have a Korean card to add to Kakao T? Open Uber instead, it silently switches to \"UT\" mode in Korea and hails the same licensed taxis, using whatever card is already saved in your home-country Uber account.",
      "Papago's camera mode translates menus and signs live, just point it at anything you can't read.",
      'These all work on a data-only tourist SIM. It is apps like Baemin delivery and Korean banking that need a local phone number to sign up.',
      'Worth adding: KakaoTalk, the messenger the whole country runs on, if you are meeting locals or booking guesthouses that reply there.',
    ],
    itemsTitle: 'Download before you fly',
    items: [
      { name: 'Naver Map', nameKo: '네이버 지도', emoji: '🗺️', price: 'Free', note: 'The most accurate maps + transit directions in Korea, with an English mode.' },
      { name: 'KakaoMap', nameKo: '카카오맵', emoji: '🧭', price: 'Free', note: 'The other great map app, many prefer its walking directions and indoor maps.' },
      { name: 'Papago', nameKo: '파파고', emoji: '💬', price: 'Free', note: "Naver's translator, far better at Korean than Google, with camera and voice modes." },
      { name: 'Kakao T', nameKo: '카카오 T', emoji: '🚕', price: 'Free', note: 'Hail and pay for taxis cashless, Uber-style, over 90% of ride-hail market share and the fastest pickups.', caution: 'Foreign-card setup can be fiddly; "General Request" lets you pay the driver directly if it fails.' },
      { name: 'Uber (UT)', nameKo: '우버', emoji: '🚖', price: 'Free', note: "Calls the same licensed taxis as Kakao T, not private drivers. Works instantly with your existing home-country Uber account and card, no Korea-specific setup.", caution: 'Thinner coverage outside central Seoul (Gangnam, Itaewon, downtown).' },
      { name: 'Subway', nameKo: '지하철', emoji: '🚇', price: 'Free', note: 'Live train times, fastest transfers and last-train alerts (Kakao/Naver both do this).' },
      { name: 'Korail / SRT', nameKo: '코레일·SRT', emoji: '🚄', price: 'Free', note: 'Book KTX/SRT high-speed trains for day trips and other cities.' },
    ],
    blocks: [
      {
        type: 'compare', title: 'Kakao T vs Uber for hailing a taxi', subtitle: 'Same cars, different apps',
        columns: ['Kakao T', 'Uber (UT)'],
        rows: [
          { label: 'Setup', values: ['Needs a Korea-compatible card added in-app', 'None, uses your existing Uber account/card'] },
          { label: 'Coverage', values: ['Citywide, dominant market share', 'Strong in central Seoul, thinner further out'] },
          { label: 'Best for', values: ['Anywhere, especially late-night/outer areas', "Quick pickups if you don't want to fight the card setup"] },
        ],
      },
    ],
    swatch: ['#3a2c44', '#7a6a9c'],
  },
  {
    slug: 'delivery-app-guide', kind: 'guide', category: 'Essentials', photoUrl: COVER.chicken, updated: 'Aug 2026',
    title: 'Ordering Delivery as a Tourist', subtitle: 'Baemin & Coupang Eats, step by step', badge: '🛵 Essentials',
    description: "Korea's delivery culture is legendary, hot food to your door in 20–30 minutes, at 1am, in the rain. It's built for residents with a Korean phone number, so tourists hit a few real snags. Here's exactly how to get around them.",
    meta: [{ icon: 'clock', label: '20–40 min' }, { icon: 'won', label: 'Fee ₩2,000–4,000' }],
    tips: [
      "The single biggest blocker: most delivery apps need a Korean phone number for SMS verification. A data-only tourist eSIM won't work, check yours includes an actual Korean number, or ask your hotel/Airbnb host to help register on their number.",
      "Baemin added English/Chinese/Japanese in-app translation (search, menus, checkout, tracking) and Apple Pay support for foreign-issued Visa/Mastercard/JCB/Amex, closing most of the gap with Coupang Eats. Coupang Eats still edges it on straightforward foreign-card checkout and a simpler pin-drop address flow.",
      "No tipping, the delivery fee (₩2,000–4,000, sometimes free for larger orders) is the entire cost.",
      'Add a Korean delivery note if you can: "문 앞에 놔주세요" (leave it at the door) is the default now, most riders won\'t knock or call.',
      'Staying in a hotel? Give the address as your hotel name + room number and have the front desk expecting it, easier than a precise map pin.',
    ],
    blocks: [
      {
        type: 'steps', title: 'How to order', subtitle: 'From download to doorstep',
        steps: [
          { title: 'Confirm you have a Korean number', note: 'Check your SIM/eSIM plan includes voice/SMS, not just data, this is the #1 reason tourists get stuck at signup.', emoji: '📱' },
          { title: 'Download Coupang Eats or Baemin', note: "Both work for foreigners now: Coupang Eats has the simplest foreign-card checkout, Baemin has more restaurant selection and now ships English/Chinese/Japanese translation plus Apple Pay for foreign cards.", emoji: '⬇️' },
          { title: 'Set your delivery address', note: 'Drop a pin on the map instead of typing a Korean address, both apps support this. For a hotel, search the hotel name directly.', emoji: '📍' },
          { title: 'Browse & order', note: 'Photos carry most menus even in Korean; Papago\'s camera translate handles the rest. Check the minimum order amount shown at checkout.', emoji: '🍔' },
          { title: 'Pay', note: 'Foreign Visa/Mastercard usually works in-app; cash-on-delivery (만나서 결제) is a fallback if your card is declined.', emoji: '💳' },
          { title: 'Add a delivery note', note: 'Paste in "문 앞에 놔주세요" (leave at the door), contactless drop-off is the default expectation now.', emoji: '📝' },
          { title: 'Track & receive', note: 'Live rider tracking shows ETA to the minute; a push notification pings when it arrives.', emoji: '✅' },
        ],
      },
    ],
    swatch: ['#3a2c44', '#7a6a9c'],
  },
  {
    slug: 'korean-etiquette', kind: 'guide', category: 'Essentials', photoUrl: COVER.deoksugung,
    title: 'Etiquette & Customs', subtitle: 'Small gestures that go a long way', badge: '🙏 Essentials',
    description: "Koreans are forgiving with visitors, but a few gestures instantly mark you as a considerate guest, and help you sidestep the occasional faux pas.",
    meta: [{ icon: 'info', label: '2 hands' }, { icon: 'sparkle', label: 'No tipping' }],
    tips: [
      'Give and receive things, money, cards, gifts, with two hands (or one hand supported by the other).',
      'Take your shoes off in homes, hanok, temples and many floor-seating restaurants.',
      "Pour drinks for others, never yourself; when an elder pours for you, hold your glass with two hands.",
      'Keep your voice down on public transport, and leave the pink priority seats free.',
      "Don't plant chopsticks upright in rice, it echoes a funeral rite.",
      'Wait for the eldest at the table to start before you dig in.',
      'No tipping, offering one usually causes confusion, not delight.',
      'Eating on the subway is not illegal, just frowned on, and anything strongly scented genuinely annoys people. Save it for the platform bench.',
      'Stand on the right of the escalator so people can walk up the left.',
      'Public bins are scarce by design. Carry your rubbish until you pass a convenience store, which is where the bins live.',
      'Smoking outdoors is banned across most of central Seoul, not just indoors, the fine is ₩100,000 and applies to visitors exactly as it does to residents. Look for the marked smoking booths.',
      'Heavily tattooed? Some jjimjilbang, hotel pools and gyms still refuse entry. Ask at the desk first rather than after you have undressed.',
    ],
        blocks: [
      {
        // Drinking is where visitors most often feel they are getting it wrong,
        // and it is the one ritual with a real sequence to it.
        type: 'steps', title: 'Drinking, in the order it happens',
        subtitle: 'The one ritual worth learning before you sit down',
        steps: [
          { emoji: '🍶', title: 'Never pour your own', note: 'Fill other people’s glasses and someone will fill yours. Watching a glass sit empty is the actual faux pas.' },
          { emoji: '🙌', title: 'Two hands for anyone older', note: 'Pour with two hands, and receive with two hands, or one hand steadying the other forearm.' },
          { emoji: '↩️', title: 'Turn away for the first drink', note: 'With someone notably senior, turn your head slightly away from them as you drink. It reads as deference, not rudeness.' },
          { emoji: '🚫', title: 'Declining is fine', note: 'Say you can’t drink and accept the pour anyway, leaving a full glass untouched is a completely normal way to opt out.' },
        ],
      },
    ],
    swatch: ['#2a3225', '#79876b'],
  },
  {
    slug: 'survival-korean', kind: 'guide', category: 'Essentials', photoUrl: COVER.insadong,
    title: 'Survival Korean', subtitle: 'Sixteen phrases, sorted by situation', badge: '🗣️ Essentials',
    description: "You don't need fluency, a handful of phrases and a smile unlock warmer service everywhere. Romanization on the right; tap Papago for anything else.",
    meta: [{ icon: 'sparkle', label: '16 phrases' }, { icon: 'info', label: '+ Papago' }],
    sections: [
      {
        title: '👋 Greetings & basics',
        items: [
          { name: 'Hello', nameKo: '안녕하세요', price: 'an-nyeong-ha-se-yo', note: 'The all-purpose greeting, any time of day.' },
          { name: 'Thank you', nameKo: '감사합니다', price: 'gam-sa-ham-ni-da', note: 'Polite thanks, use it liberally.' },
          { name: 'Sorry / Excuse me', nameKo: '죄송합니다', price: 'jwe-song-ham-ni-da', note: "For bumping into someone or squeezing past, more common here than a literal 'excuse me'." },
          { name: 'Excuse me / Here please', nameKo: '여기요', price: 'yeo-gi-yo', note: 'Call staff over in a restaurant, totally normal, not rude.' },
        ],
      },
      {
        title: '🍽️ At a restaurant',
        items: [
          { name: 'This one, please', nameKo: '이거 주세요', price: 'i-geo ju-se-yo', note: 'Point and say it, works on a menu, at a market stall, anywhere.' },
          { name: 'Please make it mild', nameKo: '안 맵게 해주세요', price: 'an maep-ge hae-ju-se-yo', note: "A lifesaver if you can't take the heat." },
          { name: "I can't eat meat", nameKo: '고기 못 먹어요', price: 'go-gi mot meo-geo-yo', note: 'For vegetarians, swap 고기 for whichever food you avoid.' },
          { name: 'Water, please', nameKo: '물 주세요', price: 'mul ju-se-yo', note: "Water's usually self-serve, but worth knowing for the spots that aren't." },
          { name: "It's delicious!", nameKo: '맛있어요', price: 'ma-si-sseo-yo', note: 'The compliment every cook loves to hear.' },
        ],
      },
      {
        title: '🛍️ Shopping & directions',
        items: [
          { name: 'How much is it?', nameKo: '얼마예요?', price: 'eol-ma-ye-yo', note: 'For markets and street carts without price tags.' },
          { name: 'Card, please', nameKo: '카드요', price: 'ka-deu-yo', note: 'Paying by card (say 현금, hyeon-geum, for cash).' },
          { name: 'Where is the toilet?', nameKo: '화장실 어디예요?', price: 'hwa-jang-sil eo-di-ye-yo', note: 'Self-explanatory, always useful.' },
        ],
      },
      {
        title: '🚨 If something goes wrong',
        items: [
          { name: 'Help!', nameKo: '도와주세요!', price: 'do-wa-ju-se-yo', note: 'Gets attention fast, useful for more than just real emergencies.' },
          { name: "I don't feel well", nameKo: '아파요', price: 'a-pa-yo', note: "Point to where it hurts if you can't say more, staff and pharmacists will work from there." },
          { name: 'Does anyone speak English?', nameKo: '영어 하시는 분 있어요?', price: 'yeong-eo ha-si-neun bun i-sseo-yo', note: 'A polite way to find help, or call 1330, the free 24/7 travel hotline, if nobody nearby does.' },
        ],
      },
    ],
    swatch: ['#7a4a2a', '#e0a05a'],
  },
  {
    slug: 'health-safety', kind: 'guide', category: 'Essentials', photoUrl: COVER.bandage,
    title: 'Health & Emergencies', subtitle: 'Numbers, pharmacies & the tourist hotline', badge: '🚑 Essentials',
    description: "Seoul is one of the safest big cities in the world, but it helps to know who to call and where to go if something comes up. Save these before you need them.",
    meta: [{ icon: 'info', label: '1330 · 24/7' }, { icon: 'sparkle', label: 'Very safe' }],
    tips: [
      'Dial 1330, the free 24/7 Korea Travel Hotline, in English/Chinese/Japanese and more. They help with directions, medical, interpreting, anything.',
      'Emergencies: 119 for fire & ambulance, 112 for police. Both run a three-way interpretation line, just say "English please" and stay on the call.',
      '119 is also the medical advice line: it tells you which hospital or pharmacy is open right now. (1339 is the disease-control call centre, not travel medical help, a lot of guidebooks still get this wrong.)',
      'Pharmacies (약국, yakguk) handle minor ills; look for the green cross. Typical hours are 09:00–20:00 weekdays and 09:00–17:00 Saturday, with most closed Sunday.',
      'Closed pharmacy? Convenience stores sell a limited set of basics, painkillers, digestive medicine, cold remedies, 24/7 by law.',
      'To find what is open near you at any hour, use the government portal e-gen.or.kr (Emergency Medical Portal), it maps open ERs, clinics and pharmacies in real time.',
      'For a doctor, international clinics at big hospitals (Severance, Asan, Samsung, Seoul National University) have English-speaking staff and a dedicated foreign-patient desk.',
      'Tap water is safe to drink, though most locals prefer bottled or filtered.',
      'Travel insurance is worth it, uninsured foreigners pay out of pocket, and an ER visit typically runs ₩60,000–200,000+ before any treatment.',
      'Lost something? Recovery rates here are unusually high. Subway and public losses go to the police Lost112 portal; for a taxi, call 120 (Seoul’s city hotline) with your receipt.',
    ],
        blocks: [
      {
        // The "it's 2am and I feel awful" path, in the order you'd actually
        // walk it. Most visitors default to an ER because they don't know the
        // cheaper rungs exist.
        type: 'steps', title: 'Sick at night, what to do, in order',
        subtitle: 'Work down this list; most problems stop at step 2',
        steps: [
          { emoji: '🏪', title: 'Convenience store', note: 'Open 24/7 and legally allowed to sell a small set of medicines: painkillers, cold medicine, digestive aids, fever patches. Enough for most "I just feel rough" nights.' },
          { emoji: '💊', title: 'A pharmacy that is still open', note: 'Search e-gen.or.kr or ask 119 for the nearest one open now. Some districts run designated late-night pharmacies until 24:00–02:00.' },
          { emoji: '📞', title: 'Call 119 for advice', note: 'Not just ambulances, 119 gives 24/7 medical guidance and will tell you whether you actually need a hospital. Ask for English.' },
          { emoji: '🏥', title: 'Emergency room', note: 'Go straight here for chest pain, breathing trouble, heavy bleeding or a head injury. Uninsured, expect ₩60,000–200,000+ before treatment; the ambulance itself is free.' },
        ],
      },
      {
        type: 'steps', title: 'Scams to know about',
        subtitle: 'Rare, but they cluster in exactly the areas visitors walk',
        steps: [
          { emoji: '🍵', title: 'The tea ceremony invite', note: 'A friendly stranger near Insadong or Myeongdong wants to practise English or show you a "traditional tea house". The bill arrives at ₩100,000+. Just decline and keep walking.' },
          { emoji: '🚕', title: 'Meter never gets switched on', note: 'Check the meter reads the ₩4,800 base fare before you move, or book through Kakao T so the fare is fixed in-app.' },
          { emoji: '🍸', title: 'Street touts for bars and clubs', note: 'Anyone pulling you into a venue is paid to; drinks inside can run ₩50,000–100,000 with charges you never agreed to. Never follow a tout.' },
          { emoji: '🚨', title: 'If it happens anyway', note: 'Call 112. Most of these operations fold the moment police are involved, and the interpretation line means you can report it in English.' },
        ],
      },
    ],
    swatch: ['#1f4d4a', '#4a9d8e'],
  },
  {
    slug: 'what-to-pack', kind: 'guide', category: 'Essentials', photoUrl: COVER.gyeonguiForest,
    title: 'What to Pack by Season', subtitle: 'Seoul weather, month by month', badge: '🧳 Essentials',
    description: "Korea has four sharp seasons, pack for the wrong one and you'll be miserable (or shopping for a coat). Here's what each brings and what to bring for it.",
    meta: [{ icon: 'info', label: '4 seasons' }, { icon: 'sparkle', label: 'Fall = best' }, { icon: 'info', label: '220V Type C/F plug' }],
    tips: [
      'Whatever the season, bring a travel adapter: Korea runs on 220V with the round two-pin (Type C/F) European plug, US/UK devices won\'t physically fit without one.',
      'Pack the most comfortable walking shoes you own. Seoul days run long, and palaces, markets and old alleys mean cobbles, hills and stairs.',
      'Bring any prescription medicine you rely on, in its original labeled packaging. Pharmacies here stock Korean brands and staff may not recognise a foreign name.',
      'A small folding umbrella earns its space year-round, the summer monsoon and spring showers both arrive fast.',
      'Leave room in your bag. Between Olive Young, Daiso and Myeongdong you will almost certainly fly home heavier than you arrived.',
    ],
    itemsTitle: 'By season',
    items: [
      { name: 'Spring', nameKo: '봄 · Mar–May', emoji: '🌸', price: '5–20°C', note: 'Cherry blossoms and mild days. Layers for cool mornings.', caution: 'Yellow dust & pollen, pack a mask on hazy days.' },
      { name: 'Summer', nameKo: '여름 · Jun–Aug', emoji: '🌦️', price: '24–33°C', note: 'Hot, humid, and the July monsoon (jangma) brings heavy rain.', caution: 'Umbrella + quick-dry clothes; AC indoors is strong.' },
      { name: 'Autumn', nameKo: '가을 · Sep–Nov', emoji: '🍁', price: '8–22°C', note: 'Crisp, clear and the foliage season, most travelers\' favourite.', caution: 'Cool evenings, bring a light jacket.' },
      { name: 'Winter', nameKo: '겨울 · Dec–Feb', emoji: '❄️', price: '-10–4°C', note: 'Cold and dry with occasional snow. Heat-tech layers, gloves, a warm coat.', caution: 'Wind chill bites, cover ears and hands.' },
    ],
    blocks: [
      {
        type: 'compare', title: "Pack for what you're actually doing", subtitle: 'Same trip, different bag',
        columns: ['Palace-hopping', 'Mountain hiking', 'Jjimjilbang & nightlife'],
        rows: [
          { label: 'Footwear', values: ['Comfortable flats, hanbok rentals mean no heavy bag at the palace itself', 'Real hiking shoes with grip, Seoul\'s "mountains" (Bukhansan, Namsan) are steeper than they look', 'Slip-on shoes, you\'ll be barefoot indoors constantly'] },
          { label: 'Bag', values: ['Small crossbody, most palaces have narrow gates and stairs', 'Small daypack with water + a light rain shell', 'Nothing, jjimjilbangs provide a locker and clothes'] },
          { label: 'Extras', values: ['Cash for hanbok deposit; some palace sections are gravel', 'Sun sleeves/hat, trail signage is Korean-only past the entrance', 'Hair tie + your own toothbrush if particular about shared toiletries'] },
        ],
        note: "Most first-time itineraries mix all three in one trip, pack the hiking shoes even if it's just for Bukhansan's lower trails.",
      },
    ],
    swatch: ['#5f6d53', '#a9bf94'],
  },

  // ─────────────── Food & Drink ───────────────
  {
    slug: 'eating-out', kind: 'guide', category: 'Food & Drink', photoUrl: COVER.tteokbokki,
    title: 'Eating Out in Korea', subtitle: 'How to order, share & not overpay', badge: '🍽️ Food & Drink',
    description: "Korean dining has its own rhythm, free side dishes, shared mains, self-serve water and a call-button culture. Once you get it, eating out here is a joy.",
    meta: [{ icon: 'sparkle', label: 'Free banchan' }, { icon: 'won', label: 'No tipping' }, { icon: 'info', label: '6 sign types decoded' }],
    tips: [
      'Banchan (side dishes) are free and refillable, just ask, or point to the empty dish.',
      "Water, cups and cutlery are usually self-serve, look for the metal cutlery drawer at the table edge.",
      "Many mains are made to share and priced for 2, great for splitting, awkward for true solo diners.",
      'Press the table call button (or say "여기요!") when you\'re ready to order, no need to wait to be noticed.',
      'Halal/vegetarian is growing: look for spots in Itaewon, and use the app\'s "Cuisine" filters.',
      'Pay at the counter on the way out, not at the table. No tip.',
    ],
    blocks: [
      {
        type: 'steps', title: 'How a meal actually goes, start to finish', subtitle: 'The unspoken order of things',
        steps: [
          { emoji: '🚪', title: 'Walk in and sit', note: "Most casual spots are seat-yourself, staff will wave you to a table or you just take an open one." },
          { emoji: '📋', title: 'Order at the table', note: 'A paper menu, a QR code, or a call button/tablet, look for one at the table edge. Nobody comes to take your order verbally unless you flag them.' },
          { emoji: '🥢', title: 'Banchan lands first', note: "Free side dishes arrive before the main, they're not a starter you pay for, and they're refillable, just ask or point at the empty plate." },
          { emoji: '🍲', title: 'The main comes out to share', note: 'Many mains, stews, grilled meat, cook in the center of the table and get eaten communally, everyone dips into the same pot with their own rice bowl and chopsticks.' },
          { emoji: '🔔', title: 'Call for the check', note: 'Press the table button or say "여기요!" (yeogiyo) when ready, staff won\'t swing by to check on you unprompted.' },
          { emoji: '💳', title: 'Pay at the counter, not the table', note: 'Take the bill (or just your table number) to the register on the way out. No tip, ever.' },
        ],
      },
      {
        // Real catalog rows, not invented picks, the guide explains how eating
        // out works, and this is where to actually go and do it.
        type: 'places', title: 'Where to actually eat', subtitle: 'Long-running Korean restaurants across the city',
        placeSlugs: ['vs-ENPccztn7', 'vs-ENP013171', 'vs-ENPq0llgd', 'vs-ENPe0zi3b', 'vs-ENP013614', 'vs-ENPgotwff', 'vs-ENP6in9cu'],
        notes: {
          'vs-ENPccztn7': 'Traditional Korean cooking near Anguk Station, understated rather than showy, the signature Eobok Jeongban (Pyongyang-style) is worth ordering blind.',
          'vs-ENP013171': 'Seolleongtang from beef leg and tail bones simmered 5+ hours for a genuinely thick broth, the geotjeori (fresh kimchi-dressed cabbage) on the side is just as well known.',
          'vs-ENPq0llgd': 'Near the National Assembly and popular with the officials who work there, the Sanghwang-mushroom samgyetang is the one to order.',
          'vs-ENPe0zi3b': 'Grilled daechang (beef large intestine), a Blue Ribbon Survey pick, open until 5am, come hungry and unbothered by offal.',
          'vs-ENP013614': 'Bulgogi and Pyeongyang-style naengmyeon with a genuinely high buckwheat-flour ratio, the broth reads closer to the real North Korean original than most Seoul versions.',
          'vs-ENPgotwff': 'Charcoal-grilled galbi with a garlic-forward marinade, come as a group and work through the set menus.',
          'vs-ENP6in9cu': 'Loach soup (chueotang), an acquired-taste Seoul specialty, goes from empty to packed with office workers right at lunch.',
        },
      },
    ],
    itemsTitle: 'Reading the sign before you walk in',
    items: [
      { name: 'Sikdang', nameKo: '식당', price: '—', emoji: '🍚', note: 'The generic word for "restaurant", could genuinely be anything, check what\'s in the window or on the sign photos.' },
      { name: 'Jip', nameKo: '집', price: '—', emoji: '🏠', note: 'Literally "house", almost always paired with the specialty, e.g. 순두부집 (sundubu-jip) is a soft-tofu-stew house. A strong signal the place does one thing well.' },
      { name: 'Gukbap-jip / Tang-jip', nameKo: '국밥집 · 탕집', price: '—', emoji: '🍲', note: 'Soup-and-rice specialists. Cheap, fast, often open very late or 24 hours, a reliable late-night option.' },
      { name: 'Pojangmacha', nameKo: '포장마차 · 포차', price: '—', emoji: '🏮', note: 'An informal drinking tent or bar built around anju (sharing food), the classic orange-tented street version or a permanent indoor "pocha".' },
      { name: 'Gogijip', nameKo: '고깃집', price: '—', emoji: '🥩', note: 'A meat-grilling restaurant, order by weight or set, cook it yourself at the table grill, staff will help with the first batch if you look lost.' },
      { name: 'Bunsikjip', nameKo: '분식집', price: '—', emoji: '🍢', note: 'Casual, cheap snack food, tteokbokki, gimbap, ramyeon, dumplings. Fast, filling, and the easiest first order for a Korean-menu beginner.' },
    ],
    swatch: ['#7a4a2a', '#e0a05a'],
  },
  {
    slug: 'convenience-store', kind: 'guide', category: 'Food & Drink', photoUrl: COVER.gs25,
    title: 'Convenience Store Mastery', subtitle: 'The 24/7 traveler\'s best friend', badge: '🏪 Food & Drink',
    description: "GS25, CU, 7-Eleven and Emart24 are on every corner, open all night, and stocked with genuinely great cheap eats. Locals do full meals here, so can you.",
    meta: [{ icon: 'sparkle', label: 'Open 24/7' }, { icon: 'won', label: '₩1,000–5,000' }],
    tips: [
      'Look for the microwave, kettle and seating counter, most stores have them, and using them is completely normal, not just allowed.',
      'The "1+1" and "2+1" stickers are real: buy one (or two) and get another free. Mix brands within the same promo group.',
      'CU and GS25 have the biggest own-brand food ranges; 7-Eleven and Emart24 are close behind. Prices are identical between branches.',
      'Pay with a foreign card or Apple Pay, reload your T-money, and use the Global ATM, all at the same counter.',
    ],
    blocks: [
      {
        // The 꿀조합 ("honey combo") culture is genuinely how young Koreans eat
        // here, combining products for a synergy the single item doesn't have.
        // These are the named ones that actually stuck, with who made them famous.
        type: 'steps', title: 'Combos that got famous',
        subtitle: 'Korea has a whole vocabulary for mixing store products, these are the classics',
        steps: [
          { emoji: '🍜', title: 'Mark Jeongshik · 마크정식', note: 'The one that named the whole genre. Crumble a triangle kimbap (and often a slice of cheese or an egg) into your cup ramyeon and let it soak. Coined by a fan of GOT7’s Mark; “마크정식” is now shorthand for any convenience-store combo.' },
          { emoji: '🍝', title: 'Jjapaguri · 짜파구리', note: 'Chapagetti + Neoguri cooked together, sweet black-bean noodles with the spicy seafood broth. A long-time favourite that went global as the “ram-don” in Parasite.' },
          { emoji: '🧀', title: 'Buldak + string cheese · 불닭 + 치즈', note: 'Melt a stick or two of string cheese into Buldak fire noodles. The 국룰 (unwritten rule) for making the spiciest instant noodle survivable, and richer.' },
          { emoji: '🍙', title: 'Tuna-mayo + hot bar · 참치마요 + 핫바', note: 'A tuna-mayo triangle kimbap with a warm hot bar from the register counter. The 단짠 (sweet-and-savoury) pairing everyone defaults to.' },
          { emoji: '🍚', title: 'Cup rice + egg · 컵밥 + 계란', note: 'Crack an egg into a microwave cup-rice (컵밥) before heating for a fuller, hotter meal. Add a slice of cheese or a sausage for the deluxe version.' },
        ],
      },
    ],
    itemsTitle: 'What to grab',
    items: [
      { name: 'Cup ramyeon', nameKo: '컵라면', emoji: '🍜', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Fried_Tofu_Cup_Ramyeon.jpg/500px-Fried_Tofu_Cup_Ramyeon.jpg', price: '₩1,300+', note: 'Buy a cup, use the in-store hot-water machine and seating. The base for half the combos above.' },
      { name: 'Triangle kimbap', nameKo: '삼각김밥', emoji: '🍙', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Samgak_kimbap.jpg/500px-Samgak_kimbap.jpg', price: '₩1,000–1,800', note: 'Cheap, filling, everywhere. Follow the numbered wrapper to open it without the seaweed tearing.' },
      { name: 'Lunchbox (dosirak)', nameKo: '도시락', emoji: '🍱', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Convenience_Store_LunchBox_01.jpg/500px-Convenience_Store_LunchBox_01.jpg', price: '₩3,500–5,000', note: 'A full hot meal, rice, meat, side dishes. GS25’s “Hyeja” line (named for actress Kim Hye-ja, a byword for generous portions) is the famous one. Microwave it at the counter.' },
      { name: 'Banana milk', nameKo: '바나나맛우유', emoji: '🥛', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Binggrae_Banana_Flavored_Milk_03.jpg/500px-Binggrae_Banana_Flavored_Milk_03.jpg', price: '₩1,500', note: "Korea's iconic drink, in the fat little tub, try it at least once." },
      { name: 'Hot bar & corn dogs', nameKo: '핫바', emoji: '🌭', price: '₩1,500–2,500', note: 'Warm snacks by the register, grab-and-go fuel, and the partner to a tuna-mayo kimbap.' },
      { name: 'T-money reload & ATM', nameKo: '티머니 충전', emoji: '💳', price: '—', note: 'Top up your transit card and use the Global ATM, all under one roof.' },
    ],
    swatch: ['#1f4d4a', '#4a9d8e'],
  },
  {
    slug: 'drinking-culture', kind: 'guide', category: 'Food & Drink', photoUrl: COVER.brewery,
    title: 'Soju, Beer & Drinking Rules', subtitle: 'How Koreans actually drink', badge: '🍻 Food & Drink',
    description: "Drinking is deeply social here, with a few unspoken rules that make it fun rather than a minefield. Learn the pour, the toast, and what to order.",
    meta: [{ icon: 'sparkle', label: 'Somaek!' }, { icon: 'won', label: '₩4,000–8,000' }, { icon: 'info', label: '4 drinks compared' }],
    tips: [
      'Never pour your own glass, pour for others and someone will fill yours.',
      'Pour and receive with two hands for elders; turn your head away slightly when you drink with them.',
      'Somaek (soju + beer) is the crowd-pleaser; makgeolli (rice wine) pairs with pancakes on rainy days.',
      'Anju (안주), sharing food, is expected with drinks; most bars want at least one per table.',
      'Cheers with "건배!" (geon-bae), glasses clink lower than an elder\'s as a sign of respect.',
      'Know your limit: rounds move fast and refusing politely ("천천히요", slowly) is fine.',
    ],
    blocks: [
      {
        type: 'compare', title: 'What to actually order', subtitle: 'The four drinks that cover 90% of a night out',
        columns: ['Soju', 'Draft Beer', 'Makgeolli', 'Somaek'],
        rows: [
          { label: 'What it is', values: ['Clear grain/rice spirit, the default', 'Cass, Terra, Kloud, Korea\'s pale lagers', 'Milky, lightly fizzy rice wine', 'Soju + beer, mixed at the table'] },
          { label: 'ABV', values: ['~16% mainstream (Chamisul, Chum Churum); older/original variants run 20%+', '~4.5–5%', '~6–8%', '~10–13%, depends on the mix'] },
          { label: 'Price', values: ['₩4,000–5,000 / bottle', '₩4,000–6,000 / pint', '₩5,000–8,000 / bottle', 'Free, made from what\'s already on the table'] },
          { label: 'Pairs with', values: ['Grilled meat, jjigae', 'Fried chicken (chimaek)', 'Savory pancakes (jeon), rainy days', 'Whatever anju is already ordered'] },
        ],
        note: 'The somaek ratio is its own small ritual, ask for it "seven soju to three beer" (칠삼, chil-sam) if you want the classic mix, someone at the table will usually stir it for the group.',
      },
      {
        type: 'places', title: 'Where to drink it', subtitle: 'Bars, brewpubs and LP bars worth the trip',
        placeSlugs: ['vs-ENP2h7itr', 'vs-ENPni42mf', 'vs-ENPuhyzcz', 'vs-ENP8uf172', 'vs-ENPadtomq', 'vs-ENPepypjf', 'vs-ENPqlv92h'],
        notes: {
          'vs-ENP2h7itr': 'A certified traditional-liquor sommelier pours 100 different Korean spirits by the glass and tailors picks to your taste, the easiest way to understand what\'s beyond soju.',
          'vs-ENPni42mf': 'Where the brewery itself started in 2016, now a Seongsu-dong landmark, around 50 house-brewed craft beers on tap.',
          'vs-ENPuhyzcz': 'Started in Samcheong-dong, now tucked into Seongbuk-dong, more listening room than bar, an underground space built for the music, not the crowd.',
          'vs-ENP8uf172': 'Whisky-focused, tatami seating instead of a bar counter, near the Constitutional Court, a quiet reset if you\'ve had enough standing-room hofs.',
          'vs-ENPadtomq': 'Real vinyl, song requests welcome, a 20s–30s crowd, and a genre range wide enough (K-pop to jazz to EDM) that any request lands.',
          'vs-ENPepypjf': 'A 1990s high-end cafe turned 24-hour hangout turned craft beer and cocktail bar, now a fixture for baseball fans nearby.',
          'vs-ENPqlv92h': 'A Euljiro music bar built for quiet, reclining sofas and a highball, conversation is kept low on purpose, come to actually listen.',
        },
      },
    ],
    swatch: ['#3a2c22', '#c26b4a'],
  },

  // ─────────────── Culture ───────────────
  {
    slug: 'palaces-hanbok', kind: 'guide', category: 'Culture', photoUrl: COVER.gyeongbok,
    title: 'Palaces & Hanbok', subtitle: 'The five grand palaces, free in hanbok', badge: '👘 Culture',
    description: "Seoul's five Joseon-era palaces are its cultural heart. Rent a hanbok nearby and you walk in free, the reason every photo of Gyeongbokgung is full of colour.",
    meta: [{ icon: 'won', label: 'Free in hanbok' }, { icon: 'info', label: '₩3,000 each' }, { icon: 'sparkle', label: '3 rental tiers' }],
    tips: [
      'Wearing hanbok gets you in free at all the palaces, rental shops cluster tightly around Gyeongbokgung\'s Exit 3-1 and Exit 4, most are under 2 minutes\' walk from the palace gate.',
      'Gyeongbokgung closes Tuesdays; the others (Changdeokgung, etc.) close Mondays.',
      'Catch the changing-of-the-guard ceremony at Gyeongbokgung (usually 10:00 & 14:00).',
      "Changdeokgung's Secret Garden (Huwon) is guided and ticketed separately, book ahead.",
      'The integrated palace ticket (₩10,000) covers four palaces + Jongmyo Shrine over a month.',
      'Book your hanbok online the night before if you can, shops fill up on weekend mornings and same-day picks get slim.',
    ],
    blocks: [
      {
        type: 'compare', title: 'Which rental tier', subtitle: 'Prices cluster around the same three tiers shop to shop',
        columns: ['Basic', 'Premium', 'Full-day / overnight'],
        rows: [
          { label: 'Duration', values: ['2 hours', '2–4 hours', 'All day, or 24h'] },
          { label: 'Price', values: ['~₩15,000', '~₩20,000–35,000', '~₩32,000–40,000'] },
          { label: 'What you get', values: ['Standard fabric, set colours', 'Nicer fabric, more colour/pattern choice, sometimes a hair accessory', 'Same as premium, just no clock-watching'] },
          { label: 'Best for', values: ['A quick in-and-out at one palace', 'The main photo op, most visitors land here', 'Palace-hopping or an evening hanbok walk too'] },
        ],
        note: 'Hair styling and prop rentals (fan, small bag) are usually priced separately on top of any tier, ask what\'s actually included before you pay.',
      },
    ],
    itemsTitle: 'The five palaces',
    items: [
      { name: 'Gyeongbokgung', nameKo: '경복궁', emoji: '🏛️', price: '₩3,000', note: 'The grandest and most famous, changing of the guard, huge grounds.' },
      { name: 'Changdeokgung', nameKo: '창덕궁', emoji: '🌳', price: '₩3,000', note: 'UNESCO-listed, home to the beautiful Secret Garden.', caution: 'Secret Garden needs a separate timed ticket.' },
      { name: 'Changgyeonggung', nameKo: '창경궁', emoji: '🌉', price: '₩1,000', note: 'Quiet and lovely, with a serene pond and greenhouse. Great at dusk.' },
      { name: 'Deoksugung', nameKo: '덕수궁', emoji: '🏛️', price: '₩1,000', note: 'A blend of Korean and Western architecture, right downtown by the stonewall walk.' },
      { name: 'Gyeonghuigung', nameKo: '경희궁', emoji: '🍃', price: 'Free', note: 'The smallest and least crowded, a peaceful escape.' },
    ],
    swatch: ['#5a1f4a', '#c2569b'],
  },
  {
    slug: 'jjimjilbang-guide', kind: 'guide', category: 'Culture', photoUrl: COVER.sauna, updated: 'Jul 2026',
    title: 'Jjimjilbang: Korean Spa', subtitle: 'How the bathhouse works, start to finish', badge: '♨️ Culture',
    description: "A jjimjilbang is a Korean sauna-and-bathhouse, part spa, part social hangout, part budget overnight stay. Intimidating the first time (there's a nude floor and a mixed-gender floor, and nobody explains which is which); genuinely one of the best-value things to do in Seoul once you know the flow.",
    meta: [{ icon: 'won', label: '₩8,000–15,000' }, { icon: 'clock', label: 'Often 24h' }],
    tips: [
      'They give you everything: uniform, towel, a locker key/wristband. Bring nothing but yourself, your ID, and some cash for snacks.',
      'It\'s two different floors with two different rules, the bathing floor is gender-separated and nude; the sauna/common floor is mixed-gender and you wear the provided uniform. Nobody tells you this on the way in, so it trips up almost every first-timer.',
      'You can stay overnight for just the entry fee, sleep in the communal hall on a mat and pillow. A genuinely cheap, cozy option if you miss the last train.',
      'Visible tattoos can occasionally get a second look at stricter bathhouses (a hangover rule from tattoos = organized crime association), most tourist-frequented spots in Seoul don\'t enforce it, but it\'s not universal.',
      'Try a sikhye (sweet rice drink) and a baked egg from the snack bar, the classic post-sauna combo everyone does.',
    ],
    blocks: [
      {
        type: 'steps', title: 'How a visit actually flows', subtitle: 'From the front desk to checkout',
        steps: [
          { title: 'Pay at the counter, get a key', note: 'One wristband/key unlocks your shoe locker at the entrance AND your clothing locker inside, don\'t lose it, it\'s also your tab for snacks.', emoji: '🎫' },
          { title: 'Shoes off immediately', note: 'Shoe lockers are right at the entrance, before you go further in. Korean floors are a shoes-off space from the door.', emoji: '👟' },
          { title: 'Split by gender → undress → shower', note: 'Follow the color-coded sign to your gender\'s bathing floor. Fully undress at your locker, then shower thoroughly before touching any pool, this part is strictly nude and strictly by the rules.', emoji: '🚿' },
          { title: 'Soak in the hot/cold pools', note: 'Alternate hot and cold pools as long as you like, this floor is single-gender only, no uniform.', emoji: '♨️' },
          { title: 'Put on the uniform, go up to the sauna floor', note: 'This floor is mixed-gender, everyone wears the same baggy shorts-and-shirt uniform. Multiple kiln-sauna rooms at different temperatures, TV lounge, sleeping hall.', emoji: '👕' },
          { title: 'Snack bar break', note: 'Sikhye (sweet rice drink) + a baked egg is the classic combo, charged to your wristband, settle up at checkout.', emoji: '🥚' },
          { title: 'Sleep over (optional) or check out', note: 'Grab a mat and pillow in the sleeping hall if staying overnight, or return your key/wristband at the counter to pay and leave.', emoji: '💤' },
        ],
      },
    ],
    itemsTitle: 'Well-known spots to try',
    items: [
      { name: 'Dragon Hill Spa', nameKo: '드래곤힐스파', emoji: '🐉', price: '₩13,000–15,000', where: 'Yongsan Stn', note: 'Huge, tourist-famous, genuinely 24h, probably the easiest first jjimjilbang for a foreigner.' },
      { name: 'Siloam Sauna', nameKo: '실로암 사우나', emoji: '🔥', price: '₩8,000–10,000', where: 'Seoul Stn area', note: 'Classic, no-frills neighborhood bathhouse, cheaper, more local, still foreigner-friendly.' },
      { name: 'Spa Lei', nameKo: '스파레이', emoji: '🌸', price: '₩15,000–20,000', where: 'Gangnam', note: 'Upscale, women-only spa, nicer facilities, popular with K-beauty-minded visitors.', caution: 'Women only, check before you plan a group visit.' },
    ],
    swatch: ['#5b3a52', '#b06b98'],
  },

  // ─────────────── Day Trips ───────────────
  {
    slug: 'day-trips', kind: 'guide', category: 'Day Trips', photoUrl: COVER.bukhansan, updated: 'Jul 2026',
    title: 'Day Trips Near Seoul', subtitle: 'Under 90 minutes out, back by dinner', badge: '🚄 Day Trips',
    description: "Some of Korea's best sights are a short subway ride or shuttle from the city, no KTX ticket needed. Where they are, exactly how to get there without a car, and what each one is actually for.",
    meta: [{ icon: 'clock', label: '30–90 min out' }, { icon: 'sparkle', label: '7 picks' }],
    tips: [
      'All seven of these are doable by public transport alone, no rental car needed.',
      'Nami Island and the DMZ are the two that need advance booking (ferry ticket and a licensed tour respectively), sort those first if your dates are fixed.',
      'Pair a subway-line destination (Suwon, Incheon) with a half-day in the city the same day; save the shuttle-bus ones (Nami, Everland, Paju) for a dedicated full day.',
    ],
    blocks: [
      {
        type: 'steps', title: 'Booking the two that need it ahead', subtitle: 'Nami Island & the DMZ',
        steps: [
          { title: 'Nami Island: book the ferry + entry online', note: "A combined round-trip ferry + admission ticket runs ≈₩16,000–19,000 on Klook/Trazy, cheaper than paying at the gate. You get a QR code by email, show it at the ferry ticket booth (technically the \"Naminara Republic Immigration Office\", the island's playful branding).", emoji: '🎟️' },
          { title: 'DMZ/JSA: book a licensed tour 72+ hours ahead', note: 'Standard DMZ tours run ₩55,000–95,000; a JSA/Panmunjom tour (the actual border line) is ₩150,000+ and requires submitting a full-color passport copy in advance for UNC registration.', emoji: '🪖' },
          { title: 'Bring the physical passport on the day', note: "Not a photo of it, the real passport, it's checked at military checkpoints for both tours.", emoji: '📘' },
        ],
      },
    ],
    itemsTitle: 'Where to go',
    items: [
      { name: 'DMZ & JSA', nameKo: '비무장지대', emoji: '🪖', price: 'Tour ₩50,000+', where: '~1 hr north', note: 'The tense, fascinating border with North Korea, the Third Tunnel, observatory and JSA.', caution: 'Must join a licensed tour and bring your passport; book days ahead.' },
      { name: 'Nami Island', nameKo: '남이섬', emoji: '🌲', price: 'ITX + ferry ≈ ₩15,000', where: '~1.5 hr (Gapyeong)', note: 'The tree-lined island of Winter Sonata fame, dreamy in autumn foliage. ITX train to Gapyeong, then a short ferry.' },
      { name: 'Everland', nameKo: '에버랜드', emoji: '🎢', price: '₩60,000+', where: '~1 hr (Yongin)', note: "Korea's biggest theme park, coasters, a zoo, and seasonal flower festivals. Direct shuttle bus from Gangnam/Jamsil stations." },
      { name: 'Suwon Hwaseong', nameKo: '수원 화성', emoji: '🏛️', price: 'Subway Line 1', where: '~1 hr south', note: 'A UNESCO fortress wall you can walk, with archery and a night market, all reachable straight off Line 1, no transfers.' },
      { name: 'Incheon Chinatown', nameKo: '인천 차이나타운', emoji: '🥟', price: 'Subway Line 1', where: '~1 hr west', note: 'Jjajangmyeon\'s birthplace + the colourful Songwol-dong fairy-tale village.' },
      { name: 'Paju Heyri Art Village', nameKo: '파주 헤이리', emoji: '🎨', price: 'Shuttle ₩3,000+', where: '~1 hr northwest', note: 'A whole village of galleries, bookshops and cafes in odd architecture, pair with Imjingak nearby.' },
      { name: 'Yangpyeong / Semiwon', nameKo: '양평·세미원', emoji: '🪷', price: 'ITX ₩3,000–5,000', where: '~1 hr east', note: 'Riverside lotus gardens and a scenic rail-bike track along the old line, a quiet, green half-day.' },
    ],
    swatch: ['#2f4858', '#5b7a99'],
  },
  {
    slug: 'city-day-trips', kind: 'guide', category: 'Day Trips', photoUrl: COVER.gyeongchunLine, updated: 'Aug 2026',
    title: 'Day Trips to Other Cities', subtitle: 'KTX out and back, same day', badge: '🚄 Day Trips',
    description: "Korea is small enough that Busan, Gyeongju, or Jeonju are a real same-day trip by KTX, leave after breakfast, be back for a late dinner. Here's which cities actually work as a day trip, and what to build the day around.",
    meta: [{ icon: 'clock', label: '2–3 hrs each way' }, { icon: 'sparkle', label: '5 cities' }],
    tips: [
      'Book the first KTX out (usually ~06:00–07:00) and the last one back to actually get a full day, fares vary by train time, and early departures tend to be cheaper.',
      'Store bags in a coin locker at the destination station (every KTX station has them) instead of hauling a day bag around all day.',
      "Busan and Gyeongju are the most doable, both have a walkable core near the station. Jeonju's hanok village is a 15-min taxi/bus from its KTX-Jeonju stop.",
      'Check the "KTX vs Flight vs Bus" guide for full fare and time comparisons before you book.',
    ],
    blocks: [
      {
        type: 'compare', title: 'Fare & journey time at a glance', subtitle: 'One-way, standard class',
        columns: ['Busan', 'Gyeongju', 'Jeonju', 'Gangneung', 'Chuncheon'],
        rows: [
          { label: 'Fare', values: ['≈₩59,800', '≈₩50,000–54,500', '≈₩18,000–34,000', '≈₩27,600–29,000', '≈₩9,800 (ITX)'] },
          { label: 'Time', values: ['≈2h30m', '≈2h10m', '≈1h50m', '≈2h', '≈1h20m'] },
        ],
        note: 'Fares swing with train time and how far ahead you book, first class runs roughly 40–50% more. Jeonju\'s range is wide because both KTX and the cheaper ITX-Saemaeul run the route.',
      },
      // TEMPORARILY REMOVED — restore once a build containing the Seoul filter
      // in lib/remoteData.tsx ships (i.e. after TestFlight build #7 clears
      // review). This block's places are the only non-Seoul rows in `places`,
      // and build #7 has no filter, so keeping them in production leaks
      // Korean-named Busan/Jeonju spots into its Explore list.
      // To restore: un-comment this block, re-run
      //   npx tsx scripts/import-tourapi-daytrip-cities.ts
      //   npx tsx scripts/curate-daytrip-landmarks.ts
      // then reseed themes. See scripts/cleanup-daytrip-cities.ts for the rollback.
      /*
      {
        type: 'places', title: 'Real spots to anchor each city', subtitle: 'Three per city, straight from the tourism board',
        placeSlugs: [
          'haeundae-beach-126081', 'gamcheon-culture-village-1997221', 'jagalchi-market-132190',
          'bulguksa-temple-126166', 'seokguram-grotto-126216', 'daereungwon-tomb-complex-1492402',
          'jeonju-hanok-village-264284', 'jeonju-hyanggyo-147684', 'jeonju-nambu-market-132326',
          'gyeongpo-beach-128758', 'ojukheon-129784', 'terarosa-coffee-factory-1950195',
          'chuncheon-myeongdong-dakgalbi-alley-264432', 'samaksan-lake-cable-car-2814588', 'uiam-lake-skywalk-2605236',
        ],
        notes: {
          'haeundae-beach-126081': "Busan's most famous beach, and the anchor for the wider Haeundae district (Dongbaek Island, the Blue Line coastal train).",
          'gamcheon-culture-village-1997221': 'A steep, colorful hillside village that rewards wandering, follow the little painted signposts, not a straight route.',
          'jagalchi-market-132190': 'The most Busan experience of the three, pick your own catch and eat it steps away.',
          'bulguksa-temple-126166': "Gyeongju's headline sight and a real UNESCO landmark, not overhyped.",
          'seokguram-grotto-126216': "Pair with Bulguksa, they're on the same mountain a short ride apart.",
          'daereungwon-tomb-complex-1492402': 'A rare case where you can walk right up against 1,500-year-old royal tombs, in the middle of a modern city block.',
          'jeonju-hanok-village-264284': 'The reason most people come to Jeonju at all, hundreds of hanok in one walkable stretch.',
          'jeonju-hyanggyo-147684': "Steps from the main hanok streets but far quieter, a good reset if the crowds get to be a lot.",
          'jeonju-nambu-market-132326': "Less touristy than the hanok village's snack alleys, the actual market where locals shop and eat.",
          'gyeongpo-beach-128758': "Gangneung's easy, scenic anchor, beach on one side, a quiet lake on the other.",
          'ojukheon-129784': 'A genuinely important historical site, not just a photo-op, the birthplace of two figures who once appeared on Korean banknotes.',
          'terarosa-coffee-factory-1950195': "One of the roasters that built Gangneung's reputation as a coffee city.",
          'chuncheon-myeongdong-dakgalbi-alley-264432': "Chuncheon's single must-eat, a whole street built around one dish.",
          'samaksan-lake-cable-car-2814588': "The best wide view of Uiam Lake you'll get without a boat.",
          'uiam-lake-skywalk-2605236': "A quick, easy stop if you don't have time for the cable car.",
        },
      },
      */
    ],
    itemsTitle: 'Which city, and why',
    items: [
      { name: 'Busan', nameKo: '부산', emoji: '🌊', price: 'KTX ~2h30m', where: 'Busan Station', note: 'Haeundae beach, Gamcheon culture village, Jagalchi fish market. Korea\'s second city, coastal and completely different energy from Seoul.', caution: "It's a lot for one day, pick 2 neighborhoods max, don't try to see all of Busan." },
      { name: 'Gyeongju', nameKo: '경주', emoji: '🏛️', price: 'KTX ~2h10m (Singyeongju)', where: 'Singyeongju Station', note: 'The open-air museum city: Bulguksa Temple, Seokguram Grotto, and royal burial mounds you can walk right up to.', caution: 'Singyeongju station is ~15 min from the sights by bus/taxi, not walkable.' },
      { name: 'Jeonju', nameKo: '전주', emoji: '🍚', price: 'KTX ~1h50m', where: 'Jeonju Station', note: "Korea's food capital, the hanok village, bibimbap at its birthplace, and the best street-food alley in the country.", caution: "Go hungry. Jeonju is genuinely about the food more than the sights." },
      { name: 'Gangneung / Sokcho', nameKo: '강릉·속초', emoji: '⛰️', price: 'KTX ~2h (Gangneung)', where: 'Gangneung Station', note: 'East-coast beaches and coffee streets (Gangneung), or Seoraksan mountain views (Sokcho, 1 hr further by bus).', caution: 'Doing Seoraksan properly needs a full day on its own, pick one, not both.' },
      { name: 'Chuncheon', nameKo: '춘천', emoji: '🥘', price: 'ITX ~1h20m', where: 'Chuncheon Station', note: 'The closest real "other city" trip, dakgalbi (spicy stir-fried chicken) alley and a lakeside cable car.', caution: 'The most relaxed option if a full KTX day feels like too much.' },
    ],
    swatch: ['#1f4d4a', '#4a9d8e'],
  },
  {
    slug: 'kpop-fan-guide', kind: 'guide', category: 'K-Content', photoUrl: COVER.ddp,
    title: 'K-pop Fan Pilgrimage', subtitle: 'Music shows, birthday cafes & photocards', badge: '🎤 K-Content', updated: 'Jul 2026',
    refresh: {
      source: 'Current music-show broadcast schedule + audience-application rules (each show changes network/day/time between seasons); fan-cafe / photocard neighborhood chatter on X and r/kpop',
      cadence: 'seasonal',
      targets: ['📺 Music show tapings', '☕ Fan neighborhoods'],
      lastRefreshed: '2026-07',
      recipe: "Music-show details (network, filming day, how to apply for the audience) change every season, verify the '📺 Music show tapings' entries against the current broadcast schedule. Sanity-check the '☕ Fan neighborhoods' (birthday-cafe hotspots shift, e.g. Seongsu vs Hongdae). Leave the evergreen photocard/etiquette copy. Bump `updated` + refresh.lastRefreshed.",
    },
    description: "Seoul is the pilgrimage: watch a live music show taping, hunt photocards in Myeongdong basements, and drink your bias's birthday latte in Seongsu. Here's how fans actually do it, the systems, the neighborhoods, and the etiquette.",
    meta: [{ icon: 'sparkle', label: '14 entries' }, { icon: 'clock', label: 'Shows: Tue–Sun' }],
    tips: [
      'Music-show tapings are FREE but competitive, most require pre-registration with the fan community (or luck at standby lines). Bring your passport and the physical album if required.',
      "Birthday cafes (생일카페) are pop-up events fans throw for idols' birthdays, order a drink, get free photocard 'freebies'. Find them on X by searching '아이돌이름 생일카페'.",
      'Photocard etiquette: prices are set by rarity, sleeves are sacred, and trading happens openly, bring a toploader.',
      'HYBE/SM/JYP buildings are offices, not attractions, the fan spots are their official stores, not the lobbies.',
      'Album prices in Korea (₩15–25k) beat overseas prices, and many stores bundle exclusive photocards or lucky draws.',
    ],
    sections: [
      {
        title: '📺 Music show tapings',
        subtitle: 'One show almost every day of the week',
        items: [
          { name: 'M Countdown (Mnet)', nameKo: '엠카운트다운', price: 'Thu · free', where: 'CJ ENM Center, Sangam', note: 'The flagship. Pre-recording queues form before dawn; global fans enter via Mnet Plus app events.', emoji: '🎬' },
          { name: 'Music Bank (KBS)', nameKo: '뮤직뱅크', price: 'Fri · free', where: 'KBS Hall, Yeouido', note: 'Longest-running. KBS runs a foreigner standby line, passport required, arrive by ~6am for big lineups.', emoji: '📡' },
          { name: 'Show! Music Core (MBC)', nameKo: '쇼! 음악중심', price: 'Sat · free', where: 'MBC Sangam', note: 'The Saturday slot, and the one most weekend visitors miss, pre-recording runs in the morning, live broadcast early afternoon.', emoji: '🎶' },
          { name: 'Inkigayo (SBS)', nameKo: '인기가요', price: 'Sun · free', where: 'SBS Prism Tower, Sangam', note: 'Sunday closer, live mid-afternoon. Fan-club pre-registration dominates seats; standby is a long shot but happens.', emoji: '🌟' },
          { name: 'The Show / Show Champion', price: 'Tue / Wed · free', where: 'Sangam · Ilsan', note: "Smaller shows = best odds of getting in. Check each show's X account for foreigner applications.", emoji: '🎫' },
        ],
      },
      {
        title: '🛍️ Where fans shop',
        items: [
          { name: 'Myeongdong Underground Shopping Center', nameKo: '명동지하쇼핑센터', price: '₩1,000+', where: 'Myeongdong Stn', note: 'The classic photocard/merch basement maze, light haggling is fine here.', emoji: '🃏' },
          { name: 'Ktown4u COEX', nameKo: '케이타운포유', price: 'Albums ₩15–25k', where: 'COEX, Samseong', note: 'Giant official store: albums, lucky draws, fan-sign entry events, tax refund counter.', emoji: '💿' },
          { name: 'WithMuu / Everline stores', price: 'Albums + benefits', where: 'Hongdae · Myeongdong', note: 'Chain music stores with exclusive photocard benefits per version, compare before buying.', emoji: '🎁' },
          { name: 'Label flagship pop-ups', nameKo: '광야서울 등', price: 'Varies', where: 'Seongsu · Yongsan', note: 'SM/HYBE-affiliated stores rotate artist pop-ups constantly, check what opened the week you land.', emoji: '🏢' },
          { name: 'Photoism idol frames', nameKo: '포토이즘', price: '₩4,000–5,000', where: 'Everywhere', note: 'Photo-booth chains run rotating idol collab frames, the fan souvenir that costs pocket change.', emoji: '📸' },
        ],
      },
      {
        title: '☕ Fan neighborhoods',
        items: [
          { name: 'Seongsu-dong birthday cafe crawl', nameKo: '성수 생일카페', price: 'One drink per cafe', where: 'Seongsu', note: "Seoul's birthday-cafe capital, on a big idol birthday, whole blocks turn into shrines with freebies.", emoji: '🎂' },
          { name: 'Hapjeong / Hongdae fan cafes', price: '₩6–8k drinks', where: 'Mapo', note: "Agency-adjacent cafes where comeback cup-sleeve events cluster, check X for this week's events.", emoji: '🧋' },
          { name: 'K-Star Road', nameKo: '케이스타로드', price: 'Free', where: 'Apgujeong Rodeo', note: "GangnamDol bear statues for major groups along the old agencies' block.", emoji: '🐻' },
          { name: 'Idol billboard spotting', price: 'Free', where: 'Subway stations', note: 'Fan-funded birthday billboards fill stations like Seongsu, Hapjeong, Hongdae, part of the streetscape.', emoji: '🖼️' },
        ],
      },
    ],
    swatch: ['#5b6f9c', '#8fb0c0'],
  },

  // ─────────────── Neighborhoods ───────────────
  {
    slug: 'gangnam-guide', kind: 'guide', category: 'Neighborhoods', photoUrl: COVER.gangnamStn, updated: 'Jul 2026',
    title: 'Gangnam, Beyond the Song', subtitle: 'What the district is actually like on the ground', badge: '🏙️ Neighborhoods',
    description: "Gangnam is Seoul's glossiest district, but it's really three different neighborhoods stitched together, and most first-time visitors only see one of them (the COEX mall). Here's how the area actually breaks down, and a real spot in each to anchor your visit.",
    meta: [{ icon: 'sparkle', label: '3 sub-areas compared' }, { icon: 'won', label: 'Pricier than average' }],
    tips: [
      "Gangnam isn't one place, it's Gangnam Station (nightlife/office towers), COEX/Samseong (malls, aquarium, K-pop stores), and Apgujeong/Cheongdam/Garosu-gil (fashion, cafes, plastic-surgery clinics), each a subway stop or two apart.",
      'Prices run noticeably higher here than Hongdae or Jongno, a coffee that\'s ₩4,500 elsewhere is often ₩7,000+ on Garosu-gil.',
      "COEX Mall connects underground to Samseong Station, Starfield Library and the Aquarium, you can spend a whole rainy afternoon without going outside once.",
      'Bongeunsa Temple sits directly across from the COEX convention center, a genuinely quiet, free escape a two-minute walk from the mall crowds.',
    ],
    blocks: [
      {
        type: 'compare', title: 'The three Gangnams', subtitle: 'Same district, three different nights out',
        columns: ['Gangnam Station', 'COEX / Samseong', 'Apgujeong · Cheongdam · Garosu-gil'],
        rows: [
          { label: 'What it is', values: ['Nightlife strip + office towers', 'Malls, aquarium, K-pop stores, all linked underground', 'Fashion, cafes, galleries, the plastic-surgery clinic row'] },
          { label: 'Get there', values: ['Gangnam Stn, Line 2 or 9', 'Samseong Stn, Line 2', 'Apgujeong / Apgujeongrodeo Stn, Line 3 or Bundang Line'] },
          { label: 'Best for', values: ['Late-night eating, karaoke, drinking', 'A rainy-day plan, a whole afternoon indoors', 'A slow walk, cafe-hopping, window shopping'] },
          { label: 'Watch for', values: ["The underground restaurant alleys turn into a maze after midnight", 'COEX alone can eat 3+ hours if you let it', 'Prices run highest here, a ₩4,500 coffee elsewhere is often ₩7,000+'] },
        ],
        note: "They're only a stop or two apart, but a realistic day is COEX in the afternoon, then either Gangnam Station's restaurant strip or a Garosu-gil cafe crawl for the evening, not all three in one day.",
      },
      {
        type: 'places', title: 'Real spots to start with', subtitle: 'Anchor points across the three sub-areas',
        placeSlugs: ['vs-ENP026558', 'vs-ENP024663', 'vs-ENP000374', 'vs-ENP000411', 'vs-ENP000291', 'vs-ENP001307', 'vs-ENP001414'],
        notes: {
          'vs-ENP026558': "The free, photogenic center of COEX Mall, two-story shelves anyone can sit and read at, the easiest first stop if you land at Samseong Station.",
          'vs-ENP024663': 'The convention center the whole underground mall is built around, exhibitions and summits run alongside the shopping, check what\'s on before you go.',
          'vs-ENP000374': "20,000+ creatures across 650 species in themed zones, a genuine half-day if you commit to it, not just a mall detour.",
          'vs-ENP000411': 'A working Buddhist temple founded in 794, sitting directly across from the COEX convention center, a two-minute walk from the mall crowds into total quiet.',
          'vs-ENP000291': "Was a gallery-and-designer-studio street 20 years ago before it became one of Seoul's priciest shopping strips, the tree-lined layout is still what makes it walkable.",
          'vs-ENP001307': "Louis Vuitton to Margiela, Seoul's actual luxury row, window-shopping territory more than a buying trip for most visitors.",
          'vs-ENP001414': 'Two Joseon-dynasty royal tombs combined into one UNESCO-listed site, genuinely quiet green space a short walk from Gangnam\'s towers.',
        },
      },
    ],
    swatch: ['#5a1f4a', '#c2569b'],
  },
  {
    slug: 'hidden-seoul', kind: 'guide', category: 'Neighborhoods', photoUrl: COVER.seongbuk, updated: 'Jul 2026',
    title: 'Seoul Off the Main Map', subtitle: 'Real spots outside Hongdae, Myeongdong & Gangnam', badge: '🗺️ Neighborhoods',
    description: "Most first trips stay inside four or five neighborhoods. One subway ride further out, Seoul has hanok villages with no tour groups, a wooden skywalk almost nobody's heard of, and royal tombs you'll often have entirely to yourself.",
    meta: [{ icon: 'sparkle', label: '7 picks' }, { icon: 'info', label: '1 subway ride out' }],
    tips: [
      'None of these are far, most are 20–35 minutes by subway from the city center, just in gu\'s (districts) tour buses skip.',
      'Go on a weekday if you can, these stay genuinely quiet even on weekends, but weekday mornings are close to empty.',
      "This is a great pairing with a slower, no-agenda day, nothing here needs advance booking or a ticket line, except the furniture museum, that one's reservation-only.",
    ],
    blocks: [
      {
        type: 'places', title: 'Where to go', subtitle: 'Real places, well outside the usual loop',
        placeSlugs: ['vs-ENP035673', 'vs-ENP998h6q', 'vs-ENPxa3w2o', 'vs-ENP002299', 'vs-ENP023760', 'vs-ENP032546', 'vs-ENP003452'],
        notes: {
          'vs-ENP035673': 'Modern hanok built to read as centuries old, with Bukhansan as the backdrop, the walkway continues up to Jingwansa Temple if you want to keep going past the village itself.',
          'vs-ENP998h6q': 'A 160m wooden deck floating up to 10m above the treeline on the Seoul Dulle Trail, N Seoul Tower to Bukhansan laid out in one sweep, and almost nobody outside Jungnang-gu has heard of it.',
          'vs-ENPxa3w2o': "Korea's first private art museum, built on one collector's fight to keep national treasures out of Japanese hands during the colonial period, still the backbone of Korean art history research today.",
          'vs-ENP002299': "Two Joseon royal tombs sitting quietly beside Korea's Olympic training center, part of the same UNESCO-listed set as the more-visited tombs closer to downtown, just with almost nobody else there.",
          'vs-ENP023760': "One of Seoul's four historic great gates, and the one that stayed off-limits near the old presidential compound for decades, public access only came back in 2006. Now an easy hike along the old city wall.",
          'vs-ENP032546': 'A cluster of gamjaguk (pork rib and potato stew) restaurants that turned one Eunpyeong side street into its own food destination since the mid-1980s, each with its own broth recipe and zero tour buses.',
          'vs-ENP003452': '2,500+ pieces of traditional wooden furniture staged inside 10 real hanok, not behind glass. Reservation-only (book in English on the museum site), which is exactly why it never feels crowded.',
        },
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
    name: 'Gwangjang Market, Yukhoe Alley', nameKo: '광장시장 육회골목',
    category: 'Market / Street food', neighborhood: 'Jongno', city: 'Seoul',
    address: '88 Changgyeonggung-ro, Jongno-gu, Seoul', hours: '10:00–22:00', priceRange: '₩₩',
    rating: 4.4, reviews: 2310,
    description: 'Famous market for yukhoe (beef tartare), bindaetteok, and mayak gimbap. TIP: confirm the price before you sit, some stalls overcharge tourists.',
    soloOk: true, englishMenu: true, priceTransparent: false, cardOk: true, englishSpoken: true,
    votes: { soloOk: { yes: 55, no: 0 }, englishMenu: { yes: 47, no: 0 }, cardOk: { yes: 33, no: 0 }, englishSpoken: { yes: 40, no: 0 } },
    warnTip: 'Some stalls quote inflated prices to foreigners, confirm before you sit.',
    kContentTitle: 'K-Travel', kContentType: 'Variety',
    kContentNote: 'Constantly featured in food vlogs, go for the food, watch the prices.',
    swatch: ['#7a4a2a', '#e0a05a'],
  },
  {
    slug: 'gs25-euljiro-combo', lat: 37.566, lng: 126.9915,
    name: 'GS25 Euljiro, combo stop', nameKo: 'GS25 을지로점',
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
    kContentNote: "That sheep-towel, sikhye-drinking jjimjilbang scene you've seen on screen, do it yourself.",
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
  { key: 'history', emoji: '🏛️', label: 'Palaces & Hanok' },
  { key: 'nature', emoji: '🏔️', label: 'Nature & Hiking' },
  { key: 'nightlife', emoji: '🍸', label: 'Nightlife & Bars' },
  { key: 'shopping', emoji: '🛍️', label: 'Shopping & Fashion' },
  { key: 'cafe', emoji: '☕', label: 'Cafe Hopping' },
  { key: 'gaming', emoji: '🎮', label: 'Webtoons & Gaming' },
];

export const TIERS: Tier[] = [
  { key: 'newcomer', label: 'Newcomer', emoji: '🌱', min: 0, blurb: 'Just landed' },
  { key: 'explorer', label: 'Explorer', emoji: '🧭', min: 100, blurb: 'Finding your way' },
  { key: 'guide', label: 'Local Guide', emoji: '📍', min: 300, blurb: 'Helping others' },
  { key: 'expert', label: 'Korea Expert', emoji: '⭐', min: 700, blurb: 'The real deal' },
];
