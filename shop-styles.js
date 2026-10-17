(() => {
  'use strict';

  const root = document.querySelector('#shop-style-section');
  if (!root) return;

  const tabList = root.querySelector('[role="tablist"]');
  const panel = root.querySelector('[role="tabpanel"]');
  const grid = root.querySelector('.shop-style-card-grid');
  const status = root.querySelector('.shop-style-status');
  const categoriesById = new Map();
  let pendingCategory = null;

  function tabs() {
    return [...tabList.querySelectorAll('[role="tab"]')];
  }

  function validCategoryId(value) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value || '');
  }

  function syncTabs(categories) {
    const existing = new Map(tabs().map(tab => [tab.dataset.styleCategory, tab]));
    const wanted = new Set();
    categories.forEach(category => {
      if (!validCategoryId(category.id)) return;
      wanted.add(category.id);
      let tab = existing.get(category.id);
      if (!tab) {
        tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'shop-style-tab';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panel.id || 'shop-style-panel');
        tabList.append(tab);
      }
      tab.id = `shop-style-tab-${category.id}`;
      tab.dataset.styleCategory = category.id;
      tab.textContent = category.label;
      tab.setAttribute('role', 'tab');
      if (category.editing?.label) tab.setAttribute('data-sanity', category.editing.label);
      else tab.removeAttribute('data-sanity');
    });

    tabs().forEach(tab => {
      if (!wanted.has(tab.dataset.styleCategory)) tab.remove();
    });

    // Reappend in CMS order without changing the existing tab styles or behavior.
    categories.filter(category => wanted.has(category.id)).forEach(category => {
      const tab = tabList.querySelector(`[data-style-category="${CSS.escape(category.id)}"]`);
      if (tab) tabList.append(tab);
    });
  }

  function categoryForShopFilter(value) {
    if (categoriesById.has(value)) return value;
    return categoriesById.has('clothing') ? 'clothing' : categoriesById.keys().next().value;
  }

  function setActiveCategory(id) {
    const category = categoriesById.get(id);
    if (!category) {
      pendingCategory = id;
      return;
    }

    tabs().forEach(tab => {
      const selected = tab.dataset.styleCategory === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `shop-style-tab-${id}`);
    panel.dataset.styleCategory = id;
    pendingCategory = null;
    grid.setAttribute('aria-label', `${category.label} styles`);
    renderEntries(category.entries);
  }

  function renderEntries(entries) {
    const fragment = document.createDocumentFragment();

    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'shop-style-card';

      const link = document.createElement('a');
      link.className = 'shop-style-card-link';
      link.href = entry.href;

      const image = document.createElement('span');
      image.className = 'shop-style-image';
      image.setAttribute('role', 'img');
      image.setAttribute('aria-label', entry.alt);
      image.style.backgroundImage = `url("${entry.image}")`;
      image.style.backgroundPosition = entry.position;
      image.style.backgroundSize = entry.size;
      if (entry.editing?.image) image.setAttribute('data-sanity', entry.editing.image);

      const name = document.createElement('span');
      name.className = 'shop-style-card-name';
      name.textContent = entry.name;
      if (entry.editing?.name) name.setAttribute('data-sanity', entry.editing.name);

      link.append(image, name);
      item.append(link);
      fragment.append(item);
    });

    grid.replaceChildren(fragment);
  }

  function initialCategory() {
    const requested = new URLSearchParams(window.location.search).get('category');
    return categoryForShopFilter(requested) || 'clothing';
  }

  function loadStyles(data) {
    if (!Array.isArray(data?.categories)) throw new Error('Style entries are missing categories');
    data.categories.forEach(category => categoriesById.set(category.id, category));
    syncTabs(data.categories);
    status.hidden = true;
    setActiveCategory(pendingCategory || initialCategory());
  }

  tabList.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab && tabList.contains(tab)) setActiveCategory(tab.dataset.styleCategory);
  });

  tabList.addEventListener('keydown', event => {
    const current = event.target.closest('[role="tab"]');
    const currentTabs = tabs();
    if (!current) return;

    const currentIndex = currentTabs.indexOf(current);
    let nextIndex = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % currentTabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex + currentTabs.length - 1) % currentTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = currentTabs.length - 1;
    if (nextIndex === null || !currentTabs.length) return;

    event.preventDefault();
    const nextTab = currentTabs[nextIndex];
    setActiveCategory(nextTab.dataset.styleCategory);
    nextTab.focus({ preventScroll: true });
  });

  document.addEventListener('change', event => {
    if (event.target.matches('#category-select')) {
      setActiveCategory(categoryForShopFilter(event.target.value));
      return;
    }

    if (event.target.matches('#category-options input[name="category"]')) {
      setActiveCategory(categoryForShopFilter(event.target.value));
    }
  });

  document.addEventListener('click', event => {
    if (event.target.closest('#clear-filters, #clear-filter-tags, [data-remove-filter="category"]')) {
      setActiveCategory(categoryForShopFilter('clothing'));
    }
  });

  if (Array.isArray(window.NETPRO_CATALOG_STYLES?.categories)) {
    try {
      loadStyles(window.NETPRO_CATALOG_STYLES);
    } catch {
      status.textContent = 'Style references are unavailable right now.';
      status.hidden = false;
      grid.replaceChildren();
    }
    return;
  }

  fetch('data/catalog-style-entries.json')
    .then(response => {
      if (!response.ok) throw new Error(`Style entries returned ${response.status}`);
      return response.json();
    })
    .then(loadStyles)
    .catch(() => {
      status.textContent = 'Style references are unavailable right now.';
      status.hidden = false;
      grid.replaceChildren();
    });
})();
