const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAttachments } = require('../api/_lib/attachments');

const quotePath = require.resolve('../api/quote');
const mail = require('../api/_lib/mail');
const mockableMailMethods = [
  'rateLimitOk',
  'emailCooldownOk',
  'bothSent',
  'emailConfigReady',
  'sendEnquiryPair',
  'markEmailCooldown',
];

async function submitQuote(payload) {
  const originals = Object.fromEntries(mockableMailMethods.map((key) => [key, mail[key]]));
  const sent = [];
  Object.assign(mail, {
    rateLimitOk: () => true,
    emailCooldownOk: () => true,
    bothSent: () => false,
    emailConfigReady: () => true,
    sendEnquiryPair: async (message) => { sent.push(message); },
    markEmailCooldown: () => {},
  });

  delete require.cache[quotePath];
  const handler = require(quotePath);
  const req = { method: 'POST', headers: {}, body: payload };
  const res = {
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; },
    setHeader() {},
  };

  try {
    await handler(req, res);
    return { status: res.code, data: res.data, sent };
  } finally {
    Object.assign(mail, originals);
    delete require.cache[quotePath];
  }
}

function validQuote(overrides = {}) {
  return {
    name: 'QA',
    email: 'qa@example.com',
    destination: 'US',
    quantity: 2,
    brief: 'Test enquiry',
    ...overrides,
  };
}

test('attachment validation accepts supported signatures and rejects disguised or oversized files', () => {
  const pdf = { filename: 'artwork.pdf', content: Buffer.from('%PDF-1.7\nartwork').toString('base64') };
  assert.equal(validateAttachments([pdf])[0].filename, 'artwork.pdf');
  assert.throws(() => validateAttachments([{ ...pdf, filename: 'artwork.png' }]));
  assert.throws(() => validateAttachments([{ filename: 'large.pdf', content: Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(2 * 1024 * 1024)]).toString('base64') }]));
  assert.throws(() => validateAttachments(Array(4).fill(pdf)));
  assert.deepEqual(validateAttachments(undefined), []);
});

test('legacy shortlist items without intent are treated as ready stock', async () => {
  const pdf = { filename: 'art.pdf', content: Buffer.from('%PDF-1.7').toString('base64') };
  const result = await submitQuote(validQuote({
    attachments: [pdf],
    items: [{ name: 'Classic Tee', sku: 'TEE-01', color: 'White', size: 'M', quantity: 4 }],
  }));

  assert.equal(result.status, 200);
  assert.equal(result.sent.length, 1);
  assert.equal(result.sent[0].internal.attachments[0].filename, 'art.pdf');
  const shortlist = result.sent[0].internal.text;
  assert.match(shortlist, /Ready stock \| Classic Tee \| TEE-01 \| White \| M \| 4 units/);
  assert.doesNotMatch(shortlist, /Product shortlist: Ready stock[^\n]*(?:Customization:|Notes:)/);
});

