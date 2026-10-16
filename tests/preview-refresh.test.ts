import assert from 'node:assert/strict';
import test from 'node:test';
import { pollPreviewRevision } from '../src/components/PreviewRefresh';
import { buildPreviewNavigationUrl } from '../src/components/previewNavigation';

function createCallbacks() {
  const statuses: string[] = [];
  const revisions: string[] = [];
  const refreshedRevisions: string[] = [];

  return {
    statuses,
    revisions,
    refreshedRevisions,
    callbacks: {
      onStatus: (status: string) => statuses.push(status),
      onRevision: (revision: string) => revisions.push(revision),
      onRefresh: (revision: string) => refreshedRevisions.push(revision),
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
    assert.deepEqual(result.refreshedRevisions, []);
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
  assert.deepEqual(result.refreshedRevisions, ['rev-new']);
});

test('preview navigation adds a revision while preserving the current URL', () => {
  assert.equal(
    buildPreviewNavigationUrl(
      'https://preview.example.test/products?drafts=1&lang=zh#hero',
      'https://preview.example.test',
      'rev-new',
    ),
    'https://preview.example.test/products?drafts=1&lang=zh&previewRevision=rev-new#hero',
  );
});

test('preview navigation refuses to send a cross-origin URL', () => {
  assert.equal(
    buildPreviewNavigationUrl(
      'https://attacker.example.test/products?drafts=1#hero',
      'https://preview.example.test',
      'rev-new',
    ),
    null,
  );
});
