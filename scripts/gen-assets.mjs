// One-off generator for app icon / splash / adaptive-icon PNGs.
// Renders the same "pin in a rounded square" mark used on the onboarding
// hero (see app/onboarding.tsx Welcome()) so app icon and in-app branding match.
// Run with: node scripts/gen-assets.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets');
mkdirSync(OUT, { recursive: true });

const TERRA = '#c26b4a';
const PAPER = '#fbf6ee';

// The pin glyph path, from components/Icon.tsx `pin` (24x24 viewBox), scaled up.
const PIN_PATH = 'M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z';
const PIN_HOLE = { cx: 12, cy: 10, r: 2.4 };

function pinSvg({ size, fg, bg, bgShape }) {
  const scale = size / 24;
  const stroke = 1.6 * scale;
  const bgEl =
    bgShape === 'square'
      ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>`
      : bgShape === 'circle'
        ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${bg}"/>`
        : '';
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${bgEl}
    <g transform="scale(${scale})" fill="${fg}" stroke="${fg}" stroke-width="${1.6}">
      <path d="${PIN_PATH}" />
      <circle cx="${PIN_HOLE.cx}" cy="${PIN_HOLE.cy}" r="${PIN_HOLE.r}" fill="${bg || '#0000'}" stroke="none" />
    </g>
  </svg>`;
}

// A pin glyph sized/positioned for Android's adaptive-icon safe zone (~66% of canvas).
function pinForegroundSvg({ size, fg }) {
  const glyph = size * 0.5;
  const offset = (size - glyph) / 2;
  const scale = glyph / 24;
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(${offset} ${offset}) scale(${scale})" fill="${fg}">
      <path d="${PIN_PATH}" />
      <circle cx="${PIN_HOLE.cx}" cy="${PIN_HOLE.cy}" r="${PIN_HOLE.r}" fill="${TERRA}" />
    </g>
  </svg>`;
}

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log('✓', path.relative(process.cwd(), outPath));
}

async function main() {
  // Main app icon (1024x1024, full-bleed — iOS applies its own corner mask).
  await render(
    `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="${TERRA}"/>
      <g transform="translate(232 232) scale(${560 / 24})" fill="${PAPER}">
        <path d="${PIN_PATH}" />
        <circle cx="${PIN_HOLE.cx}" cy="${PIN_HOLE.cy}" r="${PIN_HOLE.r}" fill="${TERRA}" />
      </g>
    </svg>`,
    1024,
    path.join(OUT, 'icon.png'),
  );

  // Splash mark (rounded square, matches onboarding hero icon exactly).
  await render(pinSvg({ size: 600, fg: '#fffdfa', bg: TERRA, bgShape: 'square' }), 600, path.join(OUT, 'splash-icon.png'));

  // Android adaptive icon layers.
  await render(pinForegroundSvg({ size: 1024, fg: PAPER }), 1024, path.join(OUT, 'android-icon-foreground.png'));
  await render(`<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="${TERRA}"/></svg>`, 1024, path.join(OUT, 'android-icon-background.png'));
  await render(pinForegroundSvg({ size: 1024, fg: '#ffffff' }), 1024, path.join(OUT, 'android-icon-monochrome.png'));

  // Web favicon.
  await render(
    `<svg width="196" height="196" xmlns="http://www.w3.org/2000/svg">
      <rect width="196" height="196" rx="40" fill="${TERRA}"/>
      <g transform="translate(46 46) scale(${104 / 24})" fill="${PAPER}">
        <path d="${PIN_PATH}" />
        <circle cx="${PIN_HOLE.cx}" cy="${PIN_HOLE.cy}" r="${PIN_HOLE.r}" fill="${TERRA}" />
      </g>
    </svg>`,
    196,
    path.join(OUT, 'favicon.png'),
  );

  console.log('\nDone. Re-run `npx expo prebuild --clean` if native projects already exist, so they pick up new icons.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
