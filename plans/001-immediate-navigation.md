# 001 — Remove decorative navigation delays
- **Status**: DONE — main-agent reviewed and browser verified 2026-09-29
- **Commit**: f18af5a
- **Severity**: HIGH
- **Category**: Purpose / performance
- **Estimated scope**: navigation-motion.js and obsolete related CSS in styles.css
## Problem
navigation-motion.js:33 currently awaits a width tween before navigating:
`el.animate([{width:getComputedStyle(el).width},{width:'100%'}],{duration:420,...})`.
Keyboard activation is also intercepted. Checkout arrival uses 450–550ms keyframes in styles.css:91.
## Target
Native link navigation, no preventDefault or animation wait. Preserve return-link and scroll bookkeeping, modified clicks, normal history and bfcache. Remove only animation-related session state and associated departure/arrival CSS. No new navigation design.
## Repo conventions
This is a static site. navigation-motion.js is an IIFE using guarded sessionStorage reads/writes; retain that error handling. Preserve normal anchor href destinations and existing form/API behavior.
## Steps
1. Keep valid return handling and same-origin quote/checkout entry bookkeeping.
2. Remove decorative interception, width tween and arrival/departure animation classes; preserve useful shopping scroll restoration if used.
3. Remove obsolete animation CSS/class definitions without modifying checkout or header layout.
## Boundaries
No main/Production, dependencies, form logic, product data, imagery or typography changes.
## Verification
Click and keyboard-activate Enquiry → Request a quote. Navigation begins without a fixed 420ms pause. Modified clicks stay native. Back navigation leaves no disabled controls, width changes or opacity remnants. Quote retains selected items. No real submissions.
