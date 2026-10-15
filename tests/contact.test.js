const test = require('node:test');
const assert = require('node:assert/strict');

const contactPath = require.resolve('../api/contact');
const mail = require('../api/_lib/mail');
const mockableMailMethods = [
  'rateLimitOk',
  'emailCooldownOk',
  'bothSent',
  'emailConfigReady',
  'sendEnquiryPair',
  'markEmailCooldown',
];

async function submitContact(payload, { alreadySent = false } = {}) {
  const originals = Object.fromEntries(mockableMailMethods.map((key) => [key, mail[key]]));
  const sent = [];
  let submissionId;
  Object.assign(mail, {
    rateLimitOk: () => true,
    emailCooldownOk: () => true,
    bothSent: (id) => { submissionId = id; return alreadySent; },
    emailConfigReady: () => true,
    sendEnquiryPair: async (message) => { sent.push(message); },
    markEmailCooldown: () => {},
  });

  delete require.cache[contactPath];
  const handler = require(contactPath);
  const req = { method: 'POST', headers: {}, body: payload };
  const res = {
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; },
    setHeader() {},
  };

  try {
    await handler(req, res);
    return { status: res.code, data: res.data, sent, submissionId };
  } finally {
    Object.assign(mail, originals);
    delete require.cache[contactPath];
  }
}

test('contact success and duplicate retry return the stable reference in both emails', async () => {
  const payload = {
    name: 'Casey Customer',
    email: 'casey@example.com',
    subject: 'Packaging enquiry',
    message: 'Please share options for custom packaging.',
  };
  const first = await submitContact(payload);
  const duplicate = await submitContact(payload, { alreadySent: true });

  assert.equal(first.status, 200);
  assert.match(first.data.reference, /^NS-[0-9A-F]{12}$/);
  assert.equal(first.data.reference, `NS-${first.submissionId.slice(0, 12).toUpperCase()}`);
  assert.deepEqual(duplicate.data, first.data);
  assert.equal(first.sent.length, 1);
  assert.equal(duplicate.sent.length, 0);

  const { internal, customer } = first.sent[0];
  for (const message of [internal, customer]) {
    assert.ok(message.text.includes(`Enquiry reference: ${first.data.reference}`));
    assert.ok(message.html.includes(first.data.reference));
  }
});
