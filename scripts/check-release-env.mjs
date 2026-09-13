// Guard against shipping a build that can't reach the backend.
//
// This exists because it already nearly happened: .env / .env.production are
// gitignored, EAS Build archives from git, and eas.json's production `env` was
// empty — so the binary would have had no EXPO_PUBLIC_SUPABASE_URL at all.
// lib/supabase.ts falls back to a placeholder host, so the app doesn't crash;
// it just comes up with zero places and failing sign-in. Silent, and it looks
// like a backend outage rather than a config mistake.
//
// Run before any release build:  npm run check:release-env
//
// Also wired to the `eas-build-pre-install` npm hook so it shows up in EAS
// build logs. Note: EAS does not document whether a non-zero exit from that
// hook fails the build, so treat the local run as the real gate.
import fs from 'node:fs';

const REQUIRED = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_NAVER_MAP_CLIENT_ID',
];

// On EAS the values arrive as real env vars; locally we check what eas.json
// would inject, since that is what actually ends up in the binary.
function fromEasJson(profile) {
  try {
    const cfg = JSON.parse(fs.readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
    return cfg.build?.[profile]?.env ?? {};
  } catch {
    return {};
  }
}

const profile = process.env.EAS_BUILD_PROFILE || process.argv[2] || 'production';
const injected = fromEasJson(profile);
const resolve = (k) => process.env[k] || injected[k] || '';

const missing = REQUIRED.filter((k) => !resolve(k));
const url = resolve('EXPO_PUBLIC_SUPABASE_URL');

if (missing.length) {
  console.error(`\n✗ Release env check failed for profile "${profile}".`);
  console.error(`  Missing: ${missing.join(', ')}`);
  console.error('  Set them in eas.json → build.' + profile + '.env, or via `eas env:create`.');
  console.error('  Without them the app builds fine and comes up completely empty.\n');
  process.exit(1);
}

// A release build pointed at the dev project is the other half of this bug:
// it would look perfectly healthy while writing real users' data into dev.
if (profile === 'production' && !url.includes('dwajyyyimwpspdvxeflp')) {
  console.error(`\n✗ Production profile is not pointed at the prod Supabase project.`);
  console.error(`  Got: ${url}\n`);
  process.exit(1);
}

console.log(`✓ Release env OK for "${profile}" (${new URL(url).host})`);
