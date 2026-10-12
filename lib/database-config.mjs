// Endpoint names are public identifiers; passwords stay in environment variables.
export const DATABASE_HOSTS = {
 development: 'ep-bitter-haze-b58ygahp.c-7.us-east-2.aws.neon.tech',
 production: 'ep-fragrant-sky-b5ofrk6y.c-7.us-east-2.aws.neon.tech',
};

export function databaseConfig(env = process.env) {
 if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
 const url = new URL(env.DATABASE_URL);
 // A local production build still uses DEV. Cloud Run sets K_SERVICE.
 const environment = env.K_SERVICE ? 'production' : 'development';
 if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
     url.hostname.replace('-pooler.', '.') !== DATABASE_HOSTS[environment] ||
     url.pathname !== '/memory-db') {
  throw new Error(`Database connection must target the ${environment} memory-db endpoint.`);
 }
 url.searchParams.set('sslmode', 'verify-full');
 return {
  connectionString: url.toString(), max: 5,
  connectionTimeoutMillis: 15000, idleTimeoutMillis: 30000,
  statement_timeout: 30000,
 };
}
