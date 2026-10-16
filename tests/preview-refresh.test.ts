import assert from 'node:assert/strict';
import test from 'node:test';
import { pollPreviewRevision } from '../src/components/PreviewRefresh';

function createCallbacks() {
  const statuses: string[] = [];
  const revisions: string[] = [];
  let reloadCount = 0;

  return {
    statuses,
    revisions,
    get reloadCount() {
      return reloadCount;
    },
    callbacks: {
      onStatus: (status: string) => statuses.push(status),
      onRevision: (revision: string) => revisions.push(revision),
      onRefresh: () => { reloadCount += 1; },
    },
  };
}

test('draft preview reports guarded HTTP errors without reloading', async () => {
  for (const status of [401, 403, 503]) {
    const result = createCallbacks();
    const requestOptions: RequestInit[] = [];

    await pollPreviewRevision(
      'rev-current',
      async (_input, init) => {
        requestOptions.push(init ?? {});
        return new Response(null, { status });
      },
      result.callbacks,
    );

    assert.deepEqual(result.statuses, [`http-${status}`]);
    assert.deepEqual(result.revisions, []);
    assert.equal(result.reloadCount, 0);
    assert.equal(requestOptions[0]?.credentials, 'same-origin');
    assert.equal(requestOptions[0]?.cache, 'no-store');
  }
});

test('draft preview reloads when the endpoint returns a newer revision', async () => {
  const result = createCallbacks();

  await pollPreviewRevision(
    'rev-current',
    async () => new Response(JSON.stringify({ rev: 'rev-new' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
    result.callbacks,
  );

  assert.deepEqual(result.statuses, ['refreshing']);
  assert.deepEqual(result.revisions, ['rev-new']);
  assert.equal(result.reloadCount, 1);
});
