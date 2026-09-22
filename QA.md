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
