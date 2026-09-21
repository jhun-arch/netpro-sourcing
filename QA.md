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
