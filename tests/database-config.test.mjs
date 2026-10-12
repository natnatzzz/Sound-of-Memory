import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseConfig, DATABASE_HOSTS } from '../lib/database-config.mjs';

const url = environment => `postgresql://test:example@${DATABASE_HOSTS[environment].replace('.c-7.', '-pooler.c-7.')}/memory-db?sslmode=require`;
test('local development and local production builds both require DEV', () => {
 for (const NODE_ENV of ['development', 'production']) {
  const config = databaseConfig({ NODE_ENV, DATABASE_URL: url('development') });
  assert.equal(new URL(config.connectionString).searchParams.get('sslmode'), 'verify-full');
  assert.throws(() => databaseConfig({ NODE_ENV, DATABASE_URL: url('production') }), /development/);
 }
});
test('Cloud Run requires PROD and rejects a DEV connection', () => {
 assert.ok(databaseConfig({ K_SERVICE: 'memory-app', DATABASE_URL: url('production') }));
 assert.throws(() => databaseConfig({ K_SERVICE: 'memory-app', DATABASE_URL: url('development') }), /production/);
});
test('missing URL and a different database fail before connecting', () => {
 assert.throws(() => databaseConfig({}), /DATABASE_URL/);
 assert.throws(() => databaseConfig({ DATABASE_URL: url('development').replace('/memory-db', '/other') }), /development/);
});
