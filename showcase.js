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
        page.querySelector("[data-showcase-reel]"),
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
      const hero = page.querySelector(".showcase-hero");
      const reel = page.querySelector("[data-showcase-reel]");
      if (hero && reel) {
        const reelItems = [...reel.children];
        const seamlessDistance = reelItems[4]?.offsetTop || reel.offsetHeight / 2;
        gsap.to(reel, {
          y: () => -seamlessDistance,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
      }

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
