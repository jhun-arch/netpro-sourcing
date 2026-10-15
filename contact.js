document.querySelector('#contact-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const status = document.querySelector('#contact-form-status');
  const button = form.querySelector('button[type=submit]');
  const originalLabel = button.textContent;
  const setStatus = (kind, msg) => {
    status.className = 'form-status' + (kind ? ' is-' + kind : '');
    status.textContent = msg;
  };
  const payload = {
    name: form.elements.name.value,
    email: form.elements.email.value,
    subject: form.elements.subject.value,
    message: form.elements.message.value + (form.elements.company.value ? '\nCompany: ' + form.elements.company.value : ''),
    website: form.elements.website ? form.elements.website.value : '',
  };
  const receiptSource = {
    ...payload,
    company: form.elements.company.value,
    message: form.elements.message.value,
  };
  const confirmation = window.NetproSubmissionConfirmation;
  button.disabled = true;
  button.textContent = 'Sending…';
  setStatus('sending', 'Sending your message…');
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error((data && data.error) || 'Request failed');
    }
    const result = await res.json().catch(() => null);
    const reference = confirmation?.isReference?.(result?.reference) ? result.reference : '';
    const receipt = confirmation?.prepare('contact', {
      ...receiptSource,
      reference,
    }) || null;
    form.reset();
    if (!confirmation?.complete(receipt)) {
      setStatus('success', '✓ Message sent successfully. A confirmation email has been sent to your inbox.');
    }
  } catch (err) {
    setStatus('error', err.message && err.message !== 'Request failed'
      ? err.message
      : 'Sorry, your message could not be sent right now. Please try again in a moment.');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
});
