// Prints the complete DB setup (base schema + every migration, in order) as
// one SQL script — paste it into a fresh Supabase project's SQL editor to
// provision a new environment (e.g. a dev project) in one run. All statements
// are already idempotent (create ... if not exists / drop ... if exists).
//
//   npm run db:setup-sql            # to stdout
//   npm run db:setup-sql > setup.sql
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase');
const migrations = readdirSync(dir)
  .filter((f) => /^migration-\d+.*\.sql$/.test(f))
  .sort(); // zero-padded numbers sort correctly as strings

const parts = ['schema.sql', ...migrations];
for (const f of parts) {
  process.stdout.write(`\n-- ═══ ${f} ═══\n\n`);
  process.stdout.write(readFileSync(join(dir, f), 'utf8'));
}
process.stderr.write(`Combined ${parts.length} files (schema + ${migrations.length} migrations).\n`);
