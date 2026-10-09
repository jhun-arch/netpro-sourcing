(() => {
  const page = document.querySelector('.home-page');
  if (!page) return;

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = motionPreference.matches;
  const gsapInstance = window.gsap;
  const scrollTrigger = window.ScrollTrigger;

  const gallery = page.querySelector('[data-home-gallery]');
  if (gallery) {
    const track = gallery.querySelector('[data-gallery-track]');
    const firstGroup = gallery.querySelector('[data-gallery-group]');
    const filterButtons = [...gallery.querySelectorAll('[data-gallery-filter]')];

    if (track && firstGroup) {
      const groups = [firstGroup];

      if (!reducedMotion) {
        for (let index = 1; index < 3; index += 1) {
          const copy = firstGroup.cloneNode(true);
          copy.setAttribute('aria-hidden', 'true');
          copy.dataset.galleryCopy = 'true';
          copy.querySelectorAll('a').forEach((link) => {
            link.tabIndex = -1;
          });
          copy.addEventListener('mousedown', (event) => {
            if (event.target.closest('a[data-gallery-item]')) event.preventDefault();
          });
          track.append(copy);
          groups.push(copy);
        }
      }

      const galleryItems = groups.flatMap((group) => [...group.querySelectorAll('[data-gallery-item]')]);

      const setGalleryFilter = (filter) => {
        gallery.dataset.activeFilter = filter;
        filterButtons.forEach((button) => {
          const active = button.dataset.galleryFilter === filter;
          button.setAttribute('aria-pressed', String(active));
        });
        galleryItems.forEach((item) => {
          item.hidden = filter !== 'all' && item.dataset.category !== filter;
        });

        if (!reducedMotion) {
          const groupWidth = firstGroup.getBoundingClientRect().width;
          const duration = Math.max(30, groupWidth / 32);
          gallery.style.setProperty('--home-gallery-duration', `${duration.toFixed(1)}s`);
          track.style.animation = 'none';
          void track.offsetWidth;
          track.style.animation = '';
        }
      };

      filterButtons.forEach((button) => {
        button.disabled = false;
        button.addEventListener('click', () => setGalleryFilter(button.dataset.galleryFilter));
      });
      setGalleryFilter('all');

      gallery.dataset.ready = 'true';
    }
  }

  const whySection = page.querySelector('[data-home-why]');
  if (whySection) {
    const progressList = whySection.querySelector('[data-why-list]');
    const progressLine = whySection.querySelector('[data-why-progress-line]');
    const benefitItems = [...whySection.querySelectorAll('[data-why-item]')];

    if (progressList && benefitItems.length) {
      const scrubProgress = Boolean(progressLine && gsapInstance && scrollTrigger && !reducedMotion);

      const setActiveBenefit = (activeIndex) => {
        benefitItems.forEach((item, index) => {
          item.dataset.active = String(index === activeIndex);
        });
        const progress = benefitItems.length > 1 ? activeIndex / (benefitItems.length - 1) : 1;
        if (progressLine && !scrubProgress) progressLine.style.setProperty('--why-progress', progress.toFixed(3));
      };

      setActiveBenefit(0);

      if (scrubProgress) {
        progressLine.classList.add('is-scroll-scrubbed');
        gsapInstance.fromTo(progressLine, { scaleY: 0 }, {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: progressList,
            start: 'top center',
            end: 'bottom center',
            scrub: 0.3
          }
        });
      }

      if ('IntersectionObserver' in window) {
        const visibleBenefits = new Set();
        const benefitObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const index = benefitItems.indexOf(entry.target);
            if (entry.isIntersecting) visibleBenefits.add(index);
            else visibleBenefits.delete(index);
          });

          if (visibleBenefits.size) {
            const centerLine = window.innerHeight / 2;
            const nearestIndex = [...visibleBenefits].sort((a, b) => {
              const centerA = benefitItems[a].getBoundingClientRect().top + benefitItems[a].offsetHeight / 2;
              const centerB = benefitItems[b].getBoundingClientRect().top + benefitItems[b].offsetHeight / 2;
              return Math.abs(centerA - centerLine) - Math.abs(centerB - centerLine);
            })[0];
            setActiveBenefit(nearestIndex);
          }
        }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

        benefitItems.forEach((item) => benefitObserver.observe(item));
      }
    }
  }

  const faqList = page.querySelector('[data-faq-list]');
  if (faqList) {
    const faqItems = [...faqList.querySelectorAll('.home-faq-item')];

    const setFaqOpen = (item, open, duration) => {
      const button = item.querySelector('.home-faq-toggle');
      const panel = item.querySelector('.home-faq-answer');
      if (!button || !panel) return;

      item.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      panel.toggleAttribute('inert', !open);

      if (gsapInstance) {
        gsapInstance.to(panel, {
          height: open ? 'auto' : 0,
          opacity: open ? 1 : 0,
          duration,
          ease: 'power3.out',
          overwrite: 'auto',
          onComplete: () => {
            panel.style.height = open ? 'auto' : '0px';
            panel.style.opacity = open ? '1' : '0';
          }
        });
      } else {
        panel.style.height = open ? 'auto' : '0px';
        panel.style.opacity = open ? '1' : '0';
      }

      if (duration === 0) {
        item.classList.add('is-instant');
        requestAnimationFrame(() => requestAnimationFrame(() => item.classList.remove('is-instant')));
      }
    };

    faqList.addEventListener('click', (event) => {
      const button = event.target.closest('.home-faq-toggle');
      if (!button || !faqList.contains(button)) return;

      const currentItem = button.closest('.home-faq-item');
      const opening = !currentItem.classList.contains('is-open');
      const keyboardAction = event.detail === 0;
      const duration = reducedMotion || keyboardAction ? 0 : 0.28;

      faqItems.forEach((item) => {
        if (item !== currentItem && item.classList.contains('is-open')) setFaqOpen(item, false, duration);
      });
      setFaqOpen(currentItem, opening, duration);
    });
  }

  if (gsapInstance && scrollTrigger && !reducedMotion) {
    page.querySelectorAll('[data-home-reveal-group]').forEach((element) => {
      gsapInstance.fromTo(element, { autoAlpha: 0, y: 22 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.72,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger: element, start: 'top 84%', once: true }
      });
    });

    const colorWords = [...page.querySelectorAll('[data-home-color-word]')];
    if (colorWords.length) {
      gsapInstance.fromTo(colorWords, { color: '#b9c9e0' }, {
        color: '#426097',
        duration: 0.88,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'color',
        scrollTrigger: { trigger: page.querySelector('[data-home-about]'), start: 'top 68%', once: true }
      });
    }
  }
})();
