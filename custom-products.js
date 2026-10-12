(() => {
  document.querySelectorAll('[data-custom-product-gallery]').forEach(gallery => {
    const thumbnails = [...gallery.querySelectorAll('[data-gallery-thumb]')];
    const stageView = gallery.querySelector('[data-gallery-view]');
    const stageCaption = gallery.querySelector('[data-gallery-caption]');
    const status = gallery.querySelector('[data-gallery-status]');
    const dialog = gallery.querySelector('[data-gallery-dialog]');
    const dialogView = gallery.querySelector('[data-lightbox-view]');
    const dialogCaption = gallery.querySelector('[data-lightbox-caption]');
    const openButton = gallery.querySelector('[data-gallery-open]');
    const closeButton = gallery.querySelector('[data-lightbox-close]');
    if (!thumbnails.length || !stageView || !dialog || !dialogView) return;

    let activeIndex = 0;
    let returnFocus = null;

    function paint(view, slide) {
      view.style.backgroundImage = `url("${slide.dataset.image}")`;
      view.style.backgroundPosition = slide.dataset.position || 'center';
      view.style.backgroundSize = (view === dialogView ? slide.dataset.lightboxSize : '') || slide.dataset.imageSize || 'cover';
      view.setAttribute('role', 'img');
      view.setAttribute('aria-label', slide.dataset.alt || 'Product reference image');
    }

    function select(index) {
      activeIndex = (index + thumbnails.length) % thumbnails.length;
      const selected = thumbnails[activeIndex];
      paint(stageView, selected);
      if (stageCaption) stageCaption.textContent = selected.dataset.label || 'Product Reference';
      openButton?.setAttribute('aria-label', `Open image viewer: ${selected.dataset.alt || 'Product reference image'}`);
      thumbnails.forEach((thumb, thumbIndex) => {
        thumb.setAttribute('aria-pressed', String(thumbIndex === activeIndex));
      });
      if (status) status.textContent = `${selected.dataset.label || 'Product reference'}, image ${activeIndex + 1} of ${thumbnails.length}`;
      if (dialog.open) paint(dialogView, selected);
      if (dialogCaption) dialogCaption.textContent = selected.dataset.label || 'Product Reference';
    }

    thumbnails.forEach((thumb, index) => thumb.addEventListener('click', () => select(index)));
    gallery.querySelector('[data-gallery-previous]')?.addEventListener('click', () => select(activeIndex - 1));
    gallery.querySelector('[data-gallery-next]')?.addEventListener('click', () => select(activeIndex + 1));

    openButton?.addEventListener('click', () => {
      returnFocus = openButton;
      paint(dialogView, thumbnails[activeIndex]);
      if (dialogCaption) dialogCaption.textContent = thumbnails[activeIndex].dataset.label || 'Product Reference';
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        closeButton?.focus();
      }
    });
    dialog.querySelector('[data-lightbox-previous]')?.addEventListener('click', () => select(activeIndex - 1));
    dialog.querySelector('[data-lightbox-next]')?.addEventListener('click', () => select(activeIndex + 1));
    closeButton?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (returnFocus?.isConnected) returnFocus.focus();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); select(activeIndex - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); select(activeIndex + 1); }
    });
    gallery.addEventListener('keydown', event => {
      if (dialog.open) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); select(activeIndex - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); select(activeIndex + 1); }
    });

    select(0);
  });
})();
