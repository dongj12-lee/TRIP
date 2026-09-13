// Generates original one-sheet-style "poster" cards for the filming-locations
// theme, one PNG per production, into assets/titlecards/.
//
//   node scripts/make-title-cards.mjs
//
// WHY THESE AND NOT REAL POSTERS
// Real posters — and redrawn/"illustrated" versions of them — are copyrighted,
// and the actors carry a separate likeness right (초상권) in Korea. TMDB's
// artwork is licensed for non-commercial use only, which an App Store release
// is not. These cards contain no copyrighted element: a title, a studio line,
// an original one-line tagline (written here, NOT lifted from marketing), a
// year, and a colour. They follow the *grammar* of a film one-sheet — top
// credit block, cinematic vignette, oversized serif title, billing-block
// footer — which is not itself protectable. Safe to ship in a commercial
// build. Pre-rendered to PNG and bundled, so they always load, offline too.
//
// Palettes evoke each show's tone (Squid Game's teal & magenta, Goblin's dusk
// blue, Parasite's storm grey); they are not sampled from any artwork.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const W = 600;
const H = 900;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/**
 * @typedef {{ slug: string, title: string, studio: string, tagline: string,
 *   meta: string, rating: string, bg: [string, string], ink: string,
 *   accent: string }} Card
 */

/** @type {Card[]} */
const CARDS = [
  { slug: 'kpop-demon-hunters', title: 'KPop Demon\nHunters', studio: 'NETFLIX ANIMATION', tagline: 'The concert is a battlefield.', meta: 'FILM · 2025', rating: 'ANIMATION', bg: ['#3a1a5e', '#7b2ff7'], ink: '#ffffff', accent: '#ff4da6' },
  { slug: 'parasite', title: 'Parasite', studio: 'BONG JOON-HO', tagline: 'Act like you own the place.', meta: 'FILM · 2019', rating: 'DRAMA', bg: ['#4a4d52', '#0c0d10'], ink: '#f2f2f0', accent: '#c9a24a' },
  { slug: 'squid-game', title: 'Squid\nGame', studio: 'NETFLIX ORIGINAL', tagline: '456 players. One winner.', meta: 'SERIES · 2021', rating: 'S1–3', bg: ['#0f6b5c', '#07211d'], ink: '#f6f2ea', accent: '#ff2e74' },
  { slug: 'reply-1988', title: 'Reply\n1988', studio: 'tvN', tagline: 'Five families, one alley.', meta: 'SERIES · 2015', rating: 'DRAMA', bg: ['#a6642e', '#4c2a12'], ink: '#fdf3e3', accent: '#f2c063' },
  { slug: 'itaewon-class', title: 'Itaewon\nClass', studio: 'JTBC', tagline: 'One bar against an empire.', meta: 'SERIES · 2020', rating: 'DRAMA', bg: ['#241a16', '#3a1c12'], ink: '#f4f1ec', accent: '#e8542f' },
  { slug: 'vincenzo', title: 'Vincenzo', studio: 'tvN', tagline: 'Fight fire with a lawyer.', meta: 'SERIES · 2021', rating: 'CRIME', bg: ['#26262b', '#0d0c10'], ink: '#f0ede6', accent: '#b3122b' },
  { slug: 'our-beloved-summer', title: 'Our Beloved\nSummer', studio: 'SBS', tagline: 'They swore never again.', meta: 'SERIES · 2021', rating: 'ROMANCE', bg: ['#e3a05a', '#a8542a'], ink: '#2a1a10', accent: '#ffffff' },
  { slug: 'lovely-runner', title: 'Lovely\nRunner', studio: 'tvN', tagline: 'Rewind to save him.', meta: 'SERIES · 2024', rating: 'ROMANCE', bg: ['#5a6cc4', '#2f2f6e'], ink: '#ffffff', accent: '#ffd166' },
  { slug: 'queen-of-tears', title: 'Queen of\nTears', studio: 'tvN', tagline: 'Marriage is the hard part.', meta: 'SERIES · 2024', rating: 'ROMANCE', bg: ['#2c3f56', '#111a26'], ink: '#eef2f6', accent: '#7fa8c9' },
  { slug: 'goblin', title: 'Goblin', studio: 'tvN', tagline: 'A thousand-year wait.', meta: 'SERIES · 2016', rating: 'ROMANCE', bg: ['#2c4a6e', '#0d1826'], ink: '#eef2f7', accent: '#d98a5a' },
  { slug: 'my-love-from-the-star', title: 'My Love\nfrom the Star', studio: 'SBS', tagline: '400 years, one last month.', meta: 'SERIES · 2013', rating: 'ROMANCE', bg: ['#3b2f6e', '#181233'], ink: '#f2efff', accent: '#c0a7ff' },
  { slug: 'all-of-us-are-dead', title: 'All of Us\nAre Dead', studio: 'NETFLIX ORIGINAL', tagline: 'Class is not dismissed.', meta: 'SERIES · 2022', rating: 'HORROR', bg: ['#6e2c2c', '#241010'], ink: '#f4eaea', accent: '#c98080' },
  { slug: 'mr-sunshine', title: 'Mr.\nSunshine', studio: 'tvN', tagline: 'A soldier between two nations.', meta: 'SERIES · 2018', rating: 'PERIOD', bg: ['#4a3b2a', '#1e1710'], ink: '#f3ece0', accent: '#c9a878' },
  { slug: 'the-glory', title: 'The\nGlory', studio: 'NETFLIX ORIGINAL', tagline: 'Revenge, served slowly.', meta: 'SERIES · 2022', rating: 'THRILLER', bg: ['#2c3f56', '#0b1119'], ink: '#eef2f6', accent: '#d34b4b' },
  { slug: 'descendants-of-the-sun', title: 'Descendants\nof the Sun', studio: 'KBS', tagline: 'Love in a war zone.', meta: 'SERIES · 2016', rating: 'ROMANCE', bg: ['#3b5540', '#1a251d'], ink: '#eef4ea', accent: '#e0c060' },
  { slug: 'crash-landing-on-you', title: 'Crash Landing\non You', studio: 'tvN', tagline: 'She fell for the wrong side.', meta: 'SERIES · 2019', rating: 'ROMANCE', bg: ['#2f4858', '#111c24'], ink: '#eef4f8', accent: '#88bd9a' },
  { slug: 'twenty-five-twenty-one', title: 'Twenty-Five\nTwenty-One', studio: 'tvN', tagline: 'Their timing was everything.', meta: 'SERIES · 2022', rating: 'ROMANCE', bg: ['#7a4a5a', '#361f28'], ink: '#fbeef3', accent: '#e0a0b0' },
  { slug: 'extraordinary-attorney-woo', title: 'Extraordinary\nAttorney Woo', studio: 'ENA', tagline: 'A brilliant mind, her own way.', meta: 'SERIES · 2022', rating: 'DRAMA', bg: ['#3f6b3f', '#1c331c'], ink: '#eef7ea', accent: '#a8cf9a' },
];

