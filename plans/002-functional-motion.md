# 002 — Unify menus, dialogs and pointer feedback
- **Status**: DONE — main-agent reviewed and browser verified 2026-09-29
- **Commit**: f18af5a
- **Severity**: HIGH
- **Category**: Interruptibility / accessibility / cohesion
- **Estimated scope**: motion.js, motion.css, app.js, inner-pages.js, relevant active CSS rules and HTML cache versions
## Problem
app.js:49-54 closes dialogs with 180/280ms timers and class-based keyframes. styles.css:13/74 and motion.css:1-8 overlap. Keyboard actions animate. Nav uses a restarted keyframe, and hover/image transitions vary up to 700ms.
## Target
Shared tokens: --motion-ease-out: cubic-bezier(0.23,1,0.32,1); --motion-ease-drawer: cubic-bezier(0.32,0.72,0,1).
Desktop pointer: nav enter180ms/exit120ms from top left with translateY(4px), scale(.98); centered dialogs220ms/160ms from translateY(8px) scale(.97); enquiry drawer260ms/180ms from right (translateX). Only transform/opacity motion. Keyboard actions are immediate, including Escape close, focus movement and programmatic keyboard clicks (detail=0). Reduced motion retains at most100ms opacity and no transforms. Coarse pointer retains functionality without hover or added movement.
Use a small shared controller in existing motion.js, native dialogs and CSS/WAAPI. Do not add libraries. Derive interrupted animation start from its current rendered state; cancel stale completions. Reopen during exit must not later close because of an old timer. Preserve native focus restore and body scroll locking.
## Repo conventions
app.js openDialog/dismissDialog centralize existing dialogs; inner-pages.js opens #case-dialog. Existing defer order puts motion.js after app.js but before inner-pages.js. Runtime handlers can access a shared window.NetproMotion controller after load; ensure initial/no-controller fallbacks work. Keep JS-enhanced content readable if motion fails.
## Steps
1. Track latest genuine pointer/keyboard modality with capture listeners and reflect a root data attribute for CSS. Pointerdown re-enables motion; keydown cancels active animations safely and leaves state final. Do not mistake hover for keyboard intent.
2. Replace duplicated CSS dialog animations and timed closes with shared open/close helpers; route case dialog through same helpers. Account for native close and direct product→enquiry transitions.
3. Apply interruptible origin-aware nav motion via existing setDropdown; hidden state and focus must remain correct when quickly reopening. Keyboard navigation is immediate.
4. Consolidate active card/image hover transforms under (hover:hover) and (pointer:fine), cap interactive hover at200–250ms, small scaling only. Remove transitions on static/noninteractive images. Add restrained scale(.98) pointer press feedback (160ms press /100ms release) to CTA controls without breaking existing transforms; keyboard press remains instant.
5. Reduced-motion preferences changed at runtime must finish/clear active motion safely. Keep short color/opacity feedback; do not leave hidden content.
6. Update cache versions for changed assets across existing root HTML only. Preserve navigation markup and all copy/layout.
## Boundaries
No new scroll reveal on six inner pages (reserved for prototype selection), no elastic/looping effects, no layouts, colors, fonts, product/API/form changes.
## Verification
Rapid dialog open→close→reopen, Escape mid-entry, backdrop close and close button. Verify focus restoration and scroll lock. Pointer nav open→leave→reenter and ArrowDown/Escape. Test keyboard zero movement and live prefers-reduced-motion toggle. Check desktop1440, basic mobile390/768, no overflow or JS exceptions. Scrub captured WAAPI frames at0/50/100% to verify origin and interpolation. Actual touch hardware is not available: report emulation only.
