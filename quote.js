(() => {
  'use strict';

  const state = window.NetproEnquiryState;
  const products = Array.isArray(window.NETPRO_PRODUCTS) ? window.NETPRO_PRODUCTS : [];
  const form = document.querySelector('#quote-form');
  const container = document.querySelector('#quote-items');
  const submitButton = form?.querySelector('button[type="submit"]');
  const catalogUnavailable = Boolean(window.NETPRO_PRODUCTS_LOAD_FAILED || !products.length);
  if (!form || !container || !state) return;

  const esc = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const optionLabels = { logo: 'Add a logo', material: 'Change color or material', style: 'Develop a style' };
  let items = state.load(products);
  let suppressRefresh = false;
  let submitting = false;

  function productArt(product) {
    const style = product.image
      ? ` style="background-image:url('${esc(product.image)}');background-size:${esc(product.imageSize || 'cover')};background-position:${esc(product.position || 'center')}"`
      : '';
    return `<div class="product-art ${product.art ? `art-${esc(product.art)}` : ''}"${style} role="img" aria-label="${esc(product.imageAlt || product.name)}"></div>`;
  }

  function summarize(item) {
    const mode = item.intent === 'custom' ? 'Custom request' : 'Ready stock';
    const options = item.customization.map(value => optionLabels[value]).filter(Boolean);
    return `${mode}${options.length ? ` · ${options.join(', ')}` : ''}${item.notes ? ` · ${item.notes}` : ''}`;
  }

  function editor(item, index, product) {
    const sizes = item.intent === 'custom' ? [...product.sizes, 'To be confirmed'] : product.sizes;
    return `<details class="quote-request-editor" data-editor-index="${index}"><summary>Edit request</summary><div class="quote-request-fields">
      <label>Request type<select data-quote-intent="${index}" data-editor-index="${index}" data-editor-focus="intent"><option value="stock" ${item.intent === 'stock' ? 'selected' : ''}>Ready stock</option><option value="custom" ${item.intent === 'custom' ? 'selected' : ''}>Custom request</option></select></label>
      <label>Size<select data-quote-size="${index}" data-editor-index="${index}" data-editor-focus="size">${sizes.map(size => `<option value="${esc(size)}" ${item.size === size ? 'selected' : ''}>${esc(size)}</option>`).join('')}</select></label>
      <fieldset data-quote-custom-options="${index}" ${item.intent === 'custom' ? '' : 'hidden'}><legend>Custom options <span>(optional)</span></legend>${Object.entries(optionLabels).map(([value, label]) => `<label><input type="checkbox" data-quote-option="${index}" data-editor-index="${index}" data-editor-focus="option-${value}" value="${value}" ${item.customization.includes(value) ? 'checked' : ''}>${label}</label>`).join('')}<label class="quote-notes-label">Project note<textarea data-quote-notes="${index}" data-editor-index="${index}" data-editor-focus="notes" maxlength="500" rows="2">${esc(item.notes)}</textarea></label></fieldset>
      <a class="text-link" href="${esc(product.customizationHref)}">View styles &amp; techniques ↗</a>
    </div></details>`;
  }

  function captureInteraction() {
    const active = document.activeElement;
    const openEditor = container.querySelector('.quote-request-editor[open]');
    const focusKey = container.contains(active) ? active.dataset.editorFocus : '';
    let selectionStart = null;
    let selectionEnd = null;
    try {
      if (typeof active?.selectionStart === 'number') {
        selectionStart = active.selectionStart;
        selectionEnd = active.selectionEnd;
      }
    } catch { /* Number inputs and other controls do not expose text selections. */ }
    return {
      openIndex: openEditor?.dataset.editorIndex ?? '',
      focusIndex: focusKey ? active.dataset.editorIndex : '',
      focusKey,
      selectionStart,
      selectionEnd
    };
  }

  function restoreInteraction(interaction) {
    if (!interaction) return;
    if (interaction.openIndex !== '') {
      const editorDetails = container.querySelector(`.quote-request-editor[data-editor-index="${interaction.openIndex}"]`);
      if (editorDetails) editorDetails.open = true;
    }
    if (interaction.focusKey && interaction.focusIndex !== '') {
      const focus = container.querySelector(`[data-editor-index="${interaction.focusIndex}"][data-editor-focus="${interaction.focusKey}"]`);
      if (focus) {
        focus.focus({ preventScroll: true });
        if (interaction.selectionStart !== null && typeof focus.setSelectionRange === 'function') {
          try { focus.setSelectionRange(interaction.selectionStart, interaction.selectionEnd); } catch { /* Some input types do not support text selections. */ }
        }
      }
    }
  }

  function updateBriefRequirement() {
    const brief = form.elements.brief;
    if (!brief) return;
    const hasItems = items.length > 0;
    const decoration = form.elements.decoration;
    const decorationLabel = decoration?.closest('label');
    if (decorationLabel) {
      decorationLabel.hidden = hasItems;
      decorationLabel.style.display = hasItems ? 'none' : '';
    }
    if (decoration) decoration.disabled = hasItems;
    brief.required = !hasItems;
    if (hasItems) brief.placeholder = 'Optional when products are selected. Add any project-wide details here.';
    else brief.placeholder = 'Products, size breakdown, colors, materials, packaging and other requirements.';
  }

  function updateTotalQuantity() {
    if (!items.length) return;
    form.elements.quantity.value = String(items.reduce((sum, item) => sum + item.quantity, 0));
  }

  function render(interaction = null) {
    items = state.get();
    if (catalogUnavailable) {
      const count = items.length;
      container.innerHTML = `<p class="quote-catalog-error" role="status">The product catalogue could not load. Your ${count} saved request ${count === 1 ? 'line is' : 'lines are'} still stored in this browser. Refresh the page to review and submit them.</p>`;
      updateBriefRequirement();
      updateTotalQuantity();
      submitButton.disabled = true;
      return;
    }
    submitButton.disabled = submitting;
    const rows = items.map((item, index) => {
      const product = products.find(candidate => candidate.id === item.id);
      if (!product) return '';
      const reference = [product.id.toUpperCase(), product.color, item.intent === 'stock' && product.category === 'patches' && item.size === 'Not specified' ? '' : item.size].filter(Boolean).join(' · ');
      return `<article class="quote-item">${productArt(product)}<div class="quote-item-copy"><h3>${esc(product.name)}</h3><p>Reference: ${esc(reference)}</p><p class="quote-request-summary">${esc(summarize(item))}</p><label class="quote-item-quantity">Quantity<input data-quote-qty="${index}" type="number" min="1" max="100000" step="1" value="${item.quantity}"></label><button type="button" class="quote-remove" data-quote-remove="${index}">Remove</button></div></article>`;
    }).filter(Boolean).join('');
    container.innerHTML = rows || '<p class="quote-empty">No products selected yet. Describe your requirements in the form, or browse our product range.</p>';
    updateBriefRequirement();
    updateTotalQuantity();
    restoreInteraction(interaction);
  }

  function applyUpdate(index, patch) {
    const interaction = captureInteraction();
    const previous = items[index];
    suppressRefresh = true;
    const result = state.update(index, patch, products);
    suppressRefresh = false;
    if (!result.ok) {
      const status = document.querySelector('#quote-status');
      status.className = 'form-status is-error';
      status.textContent = result.reason === 'quantity-limit'
        ? 'A matching request cannot exceed 100,000 units.'
        : 'This request could not be updated. Please review its details.';
      return;
    }
    items = result.items;
    const updated = { ...previous, ...patch };
    const intent = updated.intent === 'custom' ? 'custom' : 'stock';
    const identity = state.identityKey({
      id: updated.id,
      size: updated.size,
      intent,
      customization: intent === 'custom' ? state.OPTION_ORDER.filter(value => (updated.customization || []).includes(value)) : [],
      notes: intent === 'custom' && typeof updated.notes === 'string' ? updated.notes.slice(0, 500) : ''
    });
    const nextIndex = items.findIndex(item => state.identityKey(item) === identity);
    if (nextIndex >= 0) {
      if (interaction.openIndex !== '') interaction.openIndex = String(nextIndex);
      if (interaction.focusIndex !== '') interaction.focusIndex = String(nextIndex);
    }
    render(interaction);
  }

  container.addEventListener('change', event => {
    const quantity = event.target.closest('[data-quote-qty]');
    const intent = event.target.closest('[data-quote-intent]');
    const size = event.target.closest('[data-quote-size]');
    const notes = event.target.closest('[data-quote-notes]');
    const option = event.target.closest('[data-quote-option]');
    if (quantity) {
      const index = Number(quantity.dataset.quoteQty);
      const value = Math.min(100000, Math.max(1, Math.floor(Number(quantity.value) || 1)));
      quantity.value = String(value);
      applyUpdate(index, { quantity: value });
    } else if (intent) {
      const index = Number(intent.dataset.quoteIntent);
      const item = items[index];
      const product = products.find(candidate => candidate.id === item?.id);
      if (!item || !product) return;
      const custom = intent.value === 'custom';
      applyUpdate(index, {
        intent: custom ? 'custom' : 'stock',
        size: !custom && !product.sizes.includes(item.size) ? product.sizes[0] : item.size,
        customization: custom ? item.customization : [],
        notes: custom ? item.notes : ''
      });
    } else if (size) {
      applyUpdate(Number(size.dataset.quoteSize), { size: size.value });
    } else if (notes) {
      applyUpdate(Number(notes.dataset.quoteNotes), { notes: notes.value.slice(0, 500) });
    } else if (option) {
      const fieldset = option.closest('[data-quote-custom-options]');
      const selected = [...fieldset.querySelectorAll('[data-quote-option]:checked')].map(input => input.value);
      applyUpdate(Number(option.dataset.quoteOption), { customization: selected });
    }
  });

  container.addEventListener('click', event => {
    const remove = event.target.closest('[data-quote-remove]');
    if (!remove) return;
    state.remove(Number(remove.dataset.quoteRemove), products);
  });

  window.addEventListener('enquiry-updated', () => {
    if (!suppressRefresh) render(captureInteraction());
  });
  render();

  const fileInput = document.querySelector('#artwork-files');
  const uploadStatus = document.querySelector('#upload-status');

  function checkFiles() {
    const files = [...fileInput.files];
    const invalid = files.length > 3
      || files.reduce((sum, file) => sum + file.size, 0) > 2 * 1024 * 1024
      || files.some(file => !(/\.(jpe?g|png|pdf|zip)$/i.test(file.name)) || !file.size);
    fileInput.setCustomValidity(invalid ? 'Use JPG, PNG, PDF or ZIP; maximum 3 files and 2 MB total.' : '');
    uploadStatus.textContent = invalid
      ? fileInput.validationMessage
      : files.length
        ? `${files.map(file => file.name).join(', ')} — ready to upload with your enquiry.`
        : 'JPG, PNG, PDF or ZIP. Up to 3 files, 2 MB total.';
    return !invalid;
  }

  fileInput.addEventListener('change', checkFiles);
  const readFile = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ filename: file.name, content: reader.result.split(',')[1] });
    reader.onerror = () => reject(new Error('Could not read artwork. Select the file again.'));
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    if (catalogUnavailable) {
      const status = document.querySelector('#quote-status');
      status.className = 'form-status is-error';
      status.textContent = 'The product catalogue is unavailable. Your saved requests have been kept; refresh the page to try again.';
      return;
    }
    if (!checkFiles() || !form.reportValidity()) return;

    const status = document.querySelector('#quote-status');
    const button = submitButton;
    const originalLabel = button.textContent;
    const data = new FormData(form);
    const submittedItems = state.get();
    if (submittedItems.some(item => !products.some(product => product.id === item.id))) {
      const status = document.querySelector('#quote-status');
      status.className = 'form-status is-error';
      status.textContent = 'One or more saved products could not be loaded. Your enquiry list has been kept; refresh the page to try again.';
      return;
    }
    const brief = String(data.get('brief') || '').trim();
    const packaging = String(data.get('packaging') || '').trim();
    const payload = {
      company: data.get('company'),
      name: data.get('name'),
      email: data.get('email'),
      destination: data.get('destination'),
      project: data.get('project'),
      quantity: Number(data.get('quantity')),
      decoration: submittedItems.length ? 'See per-product requirements' : data.get('decoration'),
      date: data.get('date'),
      sample: data.get('sample'),
      budget: data.get('budget'),
      artwork: data.get('artwork'),
      brief: [brief, packaging ? `Packaging: ${packaging}` : ''].filter(Boolean).join('\n'),
      website: data.get('website') || '',
      items: submittedItems.map(item => {
        const product = products.find(candidate => candidate.id === item.id);
        return {
          name: product.name,
          sku: product.id.toUpperCase(),
          color: product.color,
          size: item.size,
          quantity: item.quantity,
          intent: item.intent,
          customization: item.customization,
          notes: item.notes
        };
      })
    };

    const setStatus = (kind, message) => {
      status.className = `form-status${kind ? ` is-${kind}` : ''}`;
      status.textContent = message;
    };
    submitting = true;
    window.NETPRO_QUOTE_SUBMITTING = true;
    container.inert = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    setStatus('sending', 'Sending your enquiry…');

    try {
      if (fileInput.files.length) uploadStatus.textContent = 'Uploading artwork with your enquiry…';
      payload.attachments = await Promise.all([...fileInput.files].map(readFile));
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'Request failed');
      }
      const submittedQuantities = new Map(submittedItems.map(item => [state.identityKey(item), item.quantity]));
      const remainingItems = state.get().flatMap(item => {
        const key = state.identityKey(item);
        const sentQuantity = submittedQuantities.get(key);
        if (sentQuantity === undefined) return [item];
        submittedQuantities.delete(key);
        return item.quantity > sentQuantity ? [{ ...item, quantity: item.quantity - sentQuantity }] : [];
      });
      state.set(remainingItems, products);
      form.reset();
      uploadStatus.textContent = 'Artwork submitted with your enquiry.';
      setStatus('success', '✓ Enquiry sent successfully. A confirmation email has been sent to your inbox.');
    } catch (error) {
      uploadStatus.textContent = 'Submission failed. Your selected files are retained for retry.';
      setStatus('error', error.message && error.message !== 'Request failed'
        ? error.message
        : 'Sorry, your enquiry could not be sent right now. Please try again in a moment.');
    } finally {
      submitting = false;
      window.NETPRO_QUOTE_SUBMITTING = false;
      container.inert = false;
      render(captureInteraction());
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
})();
