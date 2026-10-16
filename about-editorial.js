(() => {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionPreference.matches) return;

  const page = document.body;
  const revealItems = Array.from(document.querySelectorAll('.about-reveal'));
  const counters = Array.from(document.querySelectorAll('.about-stat-number[data-count]'));
  const stats = document.querySelector('.about-stats');
  const hasObserver = 'IntersectionObserver' in window;

  page.classList.add('about-hero-motion-ready');

  if (!hasObserver) {
    revealItems.forEach((item) => item.setAttribute('data-about-visible', ''));
    return;
  }

  page.classList.add('about-motion-ready');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.setAttribute('data-about-visible', '');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  revealItems.forEach((item) => revealObserver.observe(item));

  const productionPhoto = document.querySelector('.about-wide-photo');
  const productionMedia = productionPhoto?.querySelector('.about-wide-photo-media');
  const productionImage = productionMedia?.querySelector('img');
  if (productionPhoto && productionMedia && productionImage) {
    let photoIsVisible = false;
    let parallaxFrame = 0;

    const updateProductionParallax = () => {
      parallaxFrame = 0;
      if (!photoIsVisible || motionPreference.matches) return;

      const bounds = productionMedia.getBoundingClientRect();
      const travel = Math.max(1, window.innerHeight + bounds.height);
      const progress = Math.min(1, Math.max(0, (window.innerHeight - bounds.top) / travel));
      const maxOffset = Math.min(15, Math.max(0, bounds.height * 0.025 - 1));
      const offset = (progress - 0.5) * maxOffset * 2;
      productionImage.style.setProperty('--about-parallax-y', `${offset.toFixed(1)}px`);
    };

    const scheduleProductionParallax = () => {
      if (!photoIsVisible || parallaxFrame || motionPreference.matches) return;
      parallaxFrame = window.requestAnimationFrame(updateProductionParallax);
    };

    const productionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        photoIsVisible = entry.isIntersecting;
        productionPhoto.classList.toggle('is-parallax-visible', photoIsVisible && !motionPreference.matches);
        if (photoIsVisible) scheduleProductionParallax();
        else {
          if (parallaxFrame) window.cancelAnimationFrame(parallaxFrame);
          parallaxFrame = 0;
          productionImage.style.setProperty('--about-parallax-y', '0px');
        }
      });
    }, { rootMargin: '0px' });

    productionObserver.observe(productionMedia);
    window.addEventListener('scroll', scheduleProductionParallax, { passive: true });
    window.addEventListener('resize', scheduleProductionParallax, { passive: true });

    motionPreference.addEventListener('change', (event) => {
      if (!event.matches) {
        const bounds = productionMedia.getBoundingClientRect();
        photoIsVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
        productionPhoto.classList.toggle('is-parallax-visible', photoIsVisible);
        scheduleProductionParallax();
        return;
      }

      productionPhoto.classList.remove('is-parallax-visible');
      productionImage.style.removeProperty('--about-parallax-y');
      photoIsVisible = false;
      if (parallaxFrame) window.cancelAnimationFrame(parallaxFrame);
      parallaxFrame = 0;
    });
  }

  let countStarted = false;
  const runCounters = () => {
    if (countStarted) return;
    countStarted = true;

    counters.forEach((counter) => {
      const target = Number(counter.dataset.count);
      if (!Number.isFinite(target)) return;

      const startedAt = performance.now();
      const duration = 1000;
      const formatter = new Intl.NumberFormat('en-US');
      counter.textContent = '0';

      const update = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = formatter.format(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(update);
        else counter.textContent = formatter.format(target);
      };

      requestAnimationFrame(update);
    });
  };

  if (stats && counters.length) {
    const statsObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      runCounters();
      observer.disconnect();
    }, { threshold: 0.25 });
    statsObserver.observe(stats);
  }

  const accordionItems = Array.from(document.querySelectorAll('.about-accordion details'));
  const accordionAnimations = new WeakMap();
  const accordionEasing = 'cubic-bezier(0.23, 1, 0.32, 1)';

  const animateAnswer = (panel, fromHeight, toHeight, fromOpacity, toOpacity, onFinish) => {
    const currentAnimation = accordionAnimations.get(panel);
    if (currentAnimation) currentAnimation.cancel();

    panel.style.overflow = 'hidden';
    const animation = panel.animate([
      { height: fromHeight + 'px', opacity: fromOpacity },
      { height: toHeight + 'px', opacity: toOpacity }
    ], { duration: 220, easing: accordionEasing });
    accordionAnimations.set(panel, animation);

    animation.addEventListener('finish', () => {
      if (accordionAnimations.get(panel) !== animation) return;
      panel.style.removeProperty('height');
      panel.style.removeProperty('overflow');
      accordionAnimations.delete(panel);
      animation.cancel();
      if (onFinish) onFinish();
    }, { once: true });
  };

  accordionItems.forEach((details) => {
    const summary = details.querySelector('summary');
    const panel = details.querySelector('.about-faq-answer');
    if (!summary || !panel || typeof panel.animate !== 'function') return;

    details.addEventListener('toggle', () => {
      if (!details.open) return;
      animateAnswer(panel, 0, panel.scrollHeight, 0, 1);
    });

    summary.addEventListener('click', (event) => {
      if (!details.open) return;
      event.preventDefault();

      const currentHeight = panel.getBoundingClientRect().height;
      const parsedOpacity = Number.parseFloat(getComputedStyle(panel).opacity);
      const currentOpacity = Number.isFinite(parsedOpacity) ? parsedOpacity : 1;
      const isClosing = details.hasAttribute('data-about-closing');

      if (isClosing) {
        details.removeAttribute('data-about-closing');
        animateAnswer(panel, currentHeight, panel.scrollHeight, currentOpacity, 1);
        return;
      }

      details.setAttribute('data-about-closing', '');
      animateAnswer(panel, currentHeight, 0, currentOpacity, 0, () => {
        details.removeAttribute('data-about-closing');
        details.open = false;
      });
    });
  });
})();

