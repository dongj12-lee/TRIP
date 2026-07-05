// Community / creator / user seed content ported from source/data.jsx.
import { Buddy, Creator, Itinerary, Post } from './types';

export const POSTS: Post[] = [
  {
    slug: 'my-first-seoul-route', type: 'route',
    title: 'My first 2 days in Seoul — too packed? Roast my route 🙏',
    body: 'Landing Friday morning, leaving Sunday night. First time in Korea, solo. I tried to mix palaces, markets and the Euljiro nightlife everyone raves about. Is this realistic on foot + subway, or am I trying to do too much? Brutal feedback welcome!',
    neighborhood: 'Seoul', author: { name: 'You', country: '🧳' }, when: '5h ago', votes: 31, comments: 3,
    routeDays: [
      {
        day: 'Day 1', theme: 'Palaces & Euljiro',
        stops: [
          { name: 'Gyeongbokgung Palace', note: '9am — rent a hanbok nearby for free entry', time: '9:00' },
          { slug: 'euljiro-coffee-hanyak', note: 'Hidden antique café for a slow coffee', time: '12:30' },
          { slug: 'gwangjang-yukhoe', note: 'Late lunch: yukhoe + bindaetteok', time: '14:00' },
          { slug: 'nogari-alley-manseon', note: 'Evening — cheap beer on plastic stools', time: '19:00' },
        ],
      },
      {
        day: 'Day 2', theme: 'Cold noodles & sauna',
        stops: [
          { slug: 'eulji-myeonok', note: 'Pyongyang-style naengmyeon for lunch', time: '12:00' },
          { name: 'Bukchon Hanok Village', note: 'Afternoon stroll through the old streets', time: '15:00' },
          { slug: 'siloam-sauna', note: 'Wind down at a 24h jjimjilbang', time: '20:00' },
        ],
      },
    ],
    commentList: [
      { name: 'Marcus', country: '🇬🇧', body: 'Solid! But Day 1 is heavy — Gyeongbokgung to Gwangjang is fine, but adding Euljiro nightlife after means a lot of walking. Maybe drop the café or do it Day 2.', when: '4h ago' },
      { name: 'Hyejin', country: '🇰🇷', body: "Go to Gwangjang BEFORE 2pm or it's mobbed. Also Bukchon is quieter early morning if you can swap it with the palace.", when: '3h ago' },
      { name: 'Sora', country: '🇯🇵', body: "Siloam after a full day is *chef's kiss*. Get the sikhye and a roasted egg 🥚", when: '2h ago' },
    ],
  },
  {
    slug: 'order-budae-jjigae-solo', type: 'tip',
    title: 'How to actually eat budae-jjigae as a solo traveler',
    body: "Most budae-jjigae places have a 2-person minimum. Two tricks: (1) ask for '1인분 가능해요?' — some say yes off-menu, (2) go to a kimbap/snack spot that does single portions. Don't get turned away at the door!",
    neighborhood: 'Euljiro', author: { name: 'You', country: '🧳' }, when: '3h ago', votes: 42, comments: 1,
    commentList: [
      { name: 'Mia', country: '🇺🇸', body: 'Confirmed — a place in Euljiro let me order a single portion when I asked politely. Saved my night.', when: '2h ago' },
    ],
  },
  {
    slug: 'gwangjang-no-tourist-markup', type: 'tip',
    title: 'Gwangjang Market without the tourist markup',
    body: 'Always ask the price BEFORE you sit. Point to the menu, confirm the number. The yukhoe alley is great but a few stalls quote inflated prices to foreigners. Cash helps you negotiate.',
    neighborhood: 'Jongno', placeSlug: 'gwangjang-yukhoe', author: { name: 'Mia', country: '🇺🇸' }, when: '1d ago', votes: 38, comments: 0,
    commentList: [],
  },
  {
    slug: 'first-jjimjilbang-as-a-foreigner', type: 'question',
    title: 'First time at a jjimjilbang — what do I actually do?',
    body: "Planning to try Siloam. Do I shower first? Is the sauna gender-separated? Can I really sleep there overnight? Any etiquette I should know so I don't embarrass myself?",
    neighborhood: 'Seoul Station', placeSlug: 'siloam-sauna', author: { name: 'Sora', country: '🇯🇵' }, when: '2d ago', votes: 51, comments: 2,
    commentList: [
      { name: 'Mia', country: '🇺🇸', body: "Shower first (naked, it's normal!). Bath area is gender-separated, common sauna areas are mixed with the sleep clothes they give you. Overnight is totally fine.", when: '2d ago' },
      { name: 'Leo', country: '🇫🇷', body: 'Get the sikhye drink and a roasted egg. Trust me.', when: '1d ago' },
    ],
  },
  {
    slug: 'best-solo-naengmyeon', type: 'review',
    title: 'Eulji Myeonok is the best solo lunch in Seoul',
    body: "Walked in alone at 2pm, no questions asked. Quiet, fast, and the cold broth is unreal on a hot day. They don't speak much English but pointing at the picture menu works fine.",
    neighborhood: 'Euljiro', placeSlug: 'eulji-myeonok', author: { name: 'You', country: '🧳' }, when: '4d ago', votes: 29, comments: 0,
    commentList: [],
  },
  {
    slug: 'cheap-eats-seoul-station', type: 'tip',
    title: 'Cheap eats near Seoul Station that take foreign cards',
    body: 'Landing late with no cash? Around Seoul Station the basement food court and a cluster of gimbap/bunsik spots all take foreign cards and have picture menus. My go-to: a 4,000-won kimchi-jjigae set that\'s open till midnight. Tap, point, eat.',
    neighborhood: 'Seoul Station', author: { name: 'You', country: '🧳' }, when: '1w ago', votes: 18, comments: 3,
    commentList: [
      { name: 'Diego', country: '🇲🇽', body: 'Lifesaver after a 14-hour flight. The food court is right under the station.', when: '6d ago' },
      { name: 'Anya', country: '🇩🇪', body: 'Which exit is the kimchi-jjigae spot near?', when: '5d ago' },
    ],
  },
  {
    slug: 'tmoney-card-tip', type: 'tip',
    title: 'Get a T-money card before you do ANYTHING else',
    body: 'Grab one at any CU/GS25 convenience store (~₩3,000) and load cash. One tap covers subway, every bus, AND taxis — plus you get free transfers within 30 min. Don\'t bother buying single tickets; the card pays for itself in a day.',
    neighborhood: 'Citywide', author: { name: 'Marcus', country: '🇬🇧' }, when: '6h ago', votes: 67, comments: 2,
    commentList: [
      { name: 'Anya', country: '🇩🇪', body: 'Also works at the airport convenience stores the second you land. Did it before even leaving Incheon.', when: '5h ago' },
      { name: 'Priya', country: '🇨🇦', body: 'Tip on a tip: you can get the leftover balance refunded at GS25 before you fly home.', when: '3h ago' },
    ],
  },
  {
    slug: 'naver-map-not-google', type: 'tip',
    title: 'Use Naver Map or Kakao Map — NOT Google Maps',
    body: 'Google Maps walking/transit directions barely work in Korea (national security data rules). Download Naver Map or Kakao Map instead — they have live subway times, bus arrivals, and accurate walking routes. Search in English works fine on both.',
    neighborhood: 'Citywide', author: { name: 'Diego', country: '🇲🇽' }, when: '1d ago', votes: 58, comments: 1,
    commentList: [
      { name: 'Sora', country: '🇯🇵', body: "Kakao Map's subway exit numbers saved me so many times. Always note which exit before you go up.", when: '20h ago' },
    ],
  },
  {
    slug: 'convenience-store-hacks', type: 'tip',
    title: 'Convenience store meals are genuinely good (and cheap)',
    body: 'CU, GS25 and 7-Eleven have hot bins, microwaves and free hot water. Get a triangle gimbap + cup ramyeon for under ₩4,000, or the viral combos (try the Baekjong-won fried rice). Card accepted everywhere. Perfect for a cheap solo dinner.',
    neighborhood: 'Citywide', author: { name: 'Leo', country: '🇫🇷' }, when: '2d ago', votes: 49, comments: 2,
    commentList: [
      { name: 'Mia', country: '🇺🇸', body: 'The corn dogs and the cheese ramyeon hack are unreal. Self-serve hot water is by the door usually.', when: '1d ago' },
      { name: 'Diego', country: '🇲🇽', body: "Don't sleep on the banana milk and the egg bread either.", when: '1d ago' },
    ],
  },
  {
    slug: 'tax-free-shopping-tip', type: 'tip',
    title: 'How tax-free works for tourists (instant vs refund)',
    body: "Spend ₩15,000+ at a 'Tax Free' shop and you can claim ~8–10% back. Many stores do INSTANT tax-free (discount at the register, just show your passport). For the rest, keep receipts and refund at the airport kiosk before security. Always carry your passport when shopping.",
    neighborhood: 'Myeongdong', author: { name: 'Priya', country: '🇨🇦' }, when: '3d ago', votes: 41, comments: 1,
    commentList: [
      { name: 'Anya', country: '🇩🇪', body: 'At the airport do the refund BEFORE you check your bags — they sometimes want to see the items.', when: '2d ago' },
    ],
  },
  {
    slug: 'esim-data-tip', type: 'tip',
    title: 'Sort your data: eSIM before you fly, or SIM at arrivals',
    body: 'An eSIM (Airalo etc.) activates the moment you land — easiest if your phone supports it. Otherwise grab a SIM at the airport arrivals counters (KT/SKT). You NEED data here: maps, Kakao T taxis, translation, and a lot of shops/cafés use QR menus.',
    neighborhood: 'Incheon', author: { name: 'Anya', country: '🇩🇪' }, when: '4d ago', votes: 36, comments: 0,
    commentList: [],
  },
  {
    slug: 'cafe-bathroom-codes', type: 'tip',
    title: "Café bathrooms often need a passcode — it's on your receipt",
    body: "Lots of cafés and mall toilets are locked with a keypad. The code is usually printed on your receipt, or posted by the counter. If you're stuck, just ask staff '비밀번호?' (bimilbeonho = password). Saves a confused dance at the door.",
    neighborhood: 'Citywide', author: { name: 'Sora', country: '🇯🇵' }, when: '5d ago', votes: 33, comments: 1,
    commentList: [
      { name: 'Leo', country: '🇫🇷', body: 'Learned this the hard way at a Hongdae café 😅 Receipt code every time.', when: '4d ago' },
    ],
  },
  {
    slug: 'busan-weekend-route', type: 'route',
    title: 'Busan in 2 days from Seoul — is this doable by KTX?',
    body: 'Thinking of escaping Seoul for a weekend. KTX down Saturday morning, back Sunday night. Want beach + the colorful village + raw fish market + a temple. Am I cramming too much? Any Busan locals want to sanity-check the order?',
    neighborhood: 'Busan', author: { name: 'Diego', country: '🇲🇽' }, when: '8h ago', votes: 44, comments: 2,
    routeDays: [
      {
        day: 'Day 1', theme: 'Coast & culture',
        stops: [
          { name: 'KTX Seoul → Busan', note: '07:00 train, ~2h40m, book ahead', time: '07:00' },
          { name: 'Gamcheon Culture Village', note: 'Hillside rainbow houses, go before crowds', time: '11:00' },
          { name: 'Jagalchi Fish Market', note: 'Pick seafood, eat it upstairs', time: '14:00' },
          { name: 'Gwangalli Beach', note: 'Sunset + bridge light show', time: '19:00' },
        ],
      },
      {
        day: 'Day 2', theme: 'Temple & sea',
        stops: [
          { name: 'Haedong Yonggungsa', note: 'Seaside temple, go early', time: '09:00' },
          { name: 'Haeundae Beach', note: 'Walk the coast, brunch nearby', time: '12:30' },
          { name: 'KTX Busan → Seoul', note: 'Evening train back', time: '18:00' },
        ],
      },
    ],
    commentList: [
      { name: 'Hyejin', country: '🇰🇷', body: 'Doable! But Yonggungsa to Haeundae is a bit of a trek — do the temple FIRST thing, it gets packed by 10. Swap days if rain is forecast for Saturday.', when: '6h ago' },
      { name: 'Marcus', country: '🇬🇧', body: 'Book the KTX the second you decide — weekend trains to Busan sell out fast.', when: '5h ago' },
    ],
  },
  {
    slug: 'kpop-fan-day-route', type: 'route',
    title: 'K-pop fan day in Seoul — does this flow make sense?',
    body: 'Here for my bias 😭 Want to hit the entertainment company HQ areas, a few photo cafés, and the big music store. Trying to keep it to one efficient day without backtracking across the city. Help me order it!',
    neighborhood: 'Seoul', author: { name: 'Sora', country: '🇯🇵' }, when: '1d ago', votes: 39, comments: 2,
    routeDays: [
      {
        day: 'Day 1', theme: 'Bias mode: ON',
        stops: [
          { name: 'HYBE / Seongsu cafés', note: 'Start east, pop-up stores + photo cafés', time: '10:00' },
          { name: 'Seongsu-dong', note: 'Trendy cafés & merch, lunch here', time: '12:30' },
          { name: 'The Hyundai Seoul', note: 'Pop-ups + huge music section', time: '15:00' },
          { name: 'Hongdae busking street', note: 'Evening busking + dance crews', time: '19:00' },
        ],
      },
    ],
    commentList: [
      { name: 'Mia', country: '🇺🇸', body: 'Seongsu → Yeouido (Hyundai) → Hongdae is a clean west-bound line, no backtracking. Good call doing Hongdae last for the night energy.', when: '22h ago' },
      { name: 'Yuki', country: '🇯🇵', body: 'Add Myeongdong if you want the big flagship merch stores — it\'s between Seongsu and Hongdae-ish on Line 2.', when: '20h ago' },
    ],
  },
  {
    slug: 'rainy-day-seoul-route', type: 'route',
    title: 'Rainy day backup plan — mostly indoor Seoul?',
    body: "Forecast says rain all day Tuesday. Want to keep it mostly indoors but still feel like I'm seeing Seoul, not just malls. Got a museum + market + café in mind. What indoor gems am I missing?",
    neighborhood: 'Seoul', author: { name: 'Priya', country: '🇨🇦' }, when: '2d ago', votes: 27, comments: 1,
    routeDays: [
      {
        day: 'Rainy Day', theme: 'Indoors, but make it Seoul',
        stops: [
          { name: 'National Museum of Korea', note: 'Huge & free, easily half a day', time: '10:00' },
          { name: 'Gwangjang Market', note: 'Covered market, hot food, makgeolli', time: '13:30' },
          { name: 'Starfield COEX Library', note: 'Giant indoor library, great photos', time: '16:00' },
          { slug: 'euljiro-coffee-hanyak', note: 'Cozy hidden café to end the day', time: '18:30' },
        ],
      },
    ],
    commentList: [
      { name: 'Hyejin', country: '🇰🇷', body: 'Swap in Leeum Museum if you like modern art — gorgeous building and indoors. COEX aquarium is also right by the library if the rain really sets in.', when: '1d ago' },
    ],
  },
  {
    slug: 'tipping-in-korea-q', type: 'question',
    title: 'Do you tip in Korea? Feeling anxious about it',
    body: "Coming from the US where tipping is everything. What's the etiquette here — restaurants, taxis, cafés, hotels? Don't want to accidentally offend anyone or look clueless.",
    neighborhood: 'General', author: { name: 'Mia', country: '🇺🇸' }, when: '5h ago', votes: 54, comments: 3,
    commentList: [
      { name: 'Hyejin', country: '🇰🇷', body: 'No tipping, anywhere. Not restaurants, taxis, cafés, none. The price you see is what you pay. Trying to tip can actually confuse staff!', when: '4h ago' },
      { name: 'Marcus', country: '🇬🇧', body: 'Confirmed. Some upscale hotels add a service charge to the bill, but you never hand over cash tips.', when: '3h ago' },
      { name: 'Leo', country: '🇫🇷', body: "It felt weird for about a day, then it's amazing. Just pay and go.", when: '2h ago' },
    ],
  },
  {
    slug: 'solo-female-safety-q', type: 'question',
    title: 'Solo female traveler — how safe is Seoul at night?',
    body: 'First solo trip ever. Planning to be out for night markets and Han River evenings. How safe is it to walk around / take the subway alone late? Any areas or situations to be careful about?',
    neighborhood: 'Seoul', author: { name: 'Anya', country: '🇩🇪' }, when: '1d ago', votes: 62, comments: 3,
    commentList: [
      { name: 'Priya', country: '🇨🇦', body: 'Did 10 days solo, felt incredibly safe — subway and convenience stores everywhere, well lit. Normal big-city common sense still applies but I never felt uneasy.', when: '22h ago' },
      { name: 'Sora', country: '🇯🇵', body: 'Last subway is around midnight-ish, so plan that or budget for a Kakao T taxi. The app tracks your route which is reassuring.', when: '20h ago' },
      { name: 'Hyejin', country: '🇰🇷', body: 'Totally fine. If you take a late taxi, Kakao T shares your trip with a contact. Han River parks are busy and safe at night.', when: '18h ago' },
    ],
  },
  {
    slug: 'vegetarian-korea-q', type: 'question',
    title: 'Vegetarian in Korea — is it actually hard?',
    body: "Heard even 'veggie' dishes have fish sauce or anchovy broth. Is it realistic to eat veg here without getting hangry? Any phrases or dishes that are reliably safe?",
    neighborhood: 'General', author: { name: 'Priya', country: '🇨🇦' }, when: '2d ago', votes: 47, comments: 2,
    commentList: [
      { name: 'Leo', country: '🇫🇷', body: "Temple food (사찰음식) is 100% vegan and incredible. Also bibimbap without egg/meat, gimbap (ask no ham), and Buddhist restaurants. Say '고기 빼고, 멸치 육수도 빼고' (no meat, no anchovy broth).", when: '1d ago' },
      { name: 'Mia', country: '🇺🇸', body: 'Insadong and the area near temples have the most veg options. Falafel/Indian spots in Itaewon too if you need a break.', when: '1d ago' },
    ],
  },
  {
    slug: 'best-month-to-visit-q', type: 'question',
    title: "When's the best time to visit weather-wise?",
    body: 'Flexible on dates. I keep hearing spring and autumn but flights are cheaper in summer/winter. How bad is the summer humidity and the winter cold really? Worth paying more for spring/fall?',
    neighborhood: 'General', author: { name: 'Diego', country: '🇲🇽' }, when: '3d ago', votes: 38, comments: 2,
    commentList: [
      { name: 'Hyejin', country: '🇰🇷', body: 'Late Sept–Oct and April–May are unbeatable. Summer (Jul–Aug) is hot AND a rainy season (jangma). Winter is dry and very cold but Christmas markets + ski are fun. Worth paying for fall if you can.', when: '2d ago' },
      { name: 'Anya', country: '🇩🇪', body: 'Did August once — bring an umbrella daily and embrace AC-hopping. Beautiful but sweaty.', when: '2d ago' },
    ],
  },
];

