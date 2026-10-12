(() => {
  const main = document.querySelector(".apparel-service-page .apparel-service-main");
  if (!main || !window.gsap || !window.ScrollTrigger) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  window.gsap.registerPlugin(window.ScrollTrigger);

  const hero = main.querySelector(".apparel-hero");
  const heroImage = hero?.querySelector(".apparel-hero-image img");

  if (heroImage) {
    window.gsap.fromTo(heroImage, { scale: 1.02 }, {
      scale: 1.075,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: 0.8
      }
    });
  }

  main.querySelectorAll(".apparel-motion-item").forEach((item) => {
    window.gsap.fromTo(item, { opacity: 0.76, y: 18 }, {
      opacity: 1,
      y: 0,
      duration: 0.65,
      ease: "power2.out",
      immediateRender: false,
      scrollTrigger: {
        trigger: item,
        start: "top 88%",
        once: true
      }
    });
  });
})();