test('mixed stock and custom items retain custom details in both emails and escape HTML', async () => {
  const result = await submitQuote(validQuote({
    brief: '',
    items: [
      {
        name: 'Basic Hoodie', sku: 'HD-01', color: 'Navy', size: 'L', quantity: 2,
        intent: 'stock', customization: ['logo'], notes: 'discard stock-only notes',
      },
      {
        name: 'Custom Tote', sku: 'BAG-02', color: 'Natural', size: 'To be confirmed', quantity: 30,
        intent: 'custom', customization: ['style', 'material', 'logo', 'style'],
        notes: '<script>alert("x")</script>',
      },
    ],
  }));

  assert.equal(result.status, 200);
  assert.equal(result.sent.length, 1);
  const { internal, customer } = result.sent[0];
  const expectedStock = 'Ready stock | Basic Hoodie | HD-01 | Navy | L | 2 units';
  const expectedCustom = 'Custom request | Custom Tote | BAG-02 | Natural | To be confirmed | 30 units | Customization: Add a logo, Change color or material, Develop a style | Notes: <script>alert("x")</script>';

  for (const message of [internal, customer]) {
    assert.ok(message.text.includes(expectedStock));
    assert.ok(message.text.includes(expectedCustom));
    assert.match(message.html, /Ready stock/);
    assert.match(message.html, /Custom request/);
    assert.match(message.html, /Customization: Add a logo, Change color or material, Develop a style/);
    assert.match(message.html, /Notes: &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
    assert.doesNotMatch(message.html, /<script>alert/);
  }
  assert.match(internal.text, /Please review the selected products below\./);
  assert.match(customer.text, /Please review the selected products below\./);
  assert.doesNotMatch(internal.text, /discard stock-only notes/);
});

test('invalid explicit intent and customization values are rejected without sending', async () => {
  const invalidItems = [
    { name: 'Custom Tee', intent: 'unexpected' },
    { name: 'Custom Tee', intent: 7 },
    { name: 'Custom Tee', intent: 'custom', customization: 'logo' },
    { name: 'Custom Tee', intent: 'custom', customization: ['logo', 'monogram'] },
    { name: 'Custom Tee', intent: 'custom', notes: 7 },
    // Legacy defaults to stock only when no custom details are supplied.
    { name: 'Custom Tee', customization: ['logo'] },
  ];

  for (const item of invalidItems) {
    const result = await submitQuote(validQuote({ items: [item], brief: '' }));
    assert.equal(result.status, 400);
    assert.equal(result.sent.length, 0);
  }
});

test('more than 50 shortlist rows are rejected instead of truncated', async () => {
  const result = await submitQuote(validQuote({
    items: Array.from({ length: 51 }, (_, index) => ({ name: `Item ${index + 1}`, intent: 'stock' })),
  }));

  assert.equal(result.status, 400);
  assert.equal(result.sent.length, 0);
});

test('custom notes are normalized to the 500-character limit', async () => {
  const notes = 'a'.repeat(520);
  const result = await submitQuote(validQuote({
    items: [{ name: 'Custom Cap', intent: 'custom', notes }],
  }));

  assert.equal(result.status, 200);
  assert.ok(result.sent[0].internal.text.includes(`Notes: ${notes.slice(0, 500)}`));
  assert.ok(!result.sent[0].internal.text.includes(`Notes: ${notes.slice(0, 501)}`));
});

test('empty brief is allowed with a shortlist and remains required without one', async () => {
  const withItems = await submitQuote(validQuote({
    brief: '',
    items: [{ name: 'Ready Tee', intent: 'stock' }],
  }));
  assert.equal(withItems.status, 200);
  assert.match(withItems.sent[0].internal.text, /Project brief: Please review the selected products below\./);

  const withoutItems = await submitQuote(validQuote({ brief: '', items: [] }));
  assert.equal(withoutItems.status, 400);
  assert.equal(withoutItems.sent.length, 0);
});

test('normalized option order is stable while requirement changes produce a new submission id', async () => {
  const base = {
    name: 'Custom Tee', sku: 'TEE-C', size: 'To be confirmed', quantity: 12,
    intent: 'custom', customization: ['style', 'logo'], notes: 'Use the supplied artwork.',
  };
  const first = await submitQuote(validQuote({ items: [base] }));
  const reordered = await submitQuote(validQuote({
    items: [{ ...base, customization: ['logo', 'style', 'logo'] }],
  }));
  const changedNotes = await submitQuote(validQuote({
    items: [{ ...base, notes: 'Use a revised artwork.' }],
  }));
  const changedOptions = await submitQuote(validQuote({
    items: [{ ...base, customization: ['style', 'logo', 'material'] }],
  }));
  const sameProductAsStock = await submitQuote(validQuote({
    items: [{
      name: base.name, sku: base.sku, size: base.size, quantity: base.quantity,
      intent: 'stock',
    }],
  }));

  assert.equal(first.status, 200);
  assert.equal(first.sent[0].submissionId, reordered.sent[0].submissionId);
  assert.notEqual(first.sent[0].submissionId, changedNotes.sent[0].submissionId);
  assert.notEqual(first.sent[0].submissionId, changedOptions.sent[0].submissionId);
  assert.notEqual(first.sent[0].submissionId, sameProductAsStock.sent[0].submissionId);
});