export const BUDDIES: Buddy[] = [
  {
    id: 'b1', activity: 'Fried chicken + beer tonight', emoji: '🍗',
    author: { name: 'Mia', country: '🇺🇸' }, neighborhood: 'Hongdae', when: 'Tonight, 8pm', groupSize: 4,
    note: 'First night in Seoul, want the proper chimaek experience. English ok, all welcome!',
    interested: 2,
    interestedList: [
      { name: 'Leo', country: '🇫🇷', message: "I'm in! I know a good spot." },
      { name: 'Sora', country: '🇯🇵', message: 'Count me in 🙌' },
    ],
  },
  {
    id: 'b2', activity: 'Train to Gyeongju this weekend', emoji: '🚄',
    author: { name: 'Leo', country: '🇫🇷' }, neighborhood: 'Seoul Station', when: 'Sat, early-morning KTX', groupSize: 3,
    note: 'Day trip to Gyeongju temples + tombs. Split a taxi there. Easygoing pace.',
    interested: 1,
    interestedList: [
      { name: 'Mia', country: '🇺🇸', message: 'Always wanted to see Gyeongju!' },
    ],
  },
  {
    id: 'b3', activity: 'Gamjatang dinner — solo travelers welcome', emoji: '🍲',
    author: { name: 'Sora', country: '🇯🇵' }, neighborhood: 'Euljiro', placeSlug: 'eulji-myeonok', when: 'Thu, 7pm', groupSize: 2,
    note: "Craving spicy pork-bone stew but it's a 2-person dish. Anyone? :)",
    interested: 0, interestedList: [],
  },
];

