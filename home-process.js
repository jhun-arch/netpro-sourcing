(() => {
  const section = document.querySelector('.home-process');
  if (!section) return;

  const toggles = Array.from(section.querySelectorAll('[data-process-toggle]'));
  const images = Array.from(section.querySelectorAll('[data-process-image]'));
  const visual = section.querySelector('[data-process-visual]');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  const reflectMotionPreference = () => {
    section.classList.toggle('home-process-reduced-motion', motionPreference.matches);
  };

  const activateStep = index => {
    if (!Number.isInteger(index) || index < 0 || index >= toggles.length) return;

    toggles.forEach((toggle, toggleIndex) => {
      const active = toggleIndex === index;
      const panel = document.getElementById(toggle.getAttribute('aria-controls'));

      toggle.setAttribute('aria-expanded', String(active));
      toggle.closest('.home-process-step')?.classList.toggle('is-open', active);

      if (panel) {
        panel.classList.toggle('is-open', active);
        panel.setAttribute('aria-hidden', String(!active));
        panel.toggleAttribute('inert', !active);
      }
    });

    images.forEach((image, imageIndex) => {
      const active = imageIndex === index;
      image.classList.toggle('is-active', active);
      image.setAttribute('aria-hidden', String(!active));
    });

    if (visual) visual.dataset.active = String(index);
  };

  toggles.forEach((toggle, index) => {
    toggle.addEventListener('click', () => activateStep(index));
  });

  const initialIndex = toggles.findIndex(toggle => toggle.getAttribute('aria-expanded') === 'true');
  activateStep(initialIndex < 0 ? 0 : initialIndex);
  reflectMotionPreference();
  motionPreference.addEventListener?.('change', reflectMotionPreference);
})();
