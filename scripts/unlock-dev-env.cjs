const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const localBinary = path.join(os.homedir(), '.local', 'bin', 'git-crypt');
const gitCrypt = fs.existsSync(localBinary) ? localBinary : 'git-crypt';
let temporaryDirectory;

function cleanup() {
 if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
for (const signal of ['SIGINT', 'SIGTERM']) {
 process.on(signal, () => { cleanup(); process.exit(1); });
}
process.on('exit', cleanup);

function run(command, args) {
 const result = spawnSync(command, args, { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
 if (result.error?.code === 'ENOENT') throw new Error(`Install ${command === gitCrypt ? 'git-crypt' : command} first.`);
 if (result.error || result.status !== 0) throw new Error(`${command === gitCrypt ? 'git-crypt' : command} failed.`);
}

try {
 const envFile = path.join(root, '.env.local');
 if (!fs.existsSync(envFile)) {
  if (process.argv.includes('--if-encrypted')) process.exit(0);
  throw new Error('.env.local is missing. Pull the encrypted file first.');
 }
 // git-crypt ciphertext starts with this binary marker. An unlocked checkout
 // keeps decrypting future Git changes locally without fetching the key again.
 const marker = Buffer.from('\0GITCRYPT\0');
 if (!fs.readFileSync(envFile).subarray(0, marker.length).equals(marker)) {
  if (!process.argv.includes('--if-encrypted')) console.log('Development settings are already decrypted.');
  process.exit(0);
 }
 run(gitCrypt, ['--version']);
 run('gcloud', ['--version']);
 temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-git-crypt-'));
 fs.chmodSync(temporaryDirectory, 0o700);
 const keyFile = path.join(temporaryDirectory, 'key');
 fs.writeFileSync(keyFile, '', { mode: 0o600 });
 run('gcloud', [
  'secrets', 'versions', 'access', '1',
  '--secret=sound-of-memory-git-crypt-key',
  '--project=sound-of-memory-511302',
  `--out-file=${keyFile}`, '--quiet',
 ]);
 fs.chmodSync(keyFile, 0o600);
 run(gitCrypt, ['unlock', keyFile]);
 console.log('Development settings unlocked. Temporary key file removed.');
} catch (error) {
 console.error(error.message);
 console.error('Sign in with gcloud auth login; your account needs access to the git-crypt key secret.');
 process.exitCode = 1;
} finally {
 cleanup();
}