export const CREATORS: Creator[] = [
  {
    id: 'c1', name: 'Hyejin Park', handle: 'seoul.hyejin', avatar: '🥢', swatch: ['#7a4a2a', '#e0a05a'],
    home: '🇰🇷 Seoul', verified: true, tier: 'expert', expertise: 'Markets & street food', followers: '48.2k',
    bio: 'Lifelong Seoulite mapping the pojangmacha, market alleys and late-night eats locals actually go to.',
    posts: [
      { type: 'tip', title: 'Gwangjang Market like a local: what to order, what to skip', votes: 612, comments: 41, when: '2d ago' },
      { type: 'tip', title: '5 pojangmacha etiquette rules foreigners always miss', votes: 388, comments: 22, when: '5d ago' },
      { type: 'review', title: 'The best 3,000-won gimbap in Jung-gu', votes: 240, comments: 12, when: '1w ago' },
    ],
  },
  {
    id: 'c2', name: 'Marcus Lee', handle: 'marcusinkorea', avatar: '🧭', swatch: ['#3f4a52', '#8fb0c0'],
    home: '🇬🇧 London → Seoul', verified: true, tier: 'expert', expertise: 'Solo travel & budgets', followers: '12.5k',
    bio: 'Moved to Seoul solo with no Korean. Sharing the unglamorous logistics so your trip is smoother than mine was.',
    posts: [
      { type: 'route', title: "The solo traveler's first 48 hours in Seoul", votes: 421, comments: 33, when: '1d ago' },
      { type: 'tip', title: 'T-money, transit & the apps that actually work abroad', votes: 295, comments: 18, when: '4d ago' },
    ],
  },
  {
    id: 'c3', name: 'Yuki Tanaka', handle: 'yuki.kdrama', avatar: '🎬', swatch: ['#3a2c22', '#caa05a'],
    home: '🇯🇵 Osaka', verified: false, tier: 'guide', expertise: 'K-drama filming spots', followers: '23.1k',
    bio: 'Chasing every café, rooftop and staircase from my favorite dramas. Scene-by-scene location guides.',
    posts: [
      { type: 'tip', title: 'Every filming location from that rooftop confession scene', votes: 510, comments: 47, when: '3d ago' },
      { type: 'review', title: 'The hidden Euljiro café directors keep reusing', votes: 198, comments: 9, when: '6d ago' },
    ],
  },
  {
    id: 'c4', name: 'Priya & Sam', handle: 'twoforkorea', avatar: '🍲', swatch: ['#5f6d53', '#a9bf94'],
    home: '🇨🇦 Toronto', verified: false, tier: 'guide', expertise: 'Couples & food trips', followers: '8.9k',
    bio: 'A couple eating their way across Korea. Reservation tips, sharing-friendly menus, and 2-person portions.',
    posts: [
      { type: 'tip', title: 'Restaurants that happily seat just two people', votes: 176, comments: 14, when: '2d ago' },
    ],
  },
];

