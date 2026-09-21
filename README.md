# Netpro Sourcing

Static HTML/CSS/JavaScript B2B catalogue with Vercel Node.js enquiry endpoints.

## Development
Run `python -m http.server 8765` for static pages. Use Vercel Preview for serverless endpoint verification. `node --test tests/quote.test.js` verifies attachment validation and quote integration without sending email.

## Enquiry flow
Product details → Add to Enquiry → quantity/remove → Request a Quote. Existing `netpro-b2b-enquiry` browser storage remains in use. Product prices are requested through quotation. Retired checkout bookmarks redirect to the quote page.

Contact and Quote retain existing QQ SMTP / Resend delivery and idempotency. Artwork is submitted with the quote and attached to the internal notification. JPG/JPEG, PNG, PDF and ZIP: maximum 3 files, 2 MB combined. The server checks size, extension and file signature; attachments are included in the submission hash. Larger artwork can use the reference-link field. No new environment variables are needed. Existing values are managed in Vercel; never commit secrets.

## Deployment
This task uses branch `dev2`, based on `c1ef6c4`. Push only `origin/dev2`. `vercel deploy` creates Preview; do not use `--prod`, promote, or merge main.

See AUDIT.md for baseline, FACTORY-IMAGES.md for photo provenance, and QA.md for checks. Original source imagery is retained; web pages reference WebP copies.

## Mail attachment references
- https://nodemailer.com/message/attachments
- https://resend.com/docs/send-with-attachments
