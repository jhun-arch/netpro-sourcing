const {
  isEmail,
  text,
  line,
  intInRange,
  clientIp,
  rateLimitOk,
  emailCooldownOk,
  isDuplicate,
  payloadHash,
  emailConfigReady,
  sendEnquiryPair,
  buildHtml,
  buildText,
  postOnly,
  readBody,
  fail,
} = require('./_lib/mail');

const MAX_ITEMS = 50;

function sanitizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_ITEMS).map((x) => {
    const item = x && typeof x === 'object' ? x : {};
    return {
      name: text(item.name, 120),
      color: text(item.color, 60),
      size: text(item.size, 30),
      quantity: intInRange(item.quantity, 1, 1000000) || 1,
    };
  }).filter((x) => x.name);
}

function formatItems(items) {
  if (!items.length) return 'See project brief';
  return items
    .map((x) => `${x.name} | ${x.color || '-'} | ${x.size || '-'} | ${x.quantity} units`)
    .join('\n');
}

module.exports = async function handler(req, res) {
  if (!postOnly(req, res)) return;

  const body = readBody(req);
  if (!body) return fail(res, 400, 'Invalid request.');

  // Honeypot: silently accept bots.
  if (text(body.website, 200)) return res.status(200).json({ ok: true });

  const company = text(body.company, 120);
  const name = text(body.name, 100);
  const email = text(body.email, 200);
  const destination = text(body.destination, 120);
  const project = text(body.project, 80);
  const quantity = intInRange(body.quantity, 1, 10000000);
  const decoration = text(body.decoration, 80);
  const date = text(body.date, 40);
  const sample = text(body.sample, 60);
  const budget = text(body.budget, 100);
  const artwork = text(body.artwork, 2000);
  const brief = text(body.brief, 5000);
  const items = sanitizeItems(body.items);

  if (!company || !name || !destination || !brief) {
    return fail(res, 400, 'Please complete all required fields.');
  }
  if (!isEmail(email)) return fail(res, 400, 'Please provide a valid email address.');
  if (quantity === null) return fail(res, 400, 'Please provide a valid target quantity.');

  if (!rateLimitOk(clientIp(req)) || !emailCooldownOk(email)) {
    return fail(res, 429, 'Too many submissions. Please try again in a few minutes.');
  }
  if (isDuplicate(payloadHash(['quote', company, email, brief, quantity]))) {
    return res.status(200).json({ ok: true });
  }

  if (!emailConfigReady()) {
    console.error('quote: email environment variables are not configured');
    return fail(res, 503, 'The enquiry service is not available right now. Please try again later.');
  }

  const shortlist = formatItems(items);
  const na = 'Not specified';

  const internalRows = [
    ['Company', company],
    ['Name', name],
    ['Work email', email],
    ['Delivery country / region', destination],
    ['Project type', project || na],
    ['Total target quantity', String(quantity)],
    ['Customization', decoration || na],
    ['Target delivery date', date || na],
    ['Sample requirement', sample || na],
    ['Target budget', budget || na],
    ['Artwork / reference link', artwork || na],
    ['Project brief', brief],
    ['Product shortlist', shortlist],
  ];

  const customerRows = [
    ['Company', company],
    ['Project type', project || na],
    ['Total target quantity', String(quantity)],
    ['Customization', decoration || na],
    ['Product shortlist', shortlist],
    ['Project brief', brief.length > 800 ? brief.slice(0, 800) + '…' : brief],
  ];

  try {
    await sendEnquiryPair({
      internal: {
        subject: `[Quote] Bulk & custom enquiry — ${line(company, 80)}`,
        html: buildHtml({
          heading: 'New bulk & custom enquiry',
          intro: 'A visitor submitted the Request a Quote form on the Netpro Sourcing website.',
          rows: internalRows,
          note: `Submitted from the website quote form. Hit reply to respond directly to ${name} (${company}).`,
        }),
        text: buildText({
          heading: 'New bulk & custom enquiry',
          intro: 'A visitor submitted the Request a Quote form on the Netpro Sourcing website.',
          rows: internalRows,
        }),
      },
      customer: {
        email,
        subject: "We've received your enquiry — Netpro Sourcing",
        html: buildHtml({
          heading: `Hi ${name}, thank you for contacting Netpro Sourcing.`,
          intro:
            "We've received your enquiry and the details you submitted are included below for your reference. Our team will review your requirements.",
          rows: customerRows,
          note:
            "If you'd like to add artwork, specifications or any other information, simply reply to this email.\n\nBest regards,\nNetpro Sourcing",
        }),
        text: buildText({
          heading: `Hi ${name},`,
          intro:
            "Thank you for contacting Netpro Sourcing.\n\nWe've received your enquiry and the details you submitted are included below for your reference. Our team will review your requirements.",
          rows: customerRows,
          note:
            "If you'd like to add artwork, specifications or any other information, simply reply to this email.\n\nBest regards,\nNetpro Sourcing",
        }),
      },
    });
  } catch (err) {
    console.error('quote: send failed', err.code || '', err.detail || err.message);
    return fail(res, 502, 'Your enquiry could not be sent right now. Please try again in a few minutes.');
  }

  return res.status(200).json({ ok: true });
};
