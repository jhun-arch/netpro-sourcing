(() => {
  'use strict';

  const root = document.querySelector('#shop-style-section');
  if (!root) return;

  const tabList = root.querySelector('[role="tablist"]');
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  const panel = root.querySelector('[role="tabpanel"]');
  const grid = root.querySelector('.shop-style-card-grid');
  const status = root.querySelector('.shop-style-status');
  const categoriesById = new Map();
  let pendingCategory = null;

  function categoryForShopFilter(value) {
    return value === 'headwear' || value === 'socks' ? value : 'clothing';
  }

  function setActiveCategory(id) {
    const category = categoriesById.get(id);
    if (!category) pendingCategory = id;

    tabs.forEach(tab => {
      const selected = tab.dataset.styleCategory === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `shop-style-tab-${id}`);
    panel.dataset.styleCategory = id;
    if (!category) return;

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

      const name = document.createElement('span');
      name.className = 'shop-style-card-name';
      name.textContent = entry.name;

      link.append(image, name);
      item.append(link);
      fragment.append(item);
    });

    grid.replaceChildren(fragment);
  }

  function initialCategory() {
    const value = new URLSearchParams(window.location.search).get('category');
    return value === 'bags' || value === 'headwear' || value === 'socks' ? value : 'clothing';
  }

  tabList.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab && tabList.contains(tab)) setActiveCategory(tab.dataset.styleCategory);
  });

  tabList.addEventListener('keydown', event => {
    const current = event.target.closest('[role="tab"]');
    if (!current) return;

    const currentIndex = tabs.indexOf(current);
    let nextIndex = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
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
      setActiveCategory('clothing');
    }
  });

  setActiveCategory(initialCategory());

  fetch('data/catalog-style-entries.json')
    .then(response => {
      if (!response.ok) throw new Error(`Style entries returned ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data.categories)) throw new Error('Style entries are missing categories');
      data.categories.forEach(category => categoriesById.set(category.id, category));
      status.hidden = true;
      setActiveCategory(pendingCategory || initialCategory());
    })
    .catch(() => {
      status.textContent = 'Style references are unavailable right now.';
      status.hidden = false;
      grid.replaceChildren();
    });
})();