// Default itinerary the app hydrates into editable state (source USER.itinerary).
export const DEFAULT_ITINERARY: Itinerary = {
  title: 'My 3 Days in Seoul', dates: 'Mar 14 – 16', travelers: 'Solo', status: 'draft',
  days: [
    {
      label: 'Day 1', date: 'Fri, Mar 14', theme: 'Palaces & old Seoul',
      stops: [
        { time: '10:00', part: 'Morning', name: 'Gyeongbokgung Palace', note: 'Rent a hanbok nearby → free entry. Catch the guard-changing ceremony.', slug: null, swatch: ['#5b6f9c', '#8fb0c0'] },
        { time: '12:30', part: 'Lunch', name: 'Coffee Hanyakbang', note: 'Slow coffee in a hidden antique café.', slug: 'euljiro-coffee-hanyak', swatch: ['#3a2c22', '#caa05a'] },
        { time: '15:00', part: 'Afternoon', name: 'Bukchon Hanok Village', note: 'Wander the old hanok streets. Quiet before sunset.', slug: null, swatch: ['#7a4a2a', '#e0a05a'] },
        { time: '19:00', part: 'Evening', name: 'Nogari Alley (Manseon Hof)', note: 'Cheap draft beer on plastic stools — peak local.', slug: 'nogari-alley-manseon', swatch: ['#3a2c22', '#c26b4a'] },
      ],
    },
    {
      label: 'Day 2', date: 'Sat, Mar 15', theme: 'Markets & cold noodles',
      stops: [
        { time: '11:30', part: 'Lunch', name: 'Eulji Myeonok', note: 'Pyongyang-style naengmyeon. Go before the queue.', slug: 'eulji-myeonok', swatch: ['#4a5240', '#a9bf94'] },
        { time: '14:00', part: 'Afternoon', name: 'Gwangjang Market — Yukhoe Alley', note: 'Yukhoe + bindaetteok. Confirm prices first!', slug: 'gwangjang-yukhoe', swatch: ['#7a4a2a', '#e0a05a'] },
        { time: '20:00', part: 'Evening', name: 'Siloam Fire Pot Sauna', note: 'Wind down at a 24h jjimjilbang. Get the sikhye.', slug: 'siloam-sauna', swatch: ['#3f4a52', '#8fb0c0'] },
      ],
    },
    {
      label: 'Day 3', date: 'Sun, Mar 16', theme: 'Open — needs ideas 🤔',
      stops: [
        { time: '11:00', part: 'Brunch', name: 'GS25 Euljiro — combo stop', note: 'Idol convenience-store combo before checkout.', slug: 'gs25-euljiro-combo', swatch: ['#8a6a1f', '#e3c25f'] },
      ],
    },
  ],
};

export const USER = {
  name: 'You', handle: 'newtraveler', points: 340, helpfulVotes: 128, contributions: 6, followers: 47,
  myPosts: [
    { type: 'tip' as const, slug: 'order-budae-jjigae-solo', title: 'How to actually eat budae-jjigae as a solo traveler', neighborhood: 'Euljiro', votes: 42, comments: 1, when: '3h ago' },
    { type: 'review' as const, slug: 'best-solo-naengmyeon', title: 'Eulji Myeonok is the best solo lunch in Seoul', neighborhood: 'Euljiro', votes: 29, comments: 0, when: '4d ago' },
    { type: 'tip' as const, slug: 'cheap-eats-seoul-station', title: 'Cheap eats near Seoul Station that take foreign cards', neighborhood: 'Seoul Station', votes: 18, comments: 3, when: '1w ago' },
  ],
};