/** @param {Card} c */
function svg(c) {
  const lines = c.title.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  // Shrink the type when a title runs long so nothing clips the 600px width.
  const size = longest <= 8 ? 100 : longest <= 12 ? 80 : 64;
  const lh = size * 1.0;
  const baseY = H - 132;
  const startY = baseY - (lines.length - 1) * lh;
  const spans = lines.map((l, i) => `<tspan x="48" y="${startY + i * lh}">${esc(l)}</tspan>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/>
    </linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.36" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.72"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#v)"/>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <text x="48" y="70" font-family="-apple-system,Helvetica,Arial,sans-serif" font-weight="700" font-size="19" fill="${c.ink}" opacity="0.62" letter-spacing="5">${esc(c.studio)}</text>
  <line x1="48" y1="90" x2="${W - 48}" y2="90" stroke="${c.ink}" stroke-opacity="0.22" stroke-width="2"/>
  <text x="48" y="126" font-family="Georgia,serif" font-style="italic" font-size="24" fill="${c.ink}" opacity="0.7">${esc(c.tagline)}</text>
  <text font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="${size}" fill="${c.ink}" letter-spacing="-2">${spans}</text>
  <line x1="48" y1="${H - 96}" x2="${W - 48}" y2="${H - 96}" stroke="${c.accent}" stroke-width="3"/>
  <text x="48" y="${H - 60}" font-family="-apple-system,Helvetica,Arial,sans-serif" font-weight="800" font-size="21" fill="${c.accent}" letter-spacing="3">${esc(c.meta)}</text>
  <text x="${W - 48}" y="${H - 60}" text-anchor="end" font-family="-apple-system,Helvetica,Arial,sans-serif" font-weight="600" font-size="19" fill="${c.ink}" opacity="0.6" letter-spacing="1">${esc(c.rating)}</text>
</svg>`;
}

mkdirSync('assets/titlecards', { recursive: true });
console.log(`Rendering ${CARDS.length} poster cards:`);
await Promise.all(
  CARDS.map((c) =>
    sharp(Buffer.from(svg(c)))
      .png()
      .toFile(`assets/titlecards/${c.slug}.png`)
      .then(() => console.log(`  ${c.slug}.png`)),
  ),
);
