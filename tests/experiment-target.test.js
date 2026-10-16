const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const test = require('node:test');

const projectRoot = resolve(__dirname, '..');
const guardPath = resolve(projectRoot, 'scripts', 'assert-experiment-target.mjs');

function runGuard(overrides = {}) {
  const env = { ...process.env };
  delete env.VERCEL;
  delete env.VERCEL_ENV;
  delete env.VERCEL_TARGET_ENV;
  Object.assign(env, overrides);

  return spawnSync(process.execPath, [guardPath], { encoding: 'utf8', env });
}

test('rejects Vercel production and explicit production targets', () => {
  for (const environment of [
    { VERCEL: '1', VERCEL_ENV: 'production' },
    { VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'production' },
  ]) {
    const result = runGuard(environment);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Refusing to build .* outside Preview/);
  }
});

test('allows a Vercel Preview build', () => {
  const result = runGuard({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview' });
  assert.equal(result.status, 0, result.stderr);
});

test('allows local and non-Vercel CI builds', () => {
  const result = runGuard({ VERCEL: '0', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'production' });
  assert.equal(result.status, 0, result.stderr);
});
