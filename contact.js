document.querySelector('#contact-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const status = document.querySelector('#contact-form-status');
  const button = form.querySelector('button[type=submit]');
  const originalLabel = button.textContent;
  const payload = {
    name: form.elements.name.value,
    email: form.elements.email.value,
    subject: form.elements.subject.value,
    message: form.elements.message.value,
    website: form.elements.website ? form.elements.website.value : '',
  };
  button.disabled = true;
  button.textContent = 'Sending…';
  status.textContent = 'Sending your message…';
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
    form.reset();
    status.textContent = "Thank you. We've received your message and sent a confirmation to your email.";
  } catch (err) {
    status.textContent = err.message && err.message !== 'Request failed'
      ? err.message
      : 'Sorry, your message could not be sent right now. Please try again in a moment.';
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
});
