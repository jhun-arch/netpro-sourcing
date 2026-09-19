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

  const name = text(body.name, 160);
  const email = text(body.email, 200);
  const address = text(body.address, 500);
  const payment = text(body.payment, 80);
  const items = sanitizeItems(body.items);
  const subtotal = text(body.subtotal, 40);

  if (!name || !address) return fail(res, 400, 'Please complete all required fields.');
  if (!isEmail(email)) return fail(res, 400, 'Please provide a valid email address.');
  if (!items.length) return fail(res, 400, 'Your enquiry has no products.');

  if (!rateLimitOk(clientIp(req)) || !emailCooldownOk(email)) {
    return fail(res, 429, 'Too many submissions. Please try again in a few minutes.');
  }
  if (isDuplicate(payloadHash(['purchase', name, email, formatItems(items)]))) {
    return res.status(200).json({ ok: true });
  }

  if (!emailConfigReady()) {
    console.error('purchase: email environment variables are not configured');
    return fail(res, 503, 'The enquiry service is not available right now. Please try again later.');
  }

  const internalRows = [
    ['Name', name],
    ['Email', email],
    ['Shipping address', address],
    ['Preferred payment', payment || 'Not specified'],
    ['Requested items', formatItems(items)],
    ['Preview subtotal (customer-reported)', subtotal || 'Not specified'],
    ['Note', 'Purchase enquiry only — no order or payment has been processed. Please confirm availability, shipping, taxes and final payment arrangements.'],
  ];

  const customerRows = [
    ['Requested items', formatItems(items)],
    ['Preview subtotal', subtotal || 'Not specified'],
    ['Shipping address', address],
    ['Preferred payment', payment || 'Not specified'],
  ];

  try {
    await sendEnquiryPair({
      internal: {
        subject: `[Purchase Enquiry] ${line(name, 80)}`,
        html: buildHtml({
          heading: 'New purchase enquiry',
          intro: 'A visitor submitted a purchase enquiry from the checkout preview on the Netpro Sourcing website.',
          rows: internalRows,
          note: `Hit reply to respond directly to ${name}.`,
        }),
        text: buildText({
          heading: 'New purchase enquiry',
          intro: 'A visitor submitted a purchase enquiry from the checkout preview on the Netpro Sourcing website.',
          rows: internalRows,
        }),
      },
      customer: {
        email,
        subject: "We've received your purchase enquiry — Netpro Sourcing",
        html: buildHtml({
          heading: `Hi ${name}, thank you for contacting Netpro Sourcing.`,
          intro:
            "We've received your purchase enquiry and the details you submitted are included below for your reference. Our team will review your requirements and confirm availability, shipping, taxes and final payment arrangements. No order or payment has been processed.",
          rows: customerRows,
          note:
            "If you'd like to add any information, artwork, specifications or other details, simply reply to this email.\n\nBest regards,\nNetpro Sourcing",
        }),
        text: buildText({
          heading: `Hi ${name},`,
          intro:
            "Thank you for contacting Netpro Sourcing.\n\nWe've received your purchase enquiry and the details you submitted are included below for your reference. Our team will review your requirements and confirm availability, shipping, taxes and final payment arrangements. No order or payment has been processed.",
          rows: customerRows,
          note:
            "If you'd like to add any information, artwork, specifications or other details, simply reply to this email.\n\nBest regards,\nNetpro Sourcing",
        }),
      },
    });
  } catch (err) {
    console.error('purchase: send failed', err.code || '', err.detail || err.message);
    return fail(res, 502, 'Your enquiry could not be sent right now. Please try again in a few minutes.');
  }

  return res.status(200).json({ ok: true });
};
