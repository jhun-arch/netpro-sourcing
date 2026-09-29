# 003 — Remove redundant and distracting content animation
- **Status**: DONE — main-agent reviewed and browser verified 2026-09-29
- **Commit**: f18af5a
- **Severity**: HIGH
- **Category**: Frequency / performance / cohesion
- **Estimated scope**: app.js, motion.js/css, services.js, relevant active styles.css/inner-pages.css/refinements.css
## Problem
Browser confirmed Shop cards have CSS gentle-in350ms plus a GSAP filter tween. app.js:226/234 replays displaced card entrances on every filter. app.js:364-381 uses whole Shop layout fade, delayed hero copy, 1.7s image zoom, parallax and section animations. styles.css:7 animates flex for850ms on category hover.
## Target
Filters and pagination update immediately for keyboard and touch. For desktop pointer, at most one140ms opacity feedback on the updated grid, no displacement/stagger, never hide/disable interaction. Cancel superseded effects.
Retain one restrained desktop-only, no-preference home hero entrance: opacity and translateY(8px), 400ms strong ease-out, max40ms stagger, no deliberate start delay. Image stays still. Remove hero parallax, scrolling image zoom, whole Shop layout entrance, footer entrance and duplicate product-card animation.
Existing meaningful marketing/service section reveals: once only, desktop fine-pointer no-preference, max320ms opacity+translateY(8px); exclude legal text/forms and always-visible initial viewport. Ensure content is readable before JS or on error. No new inner-page reveal until selected.
Category accordion preserves exact active/inactive layout but switches flex immediately; use at most180ms opacity feedback on active details and transform-only plus icon, without animating layout or saturation. Keyboard activation is immediate.
## Repo conventions
Keep static HTML/CSS and local GSAP already included. Favor CSS/WAAPI for bounded feedback; no new dependencies. app.js has gsap.matchMedia and cleanup examples; shared motion.js can own media/input policy.
## Steps
1. Remove duplicated CSS and GSAP product entrances, replace filter feedback with a single cancellable policy-aware effect.
2. Remove decorative page-wide motion noted above, reduce remaining home hero/section motion to target. Avoid init races with motion.js loaded after app.js.
3. Consolidate existing service/reveal observers with dynamic preference cleanup; do not observe every section or animate footer/forms.
4. Remove category flex/filter/long-scale transitions, retain immediate layout selection and short detail/icon feedback gated for pointer input.
5. Audit final active CSS so late inner-pages/refinements rules cannot undo reduced-motion or hover gating. Do not retain dead animation code.
## Verification
Run repeated filters and sort with mouse and keyboard; at most one feedback animation and no card transform. Verify first paint / JS-disabled visibility, immediate quote entry, home category selection and keyboard arrows. Live reduced-motion and viewport changes cannot leave opacity0 or shifted content. Check scrolling quickly and back; no repeated or blocked reveals. No horizontal overflow at1440/1920/768/390. node --check changed JS, git diff --check, Shop product→Enquiry→Quote without submitting.
