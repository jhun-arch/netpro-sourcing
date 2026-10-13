const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'enquiry-state.js'), 'utf8');
const products = [
  { id: 'hoodie', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'patch-pvc', sizes: ['One size'] }
];

function createStore(storage = new Map()) {
  const events = [];
  const localStorage = {
    getItem(key) {
      if (storage.throwOnRead) throw new Error('storage read blocked');
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      if (storage.throwOnWrite) throw new Error('storage write blocked');
      storage.set(key, value);
    }
  };
  const window = { localStorage, dispatchEvent: event => events.push(event.type) };
  vm.runInNewContext(source, { window, Event, JSON, Number, Map, Set, Object, Array, String });
  return { state: window.NetproEnquiryState, storage, events };
}

const plain = value => JSON.parse(JSON.stringify(value));

test('legacy lines load as stock requests with empty customization fields', () => {
  const storage = new Map([['netpro-b2b-enquiry', JSON.stringify([{ id: 'hoodie', size: 'M', quantity: 3 }])]]);
  const { state } = createStore(storage);
  assert.deepEqual(plain(state.load(products)), [{
    id: 'hoodie', size: 'M', quantity: 3, intent: 'stock', customization: [], notes: ''
  }]);
});

test('an explicit unknown intent is rejected instead of becoming a legacy stock line', () => {
  const { state } = createStore();
  const result = state.add({ id: 'hoodie', size: 'M', quantity: 1, intent: 'custom-ish' }, products);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid-item');
});

test('customization choices normalize to a stable order and notes are capped at 500 characters', () => {
  const { state } = createStore();
  const result = state.add({
    id: 'hoodie', size: 'To be confirmed', quantity: 1, intent: 'custom',
    customization: ['style', 'logo', 'logo', 'unknown'], notes: 'n'.repeat(520)
  }, products);
  assert.equal(result.ok, true);
  assert.deepEqual(plain(result.items[0].customization), ['logo', 'style']);
  assert.equal(result.items[0].notes.length, 500);
});

test('matching requests merge, but stock and custom requests stay separate', () => {
  const { state } = createStore();
  state.load(products);
  state.add({ id: 'hoodie', size: 'M', quantity: 2 }, products);
  state.add({ id: 'hoodie', size: 'M', quantity: 3, intent: 'stock', customization: ['logo'], notes: 'ignored on stock' }, products);
  state.add({ id: 'hoodie', size: 'M', quantity: 4, intent: 'custom', customization: ['logo'], notes: '' }, products);
  assert.deepEqual(plain(state.get()), [
    { id: 'hoodie', size: 'M', quantity: 5, intent: 'stock', customization: [], notes: '' },
    { id: 'hoodie', size: 'M', quantity: 4, intent: 'custom', customization: ['logo'], notes: '' }
  ]);
});

test('add and edit enforce the 100,000 unit limit', () => {
  const { state } = createStore();
  state.load(products);
  state.add({ id: 'hoodie', size: 'M', quantity: 100000 }, products);
  assert.equal(state.add({ id: 'hoodie', size: 'M', quantity: 1 }, products).reason, 'quantity-limit');
  assert.equal(state.update(0, { quantity: 100001 }, products).ok, false);
});

test('the bag is capped at 50 distinct lines', () => {
  const manyProducts = Array.from({ length: 51 }, (_value, index) => ({ id: `p${index}`, sizes: ['One size'] }));
  const { state } = createStore();
  state.load(manyProducts);
  for (let index = 0; index < 50; index += 1) state.add({ id: `p${index}`, size: 'One size', quantity: 1 }, manyProducts);
  assert.equal(state.add({ id: 'p50', size: 'One size', quantity: 1 }, manyProducts).reason, 'item-limit');
  assert.equal(state.get().length, 50);
});

test('blocked storage preserves the current in-memory bag', () => {
  const storage = new Map();
  const { state } = createStore(storage);
  state.load(products);
  state.add({ id: 'hoodie', size: 'M', quantity: 1 }, products);
  storage.throwOnRead = true;
  assert.equal(state.load(products)[0].id, 'hoodie');
  storage.throwOnRead = false;
  storage.throwOnWrite = true;
  state.add({ id: 'patch-pvc', size: 'To be confirmed', quantity: 1, intent: 'custom' }, products);
  assert.deepEqual(plain(state.get()).map(item => item.id), ['hoodie', 'patch-pvc']);
  storage.throwOnWrite = false;
  assert.deepEqual(plain(state.load(products)).map(item => item.id), ['hoodie', 'patch-pvc']);
});
