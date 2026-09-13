// Generates every app-icon asset from one SVG source.
//
//   node scripts/make-icon.mjs
//
// The original icon was a map pin, which sat on the home screen looking like a
// third copy of Naver Map / Google Maps. BADA means "sea", so the mark is a
// sailboat: a silhouette whose outline is still unmistakable at 44px, which a
// pin (or a wave — tried, it collapses into a white blob) is not.
//
// Colours come from the app's own "Hanok Blue" accent in theme/tokens.ts, not
// a generic ocean blue, so icon, splash, and UI accent agree.
import sharp from 'sharp';

const DEEP = '#232a55';   // deep water — bottom of the gradient
const MID = '#4d5589';    // Hanok Blue — the app's accent
const CREAM = '#faf9f7';  // paper — the app's light background

const gradient = `<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${MID}"/><stop offset="1" stop-color="${DEEP}"/>
  </linearGradient>`;

/**
 * Closed polygon, rounding only the vertices listed in `round`.
 * Each rounded corner trims `r` off both adjoining edges and joins them with a
 * quadratic whose control point is the original corner.
 */
function poly(pts, r = 0, round = []) {
  if (!r) return `M ${pts.map((p) => p.join(' ')).join(' L ')} Z`;
  const n = pts.length;
  const unit = (from, to) => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  };
  let d = '';
  for (let i = 0; i < n; i++) {
    const P = pts[i];
    if (!round.includes(i)) {
      d += (d ? ' L ' : 'M ') + P.join(' ');
      continue;
    }
    const [ax, ay] = unit(P, pts[(i - 1 + n) % n]);
    const [bx, by] = unit(P, pts[(i + 1) % n]);
    d += (d ? ' L ' : 'M ') + `${P[0] + ax * r} ${P[1] + ay * r}`;
    d += ` Q ${P[0]} ${P[1]} ${P[0] + bx * r} ${P[1] + by * r}`;
  }
  return d + ' Z';
}

// The hull is a trapezoid that narrows toward the base: the top edge is the
// full beam, the bottom pulls in 90px each side so it reads as a boat sitting
// in water rather than a floating rectangle. Bottom corners are softened just
// enough to lose the blade-sharp points without going pill-shaped.
const HULL = poly(
  [[205, 652], [828, 652], [738, 800], [295, 800]],
  26,
  [2, 3],
);

// Sails are deliberately unequal — a symmetric pair reads as an abstract
// triangle rather than a boat. The gap at the mast is wide enough to survive
// downscaling to 44px without the two sails merging.
//
// There is deliberately no water line under the hull: at 60px the three
// strokes collapsed into a grey smudge that only added noise, and dropping
// them lets the silhouette carry the icon on its own.
const art = (fill) => `
  <g fill="${fill}">
    <path d="M 545 195 C 665 340, 745 475, 782 605 L 545 605 Z"/>
    <path d="M 480 300 L 480 605 L 268 605 C 348 500, 420 400, 480 300 Z"/>
    <path d="${HULL}"/>
  </g>`;

/**
 * @param {object} o
 * @param {boolean} o.background paint the sea gradient behind the boat
 * @param {number}  o.scale      shrink toward the centre — Android adaptive
 *                               icons crop to a circle, so the foreground
 *                               layer has to stay inside the middle ~66%.
 *                               Note the art already occupies only ~61% of the
 *                               canvas, so this multiplies that: 0.93 lands the
 *                               boat at ~57%, filling ~85% of the safe zone.
 *                               (It was 0.62, which stacked the two insets and
 *                               left the boat at 38% — visibly adrift.)
 * @param {string}  o.fill       boat colour
 */
function svg({ background = true, scale = 1, fill = CREAM }) {
  const offset = (1024 * (1 - scale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${gradient}</defs>
  ${background ? '<rect width="1024" height="1024" fill="url(#sea)"/>' : ''}
  <g transform="translate(${offset} ${offset}) scale(${scale})">${art(fill)}</g>
</svg>`;
}

const seaOnly = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>${gradient}</defs><rect width="1024" height="1024" fill="url(#sea)"/></svg>`;

const jobs = [
  // iOS: full-bleed square; the system applies its own rounded mask.
  ['assets/icon.png', svg({}), 1024],
  // Android adaptive icon: two layers, foreground inset into the safe zone.
  ['assets/android-icon-foreground.png', svg({ background: false, scale: 0.93 }), 1024],
  ['assets/android-icon-background.png', seaOnly, 1024],
  ['assets/android-icon-monochrome.png', svg({ background: false, scale: 0.93, fill: '#ffffff' }), 1024],
  // Splash sits on app.json's own background colour, so no sea square here.
  ['assets/splash-icon.png', svg({ background: false, scale: 0.78, fill: MID }), 600],
  ['assets/favicon.png', svg({}), 196],
];

console.log('Writing icon assets:');
await Promise.all(
  jobs.map(([out, markup, size]) =>
    sharp(Buffer.from(markup)).resize(size, size).png().toFile(out).then(() => console.log(`  ${out}  ${size}×${size}`)),
  ),
);
