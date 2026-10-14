import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL in memory. This runner never reads .env or connects to Supabase.
const readSql = relativePath => readFile(new URL(relativePath, import.meta.url), 'utf8');
const db = await PGlite.create({ dataDir: 'memory://' });

try {
  const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);
  const migrationFiles = (await readdir(migrationDirectory)).filter(name => /^\d+.*\.sql$/.test(name)).sort();
  const [auth, originalSchema, scenarios, migrations] = await Promise.all([
    readSql('./fixtures/supabase-auth.sql'),
    readSql('./fixtures/member-schema-before-admin.sql'),
    readSql('./test-admin-workspace.sql'),
    Promise.all(migrationFiles.map(name => readFile(new URL(name, migrationDirectory), 'utf8'))),
  ]);
  await db.exec(auth);
  await db.exec(originalSchema);
  console.log('PASS: original schema, constraints, Auth claims and database roles loaded');

  for (const migration of migrations) await db.exec(migration);
  console.log(`PASS: ${migrations.length} admin migrations applied to PostgreSQL`);

  await db.exec(scenarios);
  console.log('PASS: member lifecycle, atomic guardian edits, analytics and role boundaries');

  const { rows } = await db.query(`select
    (select count(*)::int from auth.users) as users,
    (select count(*)::int from auth.sessions) as sessions,
    (select count(*)::int from public.member) as members,
    (select count(*)::int from public.guardian) as guardians,
    (select count(*)::int from public.member_team_assignment) as assignments,
    (select count(*)::int from public.batch_counts) as counters,
    (select count(*)::int from public.production_team) as teams,
    (select count(*)::int from public.skill) as skills,
    (select count(*)::int from private.admin_bridge_identities) as bridge_identities,
    (select count(*)::int from private.admin_bridge_sessions) as bridge_sessions`);
  for (const [table, count] of Object.entries(rows[0])) assert.equal(count, 0, `${table}: test data was not rolled back`);
  console.log('PASS: all synthetic fixtures and counters rolled back');
} catch (error) {
  console.error('FAIL: local admin database integration');
  console.error(error.message);
  if (error.where) console.error(error.where);
  if (error.detail) console.error(error.detail);
  console.error(`Runner: ${fileURLToPath(import.meta.url)}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
