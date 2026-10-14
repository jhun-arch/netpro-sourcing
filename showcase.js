(() => {
  const page = document.querySelector(".product-showcase-page");
  if (!page) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const categoryTabs = [...page.querySelectorAll("[data-category-tab]")];
  const categoryPanels = [...page.querySelectorAll("[data-category-panel]")];
  const detailTabs = [...page.querySelectorAll("[data-detail-tab]")];
  const detailCards = [...page.querySelectorAll(".showcase-detail-card")];
  const detailCopy = page.querySelector("[data-detail-current-copy]");
  const detailTitle = page.querySelector("[data-detail-current-title]");
  const detailNumber = page.querySelector("[data-detail-current-number]");
  const detailPanel = page.querySelector("[data-detail-window]");
  const detailStage = page.querySelector("[data-detail-stage]");
  let detailTrigger = null;
  let motionContext = null;

  const setCategory = (key) => {
    categoryTabs.forEach((tab) => {
      const selected = tab.dataset.categoryTab === key;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
  };

  let categoryFrame = 0;
  const updateCategoryFromViewport = () => {
    categoryFrame = 0;
    const viewportCenter = window.innerHeight / 2;
    const closest = categoryPanels.reduce((nearest, panel) => {
      const rect = panel.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      return !nearest || distance < nearest.distance ? { panel, distance } : nearest;
    }, null);
    if (closest) setCategory(closest.panel.dataset.categoryPanel);
  };
  const scheduleCategoryUpdate = () => {
    if (!categoryFrame) categoryFrame = window.requestAnimationFrame(updateCategoryFromViewport);
  };

  categoryTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      const panel = document.getElementById(tab.getAttribute("aria-controls"));
      if (!panel) return;
      setCategory(tab.dataset.categoryTab);
      const top = window.scrollY + panel.getBoundingClientRect().top - 132;
      window.scrollTo({ top, behavior: reduceMotion.matches ? "auto" : "smooth" });
    });

    tab.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % categoryTabs.length;
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + categoryTabs.length) % categoryTabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = categoryTabs.length - 1;
      else return;
      event.preventDefault();
      categoryTabs[next].focus();
    });
  });

  if (categoryPanels.length) {
    let categoryObserver = null;
    const observeCategoryPanels = () => {
      if (categoryObserver) categoryObserver.disconnect();
      if ("IntersectionObserver" in window) {
        const inset = Math.round(window.innerHeight * .38);
        categoryObserver = new IntersectionObserver(scheduleCategoryUpdate, {
          rootMargin: `-${inset}px 0px -${inset}px 0px`,
          threshold: 0,
        });
        categoryPanels.forEach((panel) => categoryObserver.observe(panel));
      }
      scheduleCategoryUpdate();
    };

    window.addEventListener("scroll", scheduleCategoryUpdate, { passive: true });
    window.addEventListener("resize", observeCategoryPanels, { passive: true });
    observeCategoryPanels();
  }

  const audienceCarousel = page.querySelector("[data-audience-carousel]");
  if (audienceCarousel) {
    const audienceWindow = audienceCarousel.querySelector(".showcase-audience-window");
    const audienceTrack = audienceCarousel.querySelector("[data-audience-track]");
    const audienceCards = [...audienceCarousel.querySelectorAll("[data-audience-card]")];
    const audiencePrev = audienceCarousel.querySelector("[data-audience-prev]");
    const audienceNext = audienceCarousel.querySelector("[data-audience-next]");
    const audienceStatus = audienceCarousel.querySelector("[data-audience-status]");
    const audienceCount = audienceCards.length;
    const autoplayDelay = 5000;
    let autoplayTimer = 0;
    let pauseOnHover = false;
    let pauseOnFocus = false;
    let audienceInView = false;
    let pendingDirection = 0;
    let queuedDirection = 0;
    let queuedFocusTarget = null;
    let audienceMoving = false;
    let resizePending = false;

    const audienceMetrics = () => {
      const cardWidth = audienceCards[0]?.getBoundingClientRect().width || 0;
      const styles = audienceTrack ? window.getComputedStyle(audienceTrack) : null;
      const gap = styles ? parseFloat(styles.columnGap || styles.gap) || 0 : 0;
      const visible = cardWidth > 0
        ? Math.max(1, Math.floor((audienceWindow.clientWidth + gap + 1) / (cardWidth + gap)))
        : 1;
      return { cardWidth, gap, visible: Math.min(visible, audienceCount) };
    };

    const audienceOrder = () => [...(audienceTrack?.querySelectorAll("[data-audience-card]") || [])];
    const updateAudienceCarousel = () => {
      if (!audienceWindow || !audienceTrack || !audienceCount) return;
      const order = audienceOrder();
      const { visible } = audienceMetrics();
      order.forEach((card, cardIndex) => {
        const isVisible = cardIndex < visible;
        card.setAttribute("aria-hidden", String(!isVisible));
        card.tabIndex = isVisible ? 0 : -1;
      });
      if (audienceStatus) {
        const leadingTitle = order[0]?.querySelector("h3")?.textContent.trim();
        const status = leadingTitle ? `${leadingTitle} leads the audience cards` : "Audience cards updated";
        if (audienceStatus.textContent !== status) audienceStatus.textContent = status;
      }
    };

    const autoplayIsBlocked = () => reduceMotion.matches || document.hidden || pauseOnHover || pauseOnFocus || !audienceInView;
    const stopAudienceAutoplay = () => {
      window.clearTimeout(autoplayTimer);
      autoplayTimer = 0;
    };
    const scheduleAudienceAutoplay = () => {
      stopAudienceAutoplay();
      if (autoplayIsBlocked() || !audienceCount) return;
      autoplayTimer = window.setTimeout(() => {
        autoplayTimer = 0;
        if (autoplayIsBlocked()) return scheduleAudienceAutoplay();
        moveAudienceCarousel(1, "autoplay");
      }, autoplayDelay);
    };

    const resetAudienceTrack = () => {
      const previousTransition = audienceTrack.style.transition;
      audienceTrack.style.transition = "none";
      audienceTrack.style.transform = "translate3d(0, 0, 0)";
      void audienceTrack.offsetWidth;
      if (previousTransition) audienceTrack.style.transition = previousTransition;
      else audienceTrack.style.removeProperty("transition");
    };

    const completeAudienceMove = () => {
      if (!audienceMoving || !audienceTrack) return;
      if (pendingDirection > 0) audienceTrack.append(audienceTrack.querySelector("[data-audience-card]"));
      resetAudienceTrack();
      pendingDirection = 0;
      audienceMoving = false;
      updateAudienceCarousel();
      if (resizePending) {
        resizePending = false;
        updateAudienceCarousel();
      }
      const focusTarget = queuedFocusTarget;
      queuedFocusTarget = null;
      if (focusTarget && audienceCarousel.contains(focusTarget)) focusTarget.focus();
      const queued = queuedDirection;
      queuedDirection = 0;
      if (queued) moveAudienceCarousel(queued, "manual");
      else scheduleAudienceAutoplay();
    };

    audienceTrack?.addEventListener("transitionend", (event) => {
      if (event.target === audienceTrack && event.propertyName === "transform") completeAudienceMove();
    });

    const moveAudienceCarousel = (direction, source = "manual", focusTarget = null) => {
      if (!audienceCount || !audienceTrack) return;
      const stepDirection = Math.sign(direction);
      if (!stepDirection) return;
      stopAudienceAutoplay();
      if (audienceMoving) {
        queuedDirection = stepDirection;
        queuedFocusTarget = focusTarget;
        return;
      }
      if (audienceStatus) audienceStatus.setAttribute("aria-live", source === "autoplay" ? "off" : "polite");
      const { cardWidth, gap } = audienceMetrics();
      const step = cardWidth + gap;
      const firstCard = audienceTrack.querySelector("[data-audience-card]");
      const lastCard = audienceTrack.querySelector("[data-audience-card]:last-of-type");
      if (!firstCard || !lastCard) return;

      if (stepDirection < 0) {
        audienceTrack.prepend(lastCard);
        if (!reduceMotion.matches && step > 0) {
          audienceTrack.style.transition = "none";
          audienceTrack.style.transform = `translate3d(${-step}px, 0, 0)`;
          void audienceTrack.offsetWidth;
          audienceTrack.style.removeProperty("transition");
        }
      }

      if (reduceMotion.matches || step <= 0) {
        if (stepDirection > 0) audienceTrack.append(firstCard);
        audienceTrack.style.transform = "translate3d(0, 0, 0)";
        updateAudienceCarousel();
        if (focusTarget && audienceCarousel.contains(focusTarget)) focusTarget.focus();
        scheduleAudienceAutoplay();
        return;
      }

      audienceMoving = true;
      pendingDirection = stepDirection;
      queuedFocusTarget = focusTarget;
      audienceTrack.style.transform = stepDirection > 0
        ? `translate3d(${-step}px, 0, 0)`
        : "translate3d(0, 0, 0)";
    };

    audiencePrev?.addEventListener("click", () => moveAudienceCarousel(-1));
    audienceNext?.addEventListener("click", () => moveAudienceCarousel(1));

    const positionAudienceCard = (card, targetPosition) => {
      const { visible } = audienceMetrics();
      const safeTarget = Math.max(0, Math.min(targetPosition, visible - 1));
      let order = audienceOrder();
      let index = order.indexOf(card);
      while (index > safeTarget) {
        audienceTrack.append(audienceTrack.querySelector("[data-audience-card]"));
        order = audienceOrder();
        index = order.indexOf(card);
      }
      while (index < safeTarget) {
        audienceTrack.prepend(audienceTrack.querySelector("[data-audience-card]:last-of-type"));
        order = audienceOrder();
        index = order.indexOf(card);
      }
      resetAudienceTrack();
      updateAudienceCarousel();
      card.focus();
    };

    audienceCards.forEach((card) => {
      card.addEventListener("keydown", (event) => {
        const order = audienceOrder();
        const index = order.indexOf(card);
        const { visible } = audienceMetrics();
        let target = null;
        if (event.key === "ArrowRight") target = order[(index + 1) % audienceCount];
        else if (event.key === "ArrowLeft") target = order[(index - 1 + audienceCount) % audienceCount];
        else if (event.key === "Home") target = audienceCards[0];
        else if (event.key === "End") target = audienceCards[audienceCount - 1];
        else return;
        event.preventDefault();
        if (audienceMoving) return;
        const targetPosition = order.indexOf(target);
        if (event.key === "Home") positionAudienceCard(target, 0);
        else if (event.key === "End") positionAudienceCard(target, visible - 1);
        else if (targetPosition >= 0 && targetPosition < visible) target.focus();
        else moveAudienceCarousel(event.key === "ArrowRight" ? 1 : -1, "manual", target);
      });
    });

    audienceCarousel.addEventListener("pointerenter", () => {
      pauseOnHover = true;
      stopAudienceAutoplay();
    });
    audienceCarousel.addEventListener("pointerleave", () => {
      pauseOnHover = false;
      scheduleAudienceAutoplay();
    });
    audienceCarousel.addEventListener("focusin", () => {
      pauseOnFocus = true;
      stopAudienceAutoplay();
    });
    audienceCarousel.addEventListener("focusout", (event) => {
      if (event.relatedTarget && audienceCarousel.contains(event.relatedTarget)) return;
      pauseOnFocus = false;
      scheduleAudienceAutoplay();
    });
    document.addEventListener("visibilitychange", scheduleAudienceAutoplay);

    const handleReducedMotionChange = () => {
      if (reduceMotion.matches) {
        stopAudienceAutoplay();
        completeAudienceMove();
      } else {
        scheduleAudienceAutoplay();
      }
    };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", handleReducedMotionChange);
    else reduceMotion.addListener(handleReducedMotionChange);

    let audienceResizeFrame = 0;
    const scheduleAudienceUpdate = () => {
      if (audienceResizeFrame) return;
      audienceResizeFrame = window.requestAnimationFrame(() => {
        audienceResizeFrame = 0;
        if (audienceMoving) resizePending = true;
        else updateAudienceCarousel();
      });
    };
    window.addEventListener("resize", scheduleAudienceUpdate, { passive: true });
    if ("ResizeObserver" in window && audienceWindow) {
      const audienceResizeObserver = new ResizeObserver(scheduleAudienceUpdate);
      audienceResizeObserver.observe(audienceWindow);
    }
    if ("IntersectionObserver" in window) {
      const audienceVisibilityObserver = new IntersectionObserver((entries) => {
        const entry = entries.find((candidate) => candidate.target === audienceCarousel);
        if (!entry) return;
        audienceInView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        scheduleAudienceAutoplay();
      }, { threshold: [0, 0.5] });
      audienceVisibilityObserver.observe(audienceCarousel);
    } else {
      audienceInView = true;
    }
    if (audienceStatus) audienceStatus.setAttribute("aria-live", "off");
    updateAudienceCarousel();
    scheduleAudienceAutoplay();
  }

  const setDetail = (index) => {
    const safeIndex = Math.max(0, Math.min(index, detailCards.length - 1));
    detailTabs.forEach((tab, i) => {
      const selected = i === safeIndex;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    const active = detailTabs[safeIndex];
    if (!active) return;
    if (detailNumber) detailNumber.textContent = String(safeIndex + 1).padStart(2, "0");
    if (detailTitle) detailTitle.textContent = active.dataset.detailTitle || "";
    if (detailCopy) detailCopy.textContent = active.dataset.detailCopy || "";
    const panel = page.querySelector("#showcase-detail-copy");
    if (panel && active.id) panel.setAttribute("aria-labelledby", active.id);
  };

  detailTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      if (detailTrigger && !reduceMotion.matches && window.matchMedia("(min-width: 901px)").matches) {
        const progress = index / Math.max(detailTabs.length - 1, 1);
        window.scrollTo({
          top: detailTrigger.start + (detailTrigger.end - detailTrigger.start) * progress,
          behavior: "smooth",
        });
      } else {
        setDetail(index);
        if (detailCards[index] && window.matchMedia("(max-width: 900px)").matches) {
          detailCards[index].scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "nearest", inline: "center" });
        }
      }
    });

    tab.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % detailTabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + detailTabs.length) % detailTabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = detailTabs.length - 1;
      else return;
      event.preventDefault();
      detailTabs[next].focus();
    });
  });

  const needsStaticMotion = () => reduceMotion.matches || !gsap || !ScrollTrigger || window.matchMedia("(max-width: 900px)").matches;
  const teardownMotion = () => {
    if (motionContext) motionContext.revert();
    if (gsap) {
      gsap.set([
        ...page.querySelectorAll(".showcase-category-mosaic img"),
        page.querySelector("[data-detail-track]"),
      ].filter(Boolean), { clearProps: "all" });
    }
    motionContext = null;
    detailTrigger = null;
  };
  const buildMotion = () => {
    if (needsStaticMotion()) {
      page.classList.add("showcase-static-motion");
      return;
    }

    page.classList.remove("showcase-static-motion");
    gsap.registerPlugin(ScrollTrigger);
    motionContext = gsap.context(() => {
      page.querySelectorAll(".showcase-category-panel").forEach((panel) => {
        panel.querySelectorAll(".showcase-category-mosaic img").forEach((image, imageIndex) => {
          gsap.fromTo(image, { yPercent: imageIndex === 0 ? 5 : -4 }, {
            yPercent: imageIndex === 0 ? -5 : 5,
            ease: "none",
            scrollTrigger: {
              trigger: panel,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        });
      });

      if (detailPanel && detailStage && detailCards.length) {
        const track = page.querySelector("[data-detail-track]");
        const distance = () => {
          if (!track || !detailPanel) return 0;
          const style = window.getComputedStyle(detailPanel);
          const available = detailPanel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          return Math.max(0, track.scrollWidth - available);
        };
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: detailStage,
            start: "top top+=82",
            end: () => `+=${Math.max(650, distance() * 1.25)}`,
            scrub: 0.75,
            pin: detailStage,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const index = Math.min(detailCards.length - 1, Math.round(self.progress * (detailCards.length - 1)));
              setDetail(index);
            },
          },
        });
        detailTrigger = tween.scrollTrigger || null;
      }
    }, page);
  };

  const syncMotionPreference = () => {
    teardownMotion();
    buildMotion();
    if (ScrollTrigger) ScrollTrigger.refresh();
  };

  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", syncMotionPreference);
  else if (reduceMotion.addListener) reduceMotion.addListener(syncMotionPreference);

  buildMotion();
  if (ScrollTrigger) {
    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
    window.addEventListener("resize", () => {
      if (needsStaticMotion() !== page.classList.contains("showcase-static-motion")) {
        syncMotionPreference();
      } else ScrollTrigger.refresh();
    }, { passive: true });
  }
})();
