# Motion implementation review — 2026-09-29

Baseline f18af5a; branch codex/about-pages-rebuild. Main agent reviewed the actual diff and browser behavior. Existing visual design, page structure, content, assets and enquiry API are retained.

| Before | After | Why |
|---|---|---|
| Quote links waited for a 420ms width tween | Native navigation; return bookkeeping retained (`navigation-motion.js`) | Frequent intent is immediate; no layout animation |
| CSS and GSAP both animated product results | One optional 140ms grid opacity feedback; keyboard/touch instant (`app.js`, `motion.js`) | No repeated card displacement or stagger |
| Dialog CSS keyframes and close timers overlapped | Cancellable current-state interpolation, 220/160ms dialogs and 260/180ms right drawer (`motion.js`) | Reversal and native close/reopen cannot leave stale completions |
| Menus only handled Escape when focus was inside | Document Escape also closes a hover-open menu (`app.js`) | Keyboard dismissal works without stealing outside focus |
| Long hover, category flex animation, parallax and repeated entrances | 180–200ms gated feedback, immediate category layout, no parallax/loop/form/footer choreography (`motion.css`, `styles.css`) | Motion is restrained and tied to interaction |
| Late Shop styles overrode shorter image motion | One 200ms image rule; keyboard resets transform and transition immediately | Avoids an unintended 500ms tail |

## Evidence

- Changed JavaScript passes `node --check`; `git diff --check` passes. All 16 changed root HTML files differ only in cache query values. No configuration, AGENTS.md, backend, image or copy changes.
- Main-agent Chromium checks cover 15 pages at 1440 and 390px: HTTP 200, no horizontal overflow, no broken completed images, no invisible main content or page exceptions. Home/Shop/Case Studies also pass 1920 and 768px overflow checks.
- Main agent compared desktop Home, Shop and Case Studies screenshots with pre-change captures. Static composition is retained; the test enquiry badge shows 50 after the flow check. Screenshots and test drivers are in ignored output/playwright/.
- Actual mouse/keyboard tests: hover menu and Escape; ArrowDown focuses Case Studies without animation; search opens/closes immediately with keyboard; Escape interrupts dialog entry; filter cards have no CSS animation, no GSAP tween and no transform; keyboard filtering has zero grid animations.
- Controlled edge tests: open→close→reopen, native close→reopen, forced immediate close during an animated exit, menu reversal, and missing Element.animate fallback all pass. Drawer has exactly one 260ms entry effect from translateX(100%).
- Dialog animation sampled at 0/50/100%: starts opacity0, y8px/scale.97; midpoint is nearly settled under the strong ease-out curve; finishes opacity1 at identity, duration220ms.
- Pointer image hover uses restrained scale; pressing a CTA reaches scale.98 at160ms. Switching to keyboard sets product/case imagery to transform:none and transition0s. No idle or recurring motion was introduced.
- Live reduced-motion changes finish active entry/exit cleanly; closing leaves the native dialog closed, no animations and body scroll unlocked. Reduced dialog feedback is opacity-only. Touch emulation has a working mobile menu and instant untransformed dialog. Real touch hardware and non-Chromium engines were not tested.
- JavaScript-disabled Home/About/Case Studies headings remain visible. The homepage category keyboard arrows work with no flex transition.
- Actual Shop flow: Basic Hoodie → M → 50 units → Add to Enquiry → Quote preserves the item and quantity50. Back navigation leaves the page visible and usable. No form or email was submitted.

## Prototype exception

The separate Case Studies grid prototype compares Quiet / Together / Sequence, with the same content and layout. Its picker follows the invoked skill's exact chrome specification, including its small highlight-width transition. Its keyboard replay deliberately demonstrates an animation; production keyboard interactions remain instant. No optional grid entrance has been integrated pending user selection. See PROTOTYPE.md.

## Verdict

**Approve** for the implemented functional motion refinements and Preview delivery. The optional Case Studies entrance remains a user choice; it does not block these fixes.
