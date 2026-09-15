if (window.gsap && window.ScrollTrigger && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  gsap.registerPlugin(ScrollTrigger);
  gsap.from('.about-intro > *', { y: 18, opacity: 0, duration: .7, stagger: .1, clearProps: 'all' });
  document.querySelectorAll('.about-reveal').forEach(section => {
    gsap.from(section, { y: 24, opacity: 0, duration: .75, scrollTrigger: { trigger: section, start: 'top 94%', once: true }, clearProps: 'all' });
  });
}
