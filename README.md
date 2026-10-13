# Netpro Sourcing

Static HTML/CSS/JavaScript B2B catalogue with Vercel Node.js enquiry endpoints.

## Development
Run `python -m http.server 8765` for static pages. Use Vercel Preview for serverless endpoint verification. `node --test tests/quote.test.js` verifies attachment validation and quote integration without sending email.

## Enquiry flow
Shop product details → choose Ready stock or Custom request → Add to Enquiry → edit requests → submit one Quote. Customization pages add custom requests directly; headwear and socks overviews first offer a style picker. Both paths use the shared `enquiry-state.js` module and existing `netpro-b2b-enquiry` browser storage. Legacy records default to stock; stock and custom requirements remain separate lines. A project brief is optional when the shortlist contains products. Product prices are requested through quotation. Retired checkout bookmarks redirect to the quote page.

Contact and Quote retain existing QQ SMTP / Resend delivery and idempotency. Artwork is submitted with the quote and attached to the internal notification. JPG/JPEG, PNG, PDF and ZIP: maximum 3 files, 2 MB combined. The server checks size, extension and file signature; attachments are included in the submission hash. Larger artwork can use the reference-link field. No new environment variables are needed. Existing values are managed in Vercel; never commit secrets.

## Deployment
Website source repository: `D:/Users/Administrator/Documents/ChatGPT/NetPro-sourcing-dev2`. The shared stock/custom enquiry flow is developed on `codex/shared-enquiry-flow`. Commit, push, or deploy only when the current task explicitly authorizes it. Production deployment, promotion, and merges to `main` require explicit authorization.

See AUDIT.md for baseline, FACTORY-IMAGES.md for photo provenance, and QA.md for checks. Original source imagery is retained; web pages reference WebP copies.

## Mail attachment references
- https://nodemailer.com/message/attachments
- https://resend.com/docs/send-with-attachments
