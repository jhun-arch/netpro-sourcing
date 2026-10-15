const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const confirmation = require('../submission-confirmation');
const contactSource = fs.readFileSync(path.join(__dirname, '..', 'contact.js'), 'utf8');
const quoteSource = fs.readFileSync(path.join(__dirname, '..', 'quote.js'), 'utf8');
const contactPage = fs.readFileSync(path.join(__dirname, '..', 'contact.html'), 'utf8');
const quotePage = fs.readFileSync(path.join(__dirname, '..', 'quote.html'), 'utf8');
const successPage = fs.readFileSync(path.join(__dirname, '..', 'submission-success.html'), 'utf8');
const confirmationSource = fs.readFileSync(path.join(__dirname, '..', 'submission-confirmation.js'), 'utf8');

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

function makeConfirmationDocument(clipboard = { writeText: async () => {} }) {
  const doc = {
    nodeType: 9,
    createElement(tagName) { return new FakeElement(tagName, this); },
    querySelector(selector) { return selector === '[data-submission-confirmation]' ? page : null; },
    defaultView: { navigator: { clipboard } },
  };
  class FakeElement {
    constructor(tagName, ownerDocument) {
      this.tagName = tagName.toUpperCase();
      this.ownerDocument = ownerDocument;
      this.dataset = {};
      this.children = [];
      this.hidden = false;
      this.textContent = '';
      this.className = '';
      this.style = {};
      this.attributes = {};
      this.listeners = {};
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = [...nodes]; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(type, listener) { this.listeners[type] = listener; }
  }
  const page = new FakeElement('div', doc);
  const success = new FakeElement('div', doc);
  const empty = new FakeElement('section', doc);
  const title = new FakeElement('h1', doc);
  const caption = new FakeElement('p', doc);
  const reference = new FakeElement('strong', doc);
  const copyButton = new FakeElement('button', doc);
  const copyStatus = new FakeElement('span', doc);
  const email = new FakeElement('span', doc);
  const type = new FakeElement('h2', doc);
  const summary = new FakeElement('div', doc);
  const details = new FakeElement('dl', doc);
  const pageElements = { '[data-confirmation-success]': success, '[data-confirmation-empty]': empty };
  const successElements = {
    '[data-confirmation-title]': title,
    '[data-confirmation-caption]': caption,
    '[data-confirmation-reference]': reference,
    '[data-confirmation-copy]': copyButton,
    '[data-confirmation-copy-status]': copyStatus,
    '[data-confirmation-email]': email,
    '[data-confirmation-type]': type,
    '[data-confirmation-summary]': summary,
    '[data-confirmation-details]': details,
  };
  page.querySelector = selector => pageElements[selector] || null;
  success.querySelector = selector => successElements[selector] || null;
  return { doc, page, success, empty, title, caption, reference, copyButton, copyStatus, email, type, summary, details };
}

test('receipt preparation keeps only the safe contact and quote summary fields', () => {
  const contact = confirmation.prepare('contact', {
    name: 'Taylor', email: 'taylor@example.com', company: 'Studio', subject: 'Custom caps',
    message: '<script>alert(1)</script>', reference: 'NS-012345ABCDEF',
    attachments: [{ content: 'base64 artwork' }], website: 'spam field',
  });
  assert.deepEqual(Object.keys(contact).sort(), ['company', 'email', 'message', 'name', 'reference', 'subject', 'type', 'version'].sort());
  assert.equal(contact.attachments, undefined);
  assert.equal(contact.company, 'Studio');
  assert.equal(confirmation.prepare('contact', {
    name: 'Taylor', email: 'taylor@example.com', subject: 'Custom caps', reference: 'NPQ-012345ABCDEF',
  }), null);

  const quote = confirmation.prepare('quote', {
    reference: 'NS-012345ABCDEF',
    name: 'Taylor', email: 'taylor@example.com', destination: 'US', project: 'Brand / retail collection',
    quantity: 1200, decoration: 'See per-product requirements', date: '', sample: 'Artwork proof',
    brief: '', artwork: 'https://private.example/file', attachments: [{ content: 'base64 artwork' }],
    items: [{ name: 'Everyday Hoodie', sku: 'HOODIE', art: 'catalog-3', image: 'assets/catalog-basics.webp',
      imageSize: '300% 300%', imagePosition: '0% 50%', imageAlt: 'Blue hoodie', color: 'Navy', size: 'M', quantity: 1200,
      intent: 'custom', customization: ['logo'], notes: 'private note', arbitraryHtml: '<img>' }],
  });
  assert.deepEqual(quote.items, [{ name: 'Everyday Hoodie', sku: 'HOODIE', art: 'catalog-3',
    image: 'assets/catalog-basics.webp', imageSize: '300% 300%', imagePosition: '0% 50%', imageAlt: 'Blue hoodie',
    variant: 'Navy · M', quantity: 1200, intent: 'Custom request' }]);
  assert.equal(quote.attachments, undefined);
  assert.equal(quote.artwork, undefined);
  assert.equal(quote.items[0].notes, undefined);
  assert.equal(confirmation.prepare('quote', {
    name: 'Taylor', email: 'taylor@example.com', destination: 'US', project: 'Other bulk sourcing',
    quantity: 1, decoration: 'Blank products', sample: 'Please advise', date: '', brief: '', items: [], reference: 'NS-012345ABCDEF',
  }), null);
  assert.equal(confirmation.isValidReceipt({
    version: 2, type: 'quote', reference: 'NS-012345ABCDEF', name: 'Taylor', email: 'taylor@example.com', company: '',
    destination: 'US', project: 'Other bulk sourcing', quantity: 1, decoration: 'Blank products',
    sample: 'Please advise', targetDate: '', brief: '', items: [], savedAt: 1000, expiresAt: 2000,
  }), false);
});

test('session receipts survive reload, expire after 30 minutes, and reject malformed data', () => {
  const storage = memoryStorage();
  const snapshot = confirmation.prepare('contact', {
    name: 'Taylor', email: 'taylor@example.com', subject: 'Custom caps', message: 'Looking for a quote', reference: 'NS-012345ABCDEF',
  });
  assert.equal(confirmation.save(snapshot, storage, 1000), true);
  assert.deepEqual(confirmation.read(storage, 1001), {
    ...snapshot,
    savedAt: 1000,
    expiresAt: 1000 + confirmation.MAX_AGE_MS,
  });
  assert.equal(confirmation.read(storage, 1000 + confirmation.MAX_AGE_MS), null);
  assert.equal(storage.values.has(confirmation.STORAGE_KEY), false);

  storage.setItem(confirmation.STORAGE_KEY, '{bad json');
  assert.equal(confirmation.read(storage, 1001), null);
  storage.setItem(confirmation.STORAGE_KEY, JSON.stringify({
    ...snapshot, savedAt: 1000, expiresAt: 1000 + confirmation.MAX_AGE_MS, attachments: ['private'],
  }));
  assert.equal(confirmation.read(storage, 1001), null);
  storage.setItem(confirmation.STORAGE_KEY, JSON.stringify({
    ...snapshot, savedAt: 2000, expiresAt: 2000 + confirmation.MAX_AGE_MS,
  }));
  assert.equal(confirmation.read(storage, 1000), null);
  assert.equal(storage.values.has(confirmation.STORAGE_KEY), false);

  const navigations = [];
  assert.equal(confirmation.complete(snapshot, { storage, now: 2000, navigate: url => navigations.push(url) }), true);
  assert.deepEqual(navigations, ['submission-success.html']);
  assert.equal(confirmation.read(storage, 2001).name, 'Taylor');
});

test('storage failures keep the helper on its inline-success fallback path', () => {
  const blocked = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  const snapshot = confirmation.prepare('contact', {
    name: 'Taylor', email: 'taylor@example.com', subject: 'Custom caps', message: 'Looking for a quote', reference: 'NS-012345ABCDEF',
  });
  assert.equal(confirmation.save(snapshot, blocked, 1000), false);
  let navigations = 0;
  assert.equal(confirmation.complete(snapshot, { storage: blocked, navigate: () => { navigations += 1; } }), false);
  assert.equal(navigations, 0);
});

test('renderer shows the empty state and renders the reference, email and contact receipt through DOM nodes', async () => {
  const storage = memoryStorage();
  const copied = [];
  const view = makeConfirmationDocument({ writeText: async value => copied.push(value) });
  confirmation.renderPage(view.doc, storage, 1000);
  assert.equal(view.page.dataset.state, 'empty');
  assert.equal(view.success.hidden, true);
  assert.equal(view.empty.hidden, false);

  const contact = confirmation.prepare('contact', {
    name: 'Taylor', email: 'taylor@example.com', company: 'Studio', subject: '<Custom socks>',
    message: '<b>Team order</b>', reference: 'NS-012345ABCDEF',
  });
  confirmation.save(contact, storage, 1000);
  confirmation.renderPage(view.doc, storage, 1001);
  assert.equal(view.page.dataset.state, 'success');
  assert.equal(view.success.hidden, false);
  assert.equal(view.empty.hidden, true);
  assert.equal(view.title.textContent, 'Thank you, Taylor.');
  assert.equal(view.reference.textContent, 'NS-012345ABCDEF');
  assert.equal(view.email.textContent, 'A confirmation email has been sent to taylor@example.com.');
  assert.equal(view.summary.children[0].tagName, 'H3');
  assert.equal(view.summary.children[0].textContent, '<Custom socks>');
  assert.equal(view.summary.children[1].textContent, '<b>Team order</b>');
  assert.deepEqual(view.details.children.map(row => row.children[0].textContent), ['Name', 'Email', 'Company']);
  await view.copyButton.listeners.click();
  assert.deepEqual(copied, ['NS-012345ABCDEF']);
  assert.equal(view.copyButton.textContent, 'Copied');
  assert.equal(view.copyStatus.textContent, 'Enquiry reference copied.');
});

function makeContactHarness(response, duringFetch = () => {}) {
  const fields = {
    name: { value: 'Taylor Poon' }, email: { value: 'taylor@example.com' },
    company: { value: 'Studio North' }, subject: { value: 'Custom socks' },
    message: { value: 'We are exploring a team order.' }, website: { value: '' },
  };
  const button = { disabled: false, textContent: 'Send message' };
  const status = { className: 'form-status', textContent: '' };
  const form = {
    elements: fields,
    resetCount: 0,
    reportValidity: () => true,
    reset() { this.resetCount += 1; },
    querySelector: () => button,
    addEventListener(type, handler) { if (type === 'submit') this.submitHandler = handler; },
  };
  const events = [];
  const window = { NetproSubmissionConfirmation: {
    isReference: confirmation.isReference,
    prepare(type, source) { events.push({ kind: 'prepare', type, source }); return confirmation.prepare(type, source); },
    complete(receipt) { events.push({ kind: 'complete', receipt, resetCount: form.resetCount }); return Boolean(receipt); },
  } };
  const context = {
    window,
    document: { querySelector(selector) { return selector === '#contact-form' ? form : status; } },
    fetch: async () => { duringFetch({ fields }); return response; },
  };
  vm.runInNewContext(contactSource, context);
  return { form, status, fields, events };
}

async function submitContact(harness) {
  await harness.form.submitHandler({ preventDefault() {}, currentTarget: harness.form });
}

test('contact handler completes with the server reference only after a successful response and reset', async () => {
  const harness = makeContactHarness({ ok: true, json: async () => ({ ok: true, reference: 'NS-012345ABCDEF' }) });
  await submitContact(harness);
  const complete = harness.events.find(event => event.kind === 'complete');
  assert.ok(complete);
  assert.equal(complete.resetCount, 1);
  assert.equal(complete.receipt.company, 'Studio North');
  assert.equal(complete.receipt.reference, 'NS-012345ABCDEF');
  assert.equal(harness.form.resetCount, 1);
  assert.equal(harness.status.className, 'form-status is-sending');
});

test('contact HTTP success without a valid reference still clears the form and reports inline success', async () => {
  const harness = makeContactHarness({ ok: true, json: async () => ({ ok: true }) });
  await submitContact(harness);
  const complete = harness.events.find(event => event.kind === 'complete');
  assert.ok(complete);
  assert.equal(complete.receipt, null);
  assert.equal(harness.form.resetCount, 1);
  assert.equal(harness.status.className, 'form-status is-success');
});

test('contact receipt uses the submitted field snapshot if fields change while the request is in flight', async () => {
  const harness = makeContactHarness(
    { ok: true, json: async () => ({ ok: true, reference: 'NS-012345ABCDEF' }) },
    ({ fields }) => {
      fields.name.value = 'Changed name';
      fields.subject.value = 'Changed subject';
      fields.message.value = 'Changed message';
    },
  );
  await submitContact(harness);
  const complete = harness.events.find(event => event.kind === 'complete');
  assert.equal(complete.receipt.name, 'Taylor Poon');
  assert.equal(complete.receipt.subject, 'Custom socks');
  assert.equal(complete.receipt.message, 'We are exploring a team order.');
});

test('contact failures stay inline, retain form values, and do not navigate', async () => {
  const harness = makeContactHarness({ ok: false, json: async () => ({ error: 'QA rejection' }) });
  await submitContact(harness);
  assert.equal(harness.events.some(event => event.kind === 'complete'), false);
  assert.equal(harness.form.resetCount, 0);
  assert.equal(harness.fields.name.value, 'Taylor Poon');
  assert.equal(harness.status.className, 'form-status is-error');
  assert.equal(harness.status.textContent, 'QA rejection');
});

function makeQuoteHarness(response, duringFetch = () => {}, savedItems = null) {
  const products = [{ id: 'hoodie', name: 'Everyday Hoodie', color: 'Navy', sizes: ['M', 'L'], category: 'apparel',
    art: 'catalog-3', hoverImage: 'assets/shop-onbody-hoodie.webp', hoverImageAlt: 'Blue hoodie',
    customizationHref: 'custom-hoodies.html' }];
  const initialItems = (savedItems || [{ id: 'hoodie', size: 'M', quantity: 3, intent: 'custom', customization: ['logo'], notes: 'embroidered chest logo' }]).map(item => ({ ...item }));
  let currentItems = initialItems.map(item => ({ ...item }));
  const state = {
    load: () => currentItems.map(item => ({ ...item })),
    get: () => currentItems.map(item => ({ ...item })),
    identityKey: item => JSON.stringify([item.id, item.size, item.intent, item.customization || [], item.notes || '']),
    set(items) { currentItems = items.map(item => ({ ...item })); this.setCount = (this.setCount || 0) + 1; },
    update() { return { ok: true, items: currentItems }; },
    remove() {},
  };
  const value = initial => ({ value: initial, required: false, placeholder: '', disabled: false, closest() { return null; } });
  const elements = {
    company: value('Studio North'), name: value('Taylor Poon'), email: value('taylor@example.com'),
    destination: value('US'), project: value('Brand / retail collection'), quantity: value('3'),
    decoration: value('Embroidery'), date: value(''), sample: value('Artwork proof'), budget: value(''),
    artwork: value(''), packaging: value(''), brief: value(''), website: value(''),
  };
  const button = { disabled: false, textContent: 'Submit Enquiry' };
  const form = {
    elements,
    resetCount: 0,
    reportValidity: () => true,
    reset() { this.resetCount += 1; },
    querySelector: () => button,
    addEventListener(type, handler) { if (type === 'submit') this.submitHandler = handler; },
  };
  const container = {
    inert: false,
    innerHTML: '',
    addEventListener() {},
    contains() { return false; },
    querySelector() { return null; },
  };
  const status = { className: 'form-status', textContent: '' };
  const uploadStatus = { textContent: '' };
  const fileInput = {
    files: [], validationMessage: '',
    addEventListener() {},
    setCustomValidity(message) { this.validationMessage = message; },
  };
  const events = [];
  const window = {
    NetproEnquiryState: state,
    NETPRO_PRODUCTS: products,
    addEventListener() {},
    NetproSubmissionConfirmation: {
      isReference: confirmation.isReference,
      prepare(type, source) { events.push({ kind: 'prepare', type, source }); return confirmation.prepare(type, source); },
      complete(receipt) {
        events.push({ kind: 'complete', receipt, resetCount: form.resetCount, setCount: state.setCount || 0 });
        return Boolean(receipt);
      },
    },
  };
  const document = {
    activeElement: null,
    querySelector(selector) {
      return {
        '#quote-form': form,
        '#quote-items': container,
        '#artwork-files': fileInput,
        '#upload-status': uploadStatus,
        '#quote-status': status,
      }[selector] || null;
    },
  };
  class FormDataMock {
    constructor() {}
    get(name) { return elements[name]?.value ?? null; }
  }
  const context = {
    window,
    document,
    FormData: FormDataMock,
    fetch: async () => { duringFetch({ currentItems, replace(items) { currentItems = items; } }); return response; },
    JSON, Number, String, Array, Map, Set, Object, Math, Promise,
  };
  vm.runInNewContext(quoteSource, context);
  return { form, status, uploadStatus, button, events, state, getItems: () => currentItems };
}

async function submitQuote(harness) {
  await harness.form.submitHandler({ preventDefault() {}, currentTarget: harness.form });
}

test('quote handler preserves changed quantities and completes after state cleanup', async () => {
  const harness = makeQuoteHarness({ ok: true, json: async () => ({ ok: true, reference: 'NS-ABCDEF012345' }) }, ({ replace }) => replace([
    { id: 'hoodie', size: 'M', quantity: 5, intent: 'custom', customization: ['logo'], notes: 'embroidered chest logo' },
  ]));
  await submitQuote(harness);
  const complete = harness.events.find(event => event.kind === 'complete');
  assert.ok(complete);
  assert.equal(complete.resetCount, 1);
  assert.equal(complete.setCount, 1);
  assert.equal(complete.receipt.items[0].quantity, 3);
  assert.equal(complete.receipt.reference, 'NS-ABCDEF012345');
  assert.equal(complete.receipt.items[0].sku, 'HOODIE');
  assert.equal(complete.receipt.items[0].image, 'assets/shop-onbody-hoodie.webp');
  assert.equal(complete.receipt.items[0].art, 'catalog-3');
  assert.equal(harness.getItems()[0].quantity, 2);
  assert.equal(harness.form.resetCount, 1);
});

test('quote submission without shortlisted items keeps a safe brief in the receipt', async () => {
  const harness = makeQuoteHarness({ ok: true, json: async () => ({ ok: true, reference: 'NS-ABCDEF012345' }) }, () => {}, []);
  harness.form.elements.quantity.value = '25';
  harness.form.elements.brief.value = '25 blank cotton hoodies for a staff event.';
  await submitQuote(harness);
  const complete = harness.events.find(event => event.kind === 'complete');
  assert.ok(complete);
  assert.equal(complete.receipt.items.length, 0);
  assert.equal(complete.receipt.brief, '25 blank cotton hoodies for a staff event.');
  assert.equal(harness.state.get().length, 0);
});

test('quote HTTP success without a valid reference still cleans submitted quantities and reports inline success', async () => {
  const harness = makeQuoteHarness({ ok: true, json: async () => ({ ok: true }) });
  await submitQuote(harness);
  const complete = harness.events.find(event => event.kind === 'complete');
  assert.ok(complete);
  assert.equal(complete.receipt, null);
  assert.equal(harness.state.get().length, 0);
  assert.equal(harness.form.resetCount, 1);
  assert.equal(harness.status.className, 'form-status is-success');
});

test('quote failures keep the saved enquiry and form values without navigating', async () => {
  const harness = makeQuoteHarness({ ok: false, json: async () => ({ error: 'QA rejection' }) });
  await submitQuote(harness);
  assert.equal(harness.events.some(event => event.kind === 'complete'), false);
  assert.equal(harness.getItems()[0].quantity, 3);
  assert.equal(harness.form.resetCount, 0);
  assert.equal(harness.status.className, 'form-status is-error');
  assert.equal(harness.status.textContent, 'QA rejection');
});

test('form pages load the shared receipt helper before their submission handlers', () => {
  assert.ok(contactPage.indexOf('submission-confirmation.js') < contactPage.indexOf('contact.js'));
  assert.ok(quotePage.indexOf('submission-confirmation.js') < quotePage.indexOf('quote.js'));
  assert.match(confirmationSource, /window\.location\.href = 'submission-success\.html'/);
  assert.doesNotMatch(contactSource, /location(?:\.href|\.assign)[^;]*(?:name|email|message)/i);
  assert.doesNotMatch(quoteSource, /location(?:\.href|\.assign)[^;]*(?:name|email|destination)/i);
});

test('success page places the horizontal next-steps row before the details grid and quote requests only digital proof', () => {
  assert.match(successPage, /data-confirmation-reference/);
  assert.match(successPage, /data-confirmation-copy/);
  assert.match(successPage, /data-confirmation-email/);
  assert.ok(successPage.indexOf('class="confirmation-next"') < successPage.indexOf('class="confirmation-grid"'));
  assert.match(quotePage, /Artwork approval<select name="sample"[^>]*><option>Please advise<\/option><option>Digital proof<\/option>/);
  assert.doesNotMatch(quotePage, /Physical sample/i);
});
