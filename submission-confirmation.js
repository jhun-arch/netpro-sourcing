(function attachSubmissionConfirmation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NetproSubmissionConfirmation = api;
  if (root && root.document) api.renderPage(root.document);
})(typeof globalThis === 'object' ? globalThis : this, function createSubmissionConfirmation() {
  'use strict';

  const STORAGE_KEY = 'netpro:last-submission:v2';
  const VERSION = 2;
  const MAX_AGE_MS = 30 * 60 * 1000;
  const REFERENCE_PATTERN = /^NS-[0-9A-F]{12}$/;
  const optionLabels = { logo: 'Add a logo', material: 'Change color or material', style: 'Develop a style' };

  function text(value, limit) {
    if (typeof value !== 'string') return '';
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, limit);
  }

  function quantity(value, maximum = 10000000) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 && number <= maximum ? number : null;
  }

  function bounded(value, maximum) {
    return typeof value === 'string' && value.length <= maximum;
  }

  function localAsset(value) {
    return typeof value === 'string' && /^assets\/[A-Za-z0-9._/-]+$/.test(value)
      && !value.split('/').some(part => part === '..')
      ? value
      : '';
  }

  function backgroundSize(value) {
    if (value === 'cover' || value === 'contain') return value;
    return typeof value === 'string' && /^(?:\d{1,4}(?:\.\d+)?%)(?:\s+\d{1,4}(?:\.\d+)?%)?$/.test(value)
      ? value
      : 'cover';
  }

  function backgroundPosition(value) {
    if (value === 'center' || value === 'center center') return value;
    return typeof value === 'string' && /^\d{1,3}(?:\.\d+)?%\s+\d{1,3}(?:\.\d+)?%$/.test(value)
      ? value
      : 'center';
  }

  function prepare(type, source) {
    if (!source || typeof source !== 'object' || (type !== 'contact' && type !== 'quote')) return null;
    const reference = text(source.reference, 15);
    if (!REFERENCE_PATTERN.test(reference)) return null;
    const receipt = {
      version: VERSION,
      type,
      reference,
      name: text(source.name, 100),
      email: text(source.email, 200),
      company: text(source.company, 120),
    };

    if (type === 'contact') {
      receipt.subject = text(source.subject, 160);
      receipt.message = text(source.message, 360);
      return receipt.name && receipt.email && receipt.subject ? receipt : null;
    }

    if (!Array.isArray(source.items) || source.items.length > 50) return null;
    const items = source.items.map(item => {
      if (!item || typeof item !== 'object') return null;
      const itemQuantity = quantity(item.quantity, 100000);
      const name = text(item.name, 120);
      const sku = text(item.sku, 64);
      const art = typeof item.art === 'string' && /^[a-z0-9-]{1,40}$/.test(item.art) ? item.art : '';
      const image = localAsset(item.image);
      const imageSize = backgroundSize(item.imageSize);
      const imagePosition = backgroundPosition(item.imagePosition);
      const imageAlt = text(item.imageAlt, 160);
      const variant = [text(item.color, 80), text(item.size, 80)].filter(Boolean).join(' · ');
      const intent = item.intent === 'custom' ? 'Custom request' : item.intent === 'stock' ? 'Ready stock' : '';
      if (!name || !sku || !itemQuantity || !intent) return null;
      return { name, sku, art, image, imageSize, imagePosition, imageAlt, variant, quantity: itemQuantity, intent };
    });
    if (items.some(item => !item)) return null;
    const projectQuantity = quantity(source.quantity);
    receipt.destination = text(source.destination, 120);
    receipt.project = text(source.project, 100);
    receipt.quantity = projectQuantity;
    receipt.decoration = text(source.decoration, 100);
    receipt.sample = text(source.sample, 80);
    receipt.targetDate = text(source.date, 32);
    receipt.brief = text(source.brief, 420);
    receipt.items = items;
    return receipt.name && receipt.email && receipt.destination && projectQuantity !== null
      && (items.length > 0 || receipt.brief)
      ? receipt
      : null;
  }

  function isValidReceipt(value) {
    if (!value || typeof value !== 'object' || value.version !== VERSION
      || (value.type !== 'contact' && value.type !== 'quote')
      || !Number.isFinite(value.savedAt) || !Number.isFinite(value.expiresAt)
      || value.expiresAt <= value.savedAt || value.expiresAt - value.savedAt > MAX_AGE_MS) return false;
    if (!bounded(value.name, 100) || !value.name || !bounded(value.email, 200) || !value.email
      || !bounded(value.company, 120) || !bounded(value.reference, 15) || !REFERENCE_PATTERN.test(value.reference)) return false;
    if (value.type === 'contact') {
      return bounded(value.subject, 160) && Boolean(value.subject) && bounded(value.message, 360)
        && Object.keys(value).every(key => ['version', 'type', 'reference', 'savedAt', 'expiresAt', 'name', 'email', 'company', 'subject', 'message'].includes(key));
    }
    return bounded(value.destination, 120) && Boolean(value.destination) && bounded(value.project, 100)
      && quantity(value.quantity) !== null && bounded(value.decoration, 100)
      && bounded(value.sample, 80) && bounded(value.targetDate, 32)
      && bounded(value.brief, 420) && Array.isArray(value.items)
      && value.items.length <= 50
      && (value.items.length > 0 || Boolean(value.brief))
      && value.items.every(item => item && bounded(item.name, 120) && Boolean(item.name)
        && bounded(item.sku, 64) && Boolean(item.sku)
        && (item.art === '' || /^[a-z0-9-]{1,40}$/.test(item.art))
        && (item.image === '' || localAsset(item.image) === item.image)
        && (item.imageSize === 'cover' || item.imageSize === 'contain'
          || /^(?:\d{1,4}(?:\.\d+)?%)(?:\s+\d{1,4}(?:\.\d+)?%)?$/.test(item.imageSize))
        && (item.imagePosition === 'center' || item.imagePosition === 'center center'
          || /^\d{1,3}(?:\.\d+)?%\s+\d{1,3}(?:\.\d+)?%$/.test(item.imagePosition))
        && bounded(item.imageAlt, 160) && bounded(item.variant, 163)
        && quantity(item.quantity, 100000) !== null && (item.intent === 'Custom request' || item.intent === 'Ready stock')
        && Object.keys(item).every(key => ['name', 'sku', 'art', 'image', 'imageSize', 'imagePosition', 'imageAlt', 'variant', 'quantity', 'intent'].includes(key)))
      && Object.keys(value).every(key => ['version', 'type', 'reference', 'savedAt', 'expiresAt', 'name', 'email', 'company', 'destination', 'project', 'quantity', 'decoration', 'sample', 'targetDate', 'brief', 'items'].includes(key));
  }

  function getSessionStorage() {
    try { return typeof window !== 'undefined' ? window.sessionStorage : null; }
    catch { return null; }
  }

  function save(snapshot, storage = getSessionStorage(), now = Date.now()) {
    if (!snapshot || !storage || !Number.isFinite(now)) return false;
    const { savedAt: _savedAt, expiresAt: _expiresAt, ...cleanSnapshot } = snapshot;
    const receipt = { ...cleanSnapshot, savedAt: now, expiresAt: now + MAX_AGE_MS };
    if (!isValidReceipt(receipt)) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(receipt));
      return true;
    } catch { return false; }
  }

  function read(storage = getSessionStorage(), now = Date.now()) {
    if (!storage || !Number.isFinite(now)) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      if (raw.length > 30000) return null;
      const receipt = JSON.parse(raw);
      if (!isValidReceipt(receipt) || receipt.savedAt > now || receipt.expiresAt <= now) {
        try { storage.removeItem(STORAGE_KEY); } catch { /* Expired data is ignored even if it cannot be removed. */ }
        return null;
      }
      return receipt;
    } catch { return null; }
  }

  function complete(snapshot, options = {}) {
    const storage = Object.prototype.hasOwnProperty.call(options, 'storage') ? options.storage : getSessionStorage();
    if (!save(snapshot, storage, Number.isFinite(options.now) ? options.now : Date.now())) return false;
    try {
      if (typeof options.navigate === 'function') options.navigate('submission-success.html');
      else window.location.href = 'submission-success.html';
      return true;
    } catch { return false; }
  }

  function make(context, tag, className, content) {
    const ownerDocument = context.nodeType === 9 ? context : context.ownerDocument;
    const node = ownerDocument.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
  }

  function addField(parent, label, value) {
    if (!value) return;
    const row = make(parent, 'div', 'confirmation-detail');
    row.append(make(parent, 'dt', '', label), make(parent, 'dd', '', value));
    parent.append(row);
  }

  function renderPage(documentRef, storage = getSessionStorage(), now = Date.now()) {
    const page = documentRef.querySelector('[data-submission-confirmation]');
    if (!page) return;
    const receipt = read(storage, now);
    const success = Boolean(receipt);
    page.dataset.state = success ? 'success' : 'empty';
    const successContent = page.querySelector('[data-confirmation-success]');
    const emptyContent = page.querySelector('[data-confirmation-empty]');
    successContent.hidden = !success;
    emptyContent.hidden = success;
    if (!success) return;

    const title = successContent.querySelector('[data-confirmation-title]');
    title.textContent = receipt.name ? `Thank you, ${receipt.name}.` : 'Thank you for your enquiry.';
    const caption = successContent.querySelector('[data-confirmation-caption]');
    caption.textContent = 'Your enquiry has been sent to our team.';
    const reference = successContent.querySelector('[data-confirmation-reference]');
    reference.textContent = receipt.reference;
    const copyButton = successContent.querySelector('[data-confirmation-copy]');
    const copyStatus = successContent.querySelector('[data-confirmation-copy-status]');
    copyButton.addEventListener('click', async () => {
      let copied = false;
      const clipboard = documentRef.defaultView?.navigator?.clipboard;
      if (clipboard && typeof clipboard.writeText === 'function') {
        try {
          await clipboard.writeText(receipt.reference);
          copied = true;
        } catch { /* Try the older document copy command below. */ }
      }
      if (!copied && documentRef.body && typeof documentRef.execCommand === 'function') {
        try {
          const input = make(documentRef, 'textarea', 'confirmation-copy-input');
          input.value = receipt.reference;
          input.setAttribute('readonly', '');
          input.style.position = 'fixed';
          input.style.left = '-9999px';
          documentRef.body.append(input);
          input.select();
          copied = documentRef.execCommand('copy');
          input.remove();
        } catch { /* The visible reference remains available for manual copying. */ }
      }
      copyButton.textContent = copied ? 'Copied' : 'Copy';
      copyButton.setAttribute('aria-label', copied ? 'Enquiry reference copied' : 'Copy enquiry reference');
      copyStatus.textContent = copied ? 'Enquiry reference copied.' : 'Copy unavailable. Select the reference to copy it.';
    });
    const emailLine = successContent.querySelector('[data-confirmation-email]');
    emailLine.textContent = receipt.email ? `A confirmation email has been sent to ${receipt.email}.` : 'A confirmation email has been sent.';
    const typeLabel = successContent.querySelector('[data-confirmation-type]');
    typeLabel.textContent = receipt.type === 'quote' ? 'Project enquiry' : 'Message enquiry';

    const summary = successContent.querySelector('[data-confirmation-summary]');
    const details = successContent.querySelector('[data-confirmation-details]');
    summary.replaceChildren();
    details.replaceChildren();
    addField(details, 'Name', receipt.name);
    addField(details, 'Email', receipt.email);
    addField(details, 'Company', receipt.company);
    if (receipt.type === 'contact') {
      summary.append(make(documentRef, 'h3', 'confirmation-summary-subject', receipt.subject));
      if (receipt.message) summary.append(make(documentRef, 'p', 'confirmation-summary-copy', receipt.message));
    } else {
      addField(details, 'Delivery country / region', receipt.destination);
      addField(details, 'Project type', receipt.project);
      addField(details, 'Target quantity', receipt.quantity.toLocaleString());
      addField(details, 'Customization', receipt.decoration);
      addField(details, 'Artwork approval', receipt.sample);
      addField(details, 'Target date', receipt.targetDate);
      if (receipt.items.length) {
        const list = make(documentRef, 'ul', 'confirmation-items');
        receipt.items.forEach(item => {
          const row = make(documentRef, 'li', 'confirmation-item');
          const image = make(documentRef, 'div', `confirmation-item-image product-art${item.art ? ` art-${item.art}` : ''}`);
          image.setAttribute('role', 'img');
          image.setAttribute('aria-label', item.imageAlt || item.name);
          if (item.image) {
            image.style.backgroundImage = `url("${item.image}")`;
            image.style.backgroundSize = item.imageSize;
            image.style.backgroundPosition = item.imagePosition;
          }
          const copy = make(documentRef, 'div', 'confirmation-item-copy');
          copy.append(make(documentRef, 'strong', '', item.name));
          copy.append(make(documentRef, 'span', 'confirmation-item-sku', `SKU: ${item.sku}`));
          const variant = [item.variant, item.intent].filter(Boolean).join(' · ');
          if (variant) copy.append(make(documentRef, 'span', '', variant));
          row.append(image, copy, make(documentRef, 'span', 'confirmation-item-quantity', `Qty ${item.quantity.toLocaleString()}`));
          list.append(row);
        });
        summary.append(list);
      } else {
        summary.append(make(documentRef, 'p', 'confirmation-summary-copy', receipt.brief || 'Your project details have been sent for review.'));
      }
    }
  }

  return { STORAGE_KEY, MAX_AGE_MS, prepare, isReference: value => typeof value === 'string' && REFERENCE_PATTERN.test(value), isValidReceipt, save, read, complete, renderPage };
});
