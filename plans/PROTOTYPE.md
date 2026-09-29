# Case Studies entrance comparison

Isolated preview: `prototypes/case-motion.html`. No production page imports it. All variants retain the same nine cards, images, copy and grid. Existing product concepts are illustrative, as labeled on the page.

| Variant | Axis | When it fits | Cost |
|---|---|---|---|
| Quiet | No grid entrance | Fastest access and repeat visits | No entrance emphasis |
| Together | Whole grid, 240ms / 8px | One restrained introduction | The whole group briefly moves |
| Sequence | Per-column 0/40/80ms stagger | More editorial first impression | Adds a small reading delay |

Use the bottom picker or keys 1–3 / left-right arrows. R replays. The URL preserves the chosen variant. Keyboard replay is deliberate animation demonstration, not a production keyboard interaction.

Main-agent verification, 2026-09-29: all three variants render nine cards with one active picker state; dialog blocks variant swaps and restores trigger focus on Escape; reduced motion uses opacity only; 390px has no horizontal overflow; remounting at scrollY 1000 preserves scrollY 1000. Screenshots captured for all three desktop variants in ignored output/playwright/. Script syntax checked. The prototype header wraps on narrow screens.

No variant has been selected or promoted. The invoked prototype skill reserves selection for the user. Production motion fixes are independent of this optional entrance choice.
