# Netpro Sourcing

Legacy static HTML/CSS/JavaScript B2B catalogue plus an isolated Next.js App Router + Sanity homepage pilot; existing Vercel Node.js enquiry endpoints remain in place.

> **Next.js + Sanity pilot:** this worktree is the isolated `experiment/nextjs-sanity` branch. Preview deployment `dpl_54zLN8oPGBhz8ctaheqNr2yyqMDU` is at `https://netprosourcing-lv5bxija4-junhil.vercel.app`; its stable branch alias is `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app`. Production remains the legacy site at `https://netprosourcing-qqoyodtgw-junhil.vercel.app` (`dpl_ErniJL5W5ypaPdUE6kmAidi91uMF`, source SHA `9341d2eec51667abd334ec5064b9db6b992af1bf`). The homepage is the only CMS pilot; product and mail flows are not declared migrated. See [docs/NEXTJS-SANITY-MIGRATION.md](docs/NEXTJS-SANITY-MIGRATION.md) for verified status and boundaries.

## Development

The Next.js + Sanity experiment lives at `D:\Users\Administrator\Documents\ChatGPT\NetPro-nextjs-sanity` on `experiment/nextjs-sanity`. Run `npm run dev` for the App Router pilot; `npm run typecheck`, `npm run test`, `npm run cms:test`, and `npm run cms:render-test` run local checks. `npm run build` includes a guard that rejects an unsafe Vercel target. The ignored local `.env.local` uses `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN`, and `SANITY_API_WRITE_TOKEN`; write access is only needed for the controlled seed/live-verification scripts. Never copy token values into docs or client code. See [the migration guide](docs/NEXTJS-SANITY-MIGRATION.md) for boundaries, status, and validation evidence.

For the legacy static pages, `python -m http.server 8765` still serves the source tree. `node --test tests/quote.test.js` verifies attachment validation and quote integration without sending email.

## Enquiry flow
Shop product details → choose Ready stock or Custom request → Add to Enquiry → edit requests → submit one Quote. Customization pages add custom requests directly; headwear and socks overviews first offer a style picker. Both paths use the shared `enquiry-state.js` module and existing `netpro-b2b-enquiry` browser storage. Legacy records default to stock; stock and custom requirements remain separate lines. A project brief is optional when the shortlist contains products. Product prices are requested through quotation. Retired checkout bookmarks redirect to the quote page.

Contact and Quote retain existing QQ SMTP / Resend delivery and idempotency. Artwork is submitted with the quote and attached to the internal notification. JPG/JPEG, PNG, PDF and ZIP: maximum 3 files, 2 MB combined. The server checks size, extension and file signature; attachments are included in the submission hash. Larger artwork can use the reference-link field. No new environment variables are needed. Existing values are managed in Vercel; never commit secrets.

## Deployment
The legacy static source is `D:/Users/Administrator/Documents/ChatGPT/NetPro-sourcing-dev2`, on `codex/shared-enquiry-flow`. This experiment uses the worktree and Preview URL listed above. Commit, push, or deploy only when the current task explicitly authorizes it. Production deployment, promotion, and merges to `main` require explicit authorization.

See AUDIT.md for baseline, FACTORY-IMAGES.md for photo provenance, and QA.md for checks. Original source imagery is retained; web pages reference WebP copies.

## Mail attachment references
- https://nodemailer.com/message/attachments
- https://resend.com/docs/send-with-attachments
