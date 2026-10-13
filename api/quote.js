const {
  isEmail,
  text,
  line,
  intInRange,
  clientIp,
  rateLimitOk,
  emailCooldownOk,
  markEmailCooldown,
  submissionHash,
  bothSent,
  emailConfigReady,
  sendEnquiryPair,
  buildHtml,
  buildText,
  postOnly,
  readBody,
  fail,
} = require('./_lib/mail');

const { validateAttachments } = require('./_lib/attachments');
const MAX_ITEMS = 50;
const CUSTOMIZATION_OPTIONS = ['logo', 'material', 'style'];
const VALID_CUSTOMIZATION_OPTIONS = new Set(CUSTOMIZATION_OPTIONS);
const CUSTOMIZATION_LABELS = {
  logo: 'Add a logo',
  material: 'Change color or material',
  style: 'Develop a style',
};

function normalizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length > MAX_ITEMS) return null;

  const items = [];
  for (const value of raw.slice(0, MAX_ITEMS)) {
    const item = value && typeof value === 'object' ? value : {};
    const hasIntent = Object.prototype.hasOwnProperty.call(item, 'intent');
    const hasCustomization = Object.prototype.hasOwnProperty.call(item, 'customization');
    const hasNotes = Object.prototype.hasOwnProperty.call(item, 'notes');

    // An explicit but unknown intent must not silently become a stock request.
    if (hasIntent && item.intent !== 'stock' && item.intent !== 'custom') return null;
    if (hasCustomization && !Array.isArray(item.customization)) return null;
    if (hasNotes && typeof item.notes !== 'string') return null;

    const suppliedOptions = hasCustomization ? item.customization : [];
    const selectedOptions = new Set();
    for (const option of suppliedOptions) {
      if (typeof option !== 'string' || !VALID_CUSTOMIZATION_OPTIONS.has(option)) return null;
      selectedOptions.add(option);
    }

    const normalizedNotes = line(hasNotes ? item.notes : '', 500);
    const intent = hasIntent ? item.intent : 'stock';

    // A legacy entry without intent is stock only when it carries no custom
    // request details. This avoids mislabelling an omitted/malformed custom intent.
    if (!hasIntent && (selectedOptions.size || normalizedNotes)) return null;

    items.push({
      name: line(item.name, 120),
      sku: line(item.sku, 80),
      color: line(item.color, 60),
      size: line(item.size, 30),
      quantity: intInRange(item.quantity, 1, 1000000) || 1,
      intent,
      customization: intent === 'custom'
        ? CUSTOMIZATION_OPTIONS.filter((option) => selectedOptions.has(option))
        : [],
      notes: intent === 'custom' ? normalizedNotes : '',
    });
  }

  return items.filter((item) => item.name);
}

function formatItems(items) {
  if (!items.length) return 'See project brief';
  return items.map((item) => {
    const kind = item.intent === 'custom' ? 'Custom request' : 'Ready stock';
    const details = [
      kind,
      item.name,
      item.sku || '-',
      item.color || '-',
      item.size || '-',
      `${item.quantity} units`,
    ];

    if (item.intent === 'custom') {
      const options = item.customization.length
        ? item.customization.map((option) => CUSTOMIZATION_LABELS[option]).join(', ')
        : 'None selected';
      details.push(`Customization: ${options}`);
      details.push(`Notes: ${item.notes || '-'}`);
    }

    return details.join(' | ');
  }).join('\n');
}

module.exports = async function handler(req, res) {
  if (!postOnly(req, res)) return;

  const body = readBody(req, 3 * 1024 * 1024);
  if (!body) return fail(res, 400, 'Invalid request.');

  // Honeypot: silently accept bots.
  if (text(body.website, 200)) return res.status(200).json({ ok: true });

  let attachments;
  try { attachments = validateAttachments(body.attachments); } catch { return fail(res, 400, "Use JPG, PNG, PDF or ZIP files, up to 2 MB in total (maximum 3 files)."); }
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
  let brief = text(body.brief, 5000);
  const items = normalizeItems(body.items);
  if (items === null) return fail(res, 400, 'Please check the selected product details.');
  if (!brief && items.length) brief = 'Please review the selected products below.';
  const shortlist = formatItems(items);

  if (!name || !destination || !brief) {
    return fail(res, 400, 'Please complete all required fields.');
  }
  if (!isEmail(email)) return fail(res, 400, 'Please provide a valid email address.');
  if (quantity === null) return fail(res, 400, 'Please provide a valid target quantity.');

  // Stable id for this exact submission (same validated data -> same id).
  const submissionId = submissionHash([
    'quote', company, name, email, destination, project, quantity,
    decoration, date, sample, budget, artwork, brief, shortlist, JSON.stringify(attachments),
  ]);

  // Both emails were already delivered for this submission:
  // safe no-op for legitimate retries and double-clicks.
  if (bothSent(submissionId)) {
    return res.status(200).json({ ok: true });
  }

  if (!rateLimitOk(clientIp(req)) || !emailCooldownOk(email)) {
    return fail(res, 429, 'Too many submissions. Please try again in a few minutes.');
  }

  if (!emailConfigReady()) {
    console.error('quote: email environment variables are not configured');
    return fail(res, 503, 'The enquiry service is not available right now. Please try again later.');
  }

  const na = 'Not specified';

  const internalRows = [
    ['Company', company],
    ['Name', name],
    ['Email', email],
    ['Delivery country / region', destination],
    ['Project type', project || na],
    ['Total target quantity', String(quantity)],
    ['Customization', decoration || na],
    ['Target delivery date', date || na],
    ['Sample requirement', sample || na],
    ['Target budget', budget || na],
    ['Artwork / reference link', artwork || na],
    ['Attached files', attachments.map(a=>a.filename).join(', ') || na],
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
      scope: 'quote',
      submissionId,
      internal: {
        attachments,
        subject: `[Quote] Bulk & custom enquiry — ${line(company || name, 80)}`,
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
    // Never leak provider details. On partial failure a client retry only
    // re-attempts the missing email (stable Idempotency-Key + per-email state).
    console.error('quote: send failed', err.code || '', err.detail || err.message);
    return fail(res, 502, 'Your enquiry could not be sent right now. Please try again in a few minutes.');
  }

  // Cooldown is recorded only after BOTH emails were sent.
  markEmailCooldown(email);

  return res.status(200).json({ ok: true });
};
