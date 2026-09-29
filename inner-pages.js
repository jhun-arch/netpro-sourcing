(() => {
  const cards = document.querySelectorAll('[data-case-open]');
  const dialog = document.getElementById('case-dialog');
  if (!dialog || !cards.length || typeof dialog.showModal !== 'function') return;
  const fields = {
    category: document.getElementById('case-dialog-category'),
    title: document.getElementById('case-dialog-title'),
    brief: document.getElementById('case-dialog-brief'),
    material: document.getElementById('case-dialog-material'),
    detail: document.getElementById('case-dialog-detail')
  };
  cards.forEach(card => card.addEventListener('click', () => {
    fields.category.textContent = card.dataset.category;
    fields.title.textContent = card.dataset.title;
    fields.brief.textContent = card.dataset.brief;
    fields.material.textContent = card.dataset.material;
    fields.detail.textContent = card.dataset.detail;
    dialog.showModal();
    document.body.classList.add('modal-open');
  }));
})();
