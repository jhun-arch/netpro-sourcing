# Motion audit — Netpro Sourcing

Audited baseline: `f18af5a`, 2026-09-28. Static HTML/CSS/JavaScript with local GSAP/ScrollTrigger. Existing typography, imagery, page structure and enquiry flow are retained. User authorized audit then implementation; this report precedes implementation.

| # | Severity | Category / location at baseline | Before | After | Why |
|---|---|---|---|---|---|
| 1 | HIGH | Navigation, navigation-motion.js:33 | 420ms width animation blocks navigation; arrival adds more motion | Native immediate navigation; retain return bookkeeping | Enquiry intent should not wait for decoration; avoid layout animation |
| 2 | HIGH | Filtering, app.js:226/234; motion.css:8 | Browser confirmed CSS gentle-in350ms and GSAP400ms overlap | One short pointer-only feedback; keyboard immediate | Frequent changes should not repeatedly hide/move cards |
| 3 | HIGH | Dialogs, app.js:49–54; styles.css:13; motion.css:1–8 | Restarted keyframes and closing timers, including keyboard | Shared cancellable motion with asymmetric entry/exit and instant keyboard response | Prevent stale closes and interrupted-state jumps |
| 4 | MEDIUM | Category accordion, styles.css:7 | Flex850ms, scale1200ms and delayed detail response | Immediate layout state and short detail/icon feedback | Preserve the accordion without sustained reflow |
| 5 | MEDIUM | Product/CTA hover, styles.css:5–11/45; inner-pages.css:32/61/92/249 | Several500–1000ms ungated hover effects, including noninteractive imagery | Short gated effects on interactive targets only | Align movement with affordance and input capability |
| 6 | MEDIUM | Initial/read motion, app.js:364–381; services.js:1 | Long delayed entrances, parallax and many overlapping reveals | Short readable-first desktop entrances; no parallax, form/footer choreography or new inner-page reveals | Keep attention on products and content |

Existing reduced-motion handling is present; it is not reported as missing. The refinement must also support runtime preference changes and preserve useful short nonspatial feedback. Modal center origins are correct and are not findings. No transition:all was found in the audited active CSS.

## Worth considering separately

- Case detail opening can use the same restrained dialog feedback as existing product details, so a click has a clear response without a new visual language.
- Case grid first entry is a taste decision rather than a correctness fix. Compare Quiet (none), Together (one group), Sequence (short per-column stagger) in an isolated prototype. Keep all content/layout identical and do not promote before user selection.

## Deliberate omissions

No looping decorations, text typing, new sticky/pinned choreography, animated FAQ heights, scroll hijacking or blanket reveal on every section. No new mobile visual work. No generated assets or animation libraries. Native keyboard, modified-click navigation, reduced motion, focus and enquiry continuity take priority over decoration.

The prototype picker follows the explicit PICKER.md specification; its small isolated highlight-width transition is a documented harness exception, not a production pattern.
