// Emits the legal documents as standalone web pages.
//
// Apple requires a Privacy Policy URL and a Support URL reachable on the open
// web — having the text inside the app is not enough. These pages come from
// `legalDocHtml()`, the exact function the in-app WebView renders, so the
// hosted copy cannot drift from what users see in the app. Nothing about the
// markup or stylesheet is duplicated here; this only adds the things a web page
// needs and an app WebView doesn't (title, meta, favicon, cross-links).
//
//   npx tsx scripts/build-legal-site.ts
//
// Then publish `site/`. Quickest route is GitHub Pages: push it, enable Pages,
// and paste the resulting URLs into App Store Connect.
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { legalDocHtml, LEGAL_TITLES, LegalDocKey } from '../data/legalDocs';

const OUT = join(process.cwd(), 'site');
const CONTACT_EMAIL = 'dongj1210@gmail.com';
const OWNER = 'Dongjin Lee';

const FILES: Record<LegalDocKey, string> = {
  privacy: 'privacy.html',
  terms: 'terms.html',
  guidelines: 'guidelines.html',
};
const DESCRIPTIONS: Record<LegalDocKey, string> = {
  privacy: 'How BADA collects, uses and protects your data, and how to delete your account.',
  terms: 'The terms you agree to when using BADA, the Korea travel app.',
  guidelines: 'What is and is not allowed in the BADA community.',
};

const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛵</text></svg>";

/** Adds what a web page needs on top of the app's own document markup. */
function forWeb(html: string, title: string, description: string, backLink: boolean) {
  let out = html.replace(
    '</head>',
    `<title>${title} · BADA</title>` +
      `<meta name="description" content="${description}">` +
      `<meta name="robots" content="index,follow">` +
      `<link rel="icon" href="${FAVICON}">` +
      `</head>`,
  );
  // The app's html tag carries no lang; search engines and screen readers want one.
  out = out.replace('<html>', '<html lang="en">');
  if (backLink) {
    out = out.replace(
      '</div></body>',
      '<p style="margin-top:34px"><a href="./">← All BADA documents</a></p></div></body>',
    );
  }
  return out;
}

mkdirSync(OUT, { recursive: true });

for (const key of Object.keys(FILES) as LegalDocKey[]) {
  writeFileSync(
    join(OUT, FILES[key]),
    forWeb(legalDocHtml(key), LEGAL_TITLES[key], DESCRIPTIONS[key], true),
  );
  console.log(`  site/${FILES[key]}`);
}

// Landing page — this is the Support URL App Store Connect asks for. Built by
// reusing the privacy document's shell so it inherits the same stylesheet.
const SUPPORT_BODY = `<div class="brand"><span class="mark">⛵</span><span class="name">BADA</span><span class="doc-kind">Support</span></div>
  <h1>BADA</h1>
  <p class="lede">Korea travel, planned around what you actually like. If something is broken,
  confusing, or missing, email us — a real person reads it.</p>
  <section><h2>Get in touch</h2>
    <p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. If you're reporting a bug,
    including your device model and iOS version usually saves a round trip.</p></section>
  <section><h2>Common questions</h2>
    <p><strong>Do I need an account?</strong> No. Browsing places, reading the guides and planning
    a trip all work without one. An account is only needed to post or comment.</p>
    <p><strong>How do I delete my account and data?</strong> In the app: Settings → Delete account.
    It removes your profile, saved places, itinerary, posts and comments.</p>
    <p><strong>Does it work without mobile data?</strong> Partly. BADA bundles a set of places so it
    still opens and still plans offline, then refreshes once you're back online.</p></section>
  <section><h2>Documents</h2>
    <ul>
      <li><a href="./privacy.html">Privacy Policy</a></li>
      <li><a href="./terms.html">Terms of Service</a></li>
      <li><a href="./guidelines.html">Community Guidelines</a></li>
    </ul></section>
  <footer>© 2026 ${OWNER} · Seoul, South Korea</footer>`;

const shell = legalDocHtml('privacy');
const body = shell.slice(shell.indexOf('<div class="page">') + '<div class="page">'.length, shell.indexOf('</div></body>'));
writeFileSync(
  join(OUT, 'index.html'),
  forWeb(shell.replace(body, SUPPORT_BODY), 'Support', 'Support and legal documents for BADA, the Korea travel app.', false),
);
console.log('  site/index.html');

console.log('\nPublish site/, then use:');
console.log('  Privacy Policy URL : <base>/privacy.html');
console.log('  Support URL        : <base>/');
