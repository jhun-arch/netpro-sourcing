(() => {
  'use strict';

  const STORAGE_KEY = 'netpro-b2b-enquiry';
  const MAX_ITEMS = 50;
  const MAX_QUANTITY = 100000;
  const OPTION_ORDER = ['logo', 'material', 'style'];
  let items = [];
  let dirty = false;

  const copy = value => value.map(item => ({
    ...item,
    customization: [...item.customization]
  }));

  function normalizeItem(raw, products) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.size !== 'string') return null;
    const product = products.find(candidate => candidate.id === raw.id);
    if (Object.prototype.hasOwnProperty.call(raw, 'intent') && raw.intent !== 'stock' && raw.intent !== 'custom') return null;
    const intent = raw.intent === 'custom' ? 'custom' : 'stock';
    const size = raw.size.trim();
    const quantity = Number(raw.quantity);
    if ((products.length && !product) || !size || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return null;
    if (product && !product.sizes.includes(size) && !(intent === 'custom' && size === 'To be confirmed')) return null;

    const selected = new Set(Array.isArray(raw.customization) ? raw.customization : []);
    const customization = intent === 'custom' ? OPTION_ORDER.filter(option => selected.has(option)) : [];
    const notes = intent === 'custom' && typeof raw.notes === 'string' ? raw.notes.slice(0, 500) : '';
    return { id: raw.id, size, quantity, intent, customization, notes };
  }

  function identityKey(item) {
    return JSON.stringify([
      item.id,
      item.size,
      item.intent,
      [...item.customization].sort(),
      item.notes
    ]);
  }

  function normalizeList(values, products) {
    const normalized = [];
    const indexes = new Map();
    for (const raw of values) {
      const item = normalizeItem(raw, products);
      if (!item) continue;
      const key = identityKey(item);
      const index = indexes.get(key);
      if (index === undefined) {
        if (normalized.length === MAX_ITEMS) continue;
        indexes.set(key, normalized.length);
        normalized.push(item);
      } else {
        normalized[index].quantity = Math.min(MAX_QUANTITY, normalized[index].quantity + item.quantity);
      }
    }
    return normalized;
  }

  function emitChange() {
    try { window.dispatchEvent(new Event('enquiry-updated')); } catch { /* The in-memory state remains usable without event support. */ }
  }

  function load(products = []) {
    if (dirty) return copy(items);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === null) {
        items = [];
        return copy(items);
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return copy(items);
      items = normalizeList(parsed, products);
      return copy(items);
    } catch {
      return copy(items);
    }
  }

  function get() {
    return copy(items);
  }

  function set(next, products = []) {
    items = normalizeList(Array.isArray(next) ? next : [], products);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      dirty = false;
    } catch {
      dirty = true;
    }
    emitChange();
    return copy(items);
  }

  function add(raw, products = []) {
    const item = normalizeItem(raw, products);
    if (!item) return { ok: false, reason: 'invalid-item', items: get() };
    const key = identityKey(item);
    const existing = items.find(candidate => identityKey(candidate) === key);
    if (existing) {
      if (existing.quantity + item.quantity > MAX_QUANTITY) return { ok: false, reason: 'quantity-limit', items: get() };
      return { ok: true, items: set(items.map(candidate => candidate === existing
        ? { ...candidate, quantity: candidate.quantity + item.quantity }
        : candidate), products) };
    }
    if (items.length >= MAX_ITEMS) return { ok: false, reason: 'item-limit', items: get() };
    return { ok: true, items: set([...items, item], products) };
  }

  function update(index, patch, products = []) {
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return { ok: false, reason: 'missing-item', items: get() };
    const updated = normalizeItem({ ...items[index], ...patch }, products);
    if (!updated) return { ok: false, reason: 'invalid-item', items: get() };

    const key = identityKey(updated);
    const collisionIndex = items.findIndex((candidate, candidateIndex) => candidateIndex !== index && identityKey(candidate) === key);
    if (collisionIndex >= 0) {
      if (items[collisionIndex].quantity + updated.quantity > MAX_QUANTITY) return { ok: false, reason: 'quantity-limit', items: get() };
      const next = items.filter((_candidate, candidateIndex) => candidateIndex !== index);
      const targetIndex = collisionIndex > index ? collisionIndex - 1 : collisionIndex;
      next[targetIndex] = { ...next[targetIndex], quantity: next[targetIndex].quantity + updated.quantity };
      return { ok: true, items: set(next, products) };
    }

    const next = [...items];
    next[index] = updated;
    return { ok: true, items: set(next, products) };
  }

  function remove(index, products = []) {
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return get();
    return set(items.filter((_item, itemIndex) => itemIndex !== index), products);
  }

  window.NetproEnquiryState = Object.freeze({
    STORAGE_KEY,
    MAX_ITEMS,
    MAX_QUANTITY,
    OPTION_ORDER: Object.freeze([...OPTION_ORDER]),
    load,
    get,
    set,
    add,
    update,
    remove,
    identityKey
  });
})();
