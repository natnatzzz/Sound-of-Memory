const { readFileSync } = require('node:fs');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');
loadEnvConfig(root);

async function main() {
  const value = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!value) throw new Error('Set DATABASE_URL in .env.local first.');
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname.endsWith('.neon.tech')) {
    throw new Error('Expected a Neon PostgreSQL connection string.');
  }
  // Schema changes use the direct endpoint, bypassing transaction pooling.
  url.hostname = url.hostname.replace('-pooler.', '.');
  url.searchParams.set('sslmode', 'verify-full');
  const client = new Client({
    connectionString: url.toString(),
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
  });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query(readFileSync(path.join(root, 'db/migrations/001-initial-schema.sql'), 'utf8'));
    await client.query(readFileSync(path.join(root, 'db/migrations/002-informed-consent.sql'), 'utf8'));
    const { rows } = await client.query(`
      SELECT table_name, count(*)::integer AS columns
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('sessions', 'rounds', 'trials', 'trial_rounds', 'consent_records')
      GROUP BY table_name ORDER BY table_name
    `);
    const expected = { sessions: 10, rounds: 11, trials: 8, trial_rounds: 12, consent_records: 8 };
    if (rows.length !== 5 || rows.some(row => row.columns !== expected[row.table_name])) {
      throw new Error('Existing tables differ from the expected schema; transaction rolled back.');
    }
    await client.query('COMMIT');
    console.log('Neon schema ready:');
    for (const row of rows) console.log(`  ${row.table_name}: ${row.columns} columns`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => {
  // Never print connection strings or credentials in driver errors.
  let message = String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, '[connection redacted]');
  for (const value of [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED]) {
    if (!value) continue;
    message = message.split(value).join('[connection redacted]');
    try {
      const password = new URL(value).password;
      for (const secret of [password, decodeURIComponent(password)]) {
        if (secret) message = message.split(secret).join('[password redacted]');
      }
    } catch {}
  }
  console.error('Neon setup failed:', error.code || '', message);
  process.exitCode = 1;
});
