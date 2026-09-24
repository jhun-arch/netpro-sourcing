# dev2 QA

## Local browser checks
- 10 main pages × 375, 390, 430, 768 and 1440 px: 50 checks passed. No horizontal overflow, broken decoded images or JS exceptions.
- 673 static internal links and anchors checked, all resolve.
- Product → Enquiry → increment quantity → Quote: correct product/size/quantity carried through.
- Product modal and Enquiry at all five widths: no internal horizontal overflow. A real 768px gallery overlap was repaired and Add to Enquiry retested at every width.
- Mobile Shop/Customization menus navigate successfully, including Apparel Printing anchor.
- Contact required-field validation, simulated 502 error with retained text, and success/reset passed.
- Quote invalid file selection, selected-file retention after simulated failure, successful PDF transfer, optional Company and selected items passed.
- Backend tests: attachment signatures, aggregate size, count limits, Company optional and forwarding to existing mail integration passed.
- Existing favicon, single H1, titles, descriptions, canonical and Open Graph present on main pages.
- Screenshots inspected for Home, Shop, About, Quality, mobile Home and mobile Quote.

## Scope and follow-up
Product details remain in the stable existing modal; dedicated product URLs are deferred to a separate routing/SEO change. Existing product images are illustrative references; actual stock, specifications and approved commercial product photography still require business data. No fabricated prices, minimums, production times, testimonials or customer cases were added.

Email UI tests use controlled responses; they are not proof of inbox receipt. Preview endpoint results are recorded in the delivery report after deployment. No Production deployment or main modification is permitted.

## Normal-motion follow-up
A public Preview check found stale Home Story animation references. Removed the retired animation and limited Home-only GSAP initialization to pages with the Home hero. Retested all 10 main pages with normal motion: zero JS exceptions and zero console warnings/errors. Reduced-motion results above remain valid.

## Public Preview acceptance
- Public Preview (28ac367) opened without login. Desktop main pages and Home/Shop/Quote at 375/390/430/768: 22 checks, all HTTP 200, no overflow, no broken images, no console warnings/errors.
- Real Contact submission: HTTP 200 / ok:true; success UI. Real Quote submission with blank Company, selected TEE-WHITE, size/quantity and PNG attachment: HTTP 200 / ok:true; success UI and shortlist cleared. Both marked QA / no action needed, using the existing Netpro contact email. Provider acceptance verified; inbox delivery was not independently observed.
- Category follow-up found non-clothing details lost the information tabs together with the apparel examples. Separated those sections; all 9 catalogue products now pass open → add → remove → close with zero JS errors.
- Social sharing image now uses the existing public hero.png URL (HTTP 200); retained that file in deployment so it also remains available after a future user-controlled release.
- Rapid cross-page navigation exposed a native View Transition cancellation exception. Removed the cross-document transition layer while retaining in-page and modal animation; the Customization → Quote → return flow passes without JS errors.


## Demo visual refinement — 2026-09-22
- Home, Shop, Customization, Quality, About tested at 1440, 390 and 768 CSS pixels in Chromium with normal motion: no horizontal overflow, missing images or console/page errors.
- Desktop and responsive screenshots reviewed for crop, image/text ordering and spacing. At 768px, Customization process/approval and About sample split now stack; rechecked after adjustment.
- 334 local internal link/anchor references validated (Vercel-only legal rewrites checked after deployment).
- Actual mobile navigation: open menu → Customization submenu → Chenille anchor → Request chenille patches → Quote passed.
- Main visible copy reduced approximately: Customization 617 → 396 words; Quality 328 → 248; About 388 → 343 (simple HTML-stripped count).
- Two new AI images inspected for material, hands, text and logos; accepted. New files WebP 228 KB and 135 KB, intrinsic sizes reserved and below-fold images lazy-loaded. Existing six concept images tracked separately with provenance caveat in AI-PLACEHOLDERS.md.
- Home and Shop inspected and retained without source changes. No backend, environment, email, enquiry or quote logic changes.

## Finish QA — 2026-09-23

- Local browser session: `finish-qa` against `http://127.0.0.1:4173/`, using Playwright CLI with Edge at 1440 × 1000, 390 × 844 and 768 × 900. Home, Shop, Customization, Quality, About and Quote were opened at each required viewport. Desktop screenshots and normal-scroll checkpoints are in `output/playwright/finish-qa/` (`home-desktop-*`, `shop-desktop-*`, `custom-desktop-*`, `quality-desktop-*`, `about-desktop-*`, `quote-from-enquiry-desktop.png`); mobile top screenshots are `home-mobile-390-top.png`, `shop-mobile-390-top.png`, `custom-mobile-390-top.png`, `quality-mobile-390-top.png`, `about-mobile-390-top.png`, `quote-mobile-390-top.png` and the matching `*-mobile-768-top.png` files.
- At both mobile widths, every required page reported `document.documentElement.scrollWidth === innerWidth`; the viewed screenshots show the mobile menu, hero crops, form columns and CTA layouts without a severe offset. Home mobile menu opened and exposed Quote, Shop, Customization, Quality, Buying Guide, About and Contact links.
- Loaded-image checks on all six pages returned no completed image with `naturalWidth === 0`. Console checks returned no errors or warnings. Home, Customization and Quality emitted only the browser/tooling info message about lazy images; Shop, About and Quote emitted zero console messages.
- Shop flow evidence: `shop-modal-enquiry.png` shows Basic Hoodie with size `M` and quantity `50` in the enquiry drawer after Request pricing → M → 50 → Add to Enquiry. `quote-from-enquiry-desktop.png` shows `Basic Hoodie · Sky blue · M` and target quantity `50` retained on Quote. No enquiry or quote was submitted.
- Customization normal-scroll screenshots show embroidery, garment printing, all four restored patch cards, the three-step sample review and the final CTA. The sample-review section was confirmed on a fresh cache-busted load after removing its `service-tint` class; `custom-desktop-review-white2.png` shows the intended white background.
- Quality and About normal-scroll screenshots show the real production-line/stitching/hand-finishing evidence, the About hand-finishing hero, the process rows and lower CTAs. Buying Guide FAQ was scrolled and the first item opened; `buying-guide-faq-open2.png` shows its answer rendered. Contact empty-submit validation focused the required Name field in `contact-validation.png`; no network submission was made.
- Remaining scope: this is local visual and interaction QA only. No real contact or quote API/email submission, deployment, or external preview was performed in this session.

## Three-page editorial refinement — 2026-09-24

- Customization now uses a broad headline/support row and panoramic existing studio image; all six techniques and existing anchor IDs remain.
- Quality uses a wide real production hero, a continuous six-stage sequence, the existing real evidence gallery, and aligned documentation/support columns with a quote CTA.
- About retains its real worker hero and adds a desktop sticky process introduction and clearer contact endpoint. Tablet stacking prevents the narrow hero layout.
- Main-agent screenshot review completed at 1440px for all three pages, including final Quality/About endpoint crops; 768px About and 390/768px representative screenshots also reviewed.
- Final local Chromium checks at 1440, 1920, 2560, 768 and 390px (15 page/viewport combinations): no horizontal overflow, broken completed images or page exceptions after scrolling. Existing motion scripts retained; no new animation dependency or JS changes.
- 293 local href/src references resolve; each page keeps one H1 and all prior IDs. Git diff whitespace check passed.
- No new image assets, AI generation, backend, form submission, configuration or AGENTS.md changes in this round. Public Preview acceptance is recorded in the delivery response.
