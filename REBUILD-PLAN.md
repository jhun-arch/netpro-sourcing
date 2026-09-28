# Six inner pages rebuild

Branch: `codex/about-pages-rebuild`, based on dev2 commit `5eeb6ce`. Desktop is the primary design target; mobile receives basic functional adaptation. Main and Production are outside scope.

## Reference mapping

Reference pages are structural inspiration only. All copy and generated imagery are original to this preview.

| Netpro page | Reference | Section sequence |
|---|---|---|
| Case Studies | https://www.thestudio.com/case-studies/ | Intro, three-column image-led project grid, project details, enquiry CTA |
| About | https://www.thestudio.com/about/ | Image hero, breadcrumb/category strip, introduction, paired images, sourcing band, wide image, story, FAQ, contact |
| How It Works | https://www.thestudio.com/how-it-works/ | Image hero, process introduction, five alternating circular-image steps, help band, editorial cards, contact |
| What We Do | https://www.thestudio.com/what-we-do/ | Centered image hero, category strip, mission, expertise split, craft image band, details, design split, delivery band, final CTA |
| Custom Product Manufacturing | https://www.thestudio.com/custom-product-manufacturing/ | Split hero, products, benefits, five steps, preparation grid, development stories, pitfalls, illustrative projects, product selection, FAQ, CTA |
| Trends Digest | https://www.thestudio.com/trends-digest/ | Campaign hero, editorial introduction, dark four-card benefits, three trend stories, downloadable original digest |

## Design and implementation

Preserve Netpro's existing typography, blue palette, logo, quote journey and footer. Use a 1248px wide desktop grid and a 990px reading container, generous section spacing, purposeful image crops, and reference-specific page rhythms. Shared vanilla CSS/JS keeps the current static stack intact.

Navigation uses About and links to all six pages. Project cards disclose concept details; FAQ uses native disclosure; Trends Digest offers a real text download. No fabricated client logos, results, ratings, statistics, or facility claims. Case Studies is clearly marked illustrative.

Ten new generated photographs share navy, dusty blue, cream and cool gray, with real textile texture. The complete asset and prompt record is in AI-PLACEHOLDERS.md. Reference screenshots remain local evidence, outside deployable assets.

## Acceptance

Review all six pages at desktop width; verify image decoding, internal links, navigation, dialogs, FAQ and download. Smoke-check mobile for overflow, navigation and major functionality. Publish only a branch Preview and await user review before any further release action.
