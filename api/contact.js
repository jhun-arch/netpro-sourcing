const {
  isEmail,
  text,
  line,
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

module.exports = async function handler(req, res) {
  if (!postOnly(req, res)) return;

  const body = readBody(req);
  if (!body) return fail(res, 400, 'Invalid request.');

  // Honeypot: real users never fill this hidden field. Silently accept bots.
  if (text(body.website, 200)) return res.status(200).json({ ok: true });

  const name = text(body.name, 100);
  const email = text(body.email, 200);
  const subject = line(body.subject, 160);
  const message = text(body.message, 5000);

  if (!name || !subject || !message) return fail(res, 400, 'Please complete all required fields.');
  if (!isEmail(email)) return fail(res, 400, 'Please provide a valid email address.');

  // Stable id for this exact submission (same validated data -> same id).
  const submissionId = submissionHash(['contact', name, email, subject, message]);

  // Both emails were already delivered for this submission:
  // safe no-op for legitimate retries and double-clicks.
  if (bothSent(submissionId)) {
    return res.status(200).json({ ok: true });
  }

  if (!rateLimitOk(clientIp(req)) || !emailCooldownOk(email)) {
    return fail(res, 429, 'Too many submissions. Please try again in a few minutes.');
  }

  if (!emailConfigReady()) {
    console.error('contact: email environment variables are not configured');
    return fail(res, 503, 'The enquiry service is not available right now. Please try again later.');
  }

  const rows = [
    ['Name', name],
    ['Email', email],
    ['Subject', subject],
    ['Message', message],
  ];

  try {
    await sendEnquiryPair({
      scope: 'contact',
      submissionId,
      internal: {
        subject: `[Contact] ${subject}`,
        html: buildHtml({
          heading: 'New contact enquiry',
          intro: 'A visitor submitted the Contact Us form on the Netpro Sourcing website.',
          rows,
          note: `Submitted from the website contact form. Hit reply to respond directly to ${name}.`,
        }),
        text: buildText({
          heading: 'New contact enquiry',
          intro: 'A visitor submitted the Contact Us form on the Netpro Sourcing website.',
          rows,
        }),
      },
      customer: {
        email,
        subject: "We've received your message — Netpro Sourcing",
        html: buildHtml({
          heading: `Hi ${name}, thank you for contacting Netpro Sourcing.`,
          intro:
            "We've received your enquiry and the details you submitted are included below for your reference. Our team will review your requirements.",
          rows: [
            ['Subject', subject],
            ['Message', message],
          ],
          note:
            "If you'd like to add any information, artwork, specifications or other details, simply reply to this email.\n\nBest regards,\nNetpro Sourcing",
        }),
        text: buildText({
          heading: `Hi ${name},`,
          intro:
            "Thank you for contacting Netpro Sourcing.\n\nWe've received your enquiry and the details you submitted are included below for your reference. Our team will review your requirements.",
          rows: [
            ['Subject', subject],
            ['Message', message],
          ],
          note:
            "If you'd like to add any information, artwork, specifications or other details, simply reply to this email.\n\nBest regards,\nNetpro Sourcing",
        }),
      },
    });
  } catch (err) {
    // Never leak provider details to the client. If the internal email went
    // out but the confirmation failed, a client retry will only re-attempt
    // the missing confirmation (stable Idempotency-Key + per-email state).
    console.error('contact: send failed', err.code || '', err.detail || err.message);
    return fail(res, 502, 'Your message could not be sent right now. Please try again in a few minutes.');
  }

  // Cooldown is recorded only after BOTH emails were sent.
  markEmailCooldown(email);

  return res.status(200).json({ ok: true });
};
