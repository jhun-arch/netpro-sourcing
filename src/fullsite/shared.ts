import { load } from 'cheerio';
import { createDataAttribute } from 'next-sanity';
import { SANITY_DATASET, SANITY_PROJECT_ID } from '../cms/client';
import { SANITY_STUDIO_BASE_PATH } from '../sanity/urls';
import type { SiteSettingsDocument, SiteSettingSlot, SiteFooterLink } from './types';
import { SITE_HEADER_BINDINGS, SITE_FOOTER_LINK_BINDINGS } from './siteSettingsBindings';
export { SITE_HEADER_BINDINGS, SITE_FOOTER_LINK_BINDINGS } from './siteSettingsBindings';

export class SiteSettingsRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteSettingsRenderError';
  }
}

function safeHref(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f\\]/.test(href) || href.startsWith('//')) {
    throw new SiteSettingsRenderError('全站设置中的链接格式不安全。');
  }
  if (/^https:\/\//i.test(href)) {
    try { const url = new URL(href); if (url.hostname) return url.toString(); } catch { /* normalized below */ }
    throw new SiteSettingsRenderError('全站设置中的外部链接必须使用 HTTPS。');
  }
  if (/^mailto:/i.test(href) && /^mailto:[^\s<>@]+@[^\s<>@]+(?:\?[^\s<>]*)?$/i.test(href)) return href;
  if (/^tel:/i.test(href) && /^tel:[+0-9(). -]+$/i.test(href)) return href;
  if (/^(?:\/|#|\.{1,2}\/)?[a-z0-9][a-z0-9._~/%?&=+#-]*$/i.test(href)) return href;
  throw new SiteSettingsRenderError('全站设置中的链接必须是站内路径、电话、邮箱或 HTTPS 地址。');
}

function setLabel($: ReturnType<typeof load>, target: any, value: string): void {
  const node = target.get(0);
  if (!node) return;
  const textNodes: any[] = [];
  const visit = (child: any) => {
    if (child.type === 'text') { if (String(child.data ?? '').trim()) textNodes.push(child); return; }
    if (child.type !== 'tag' || child.tagName === 'svg' || child.attribs?.['aria-hidden'] === 'true') return;
    for (const nested of child.children ?? []) visit(nested);
  };
  for (const child of node.children ?? []) visit(child);
  if (textNodes.length) {
    textNodes[0].data = value;
    for (const extra of textNodes.slice(1)) extra.data = '';
  } else target.prepend(value);
  void $;
}

function bindData(target: any, path: Array<string | number | { _key: string }>, preview: boolean): void {
  if (!preview) return;
  target.attr('data-sanity', createDataAttribute({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    id: 'siteSettings',
    type: 'siteSettings',
    baseUrl: SANITY_STUDIO_BASE_PATH,
    path: path as never,
  }).toString());
}

function settingSlotMap(settings: SiteSettingsDocument | null | undefined): Map<string, SiteSettingSlot> {
  return new Map((settings?.navigation?.slots ?? []).map((slot) => [slot.bindingId, slot]));
}

function updateHeader(html: string, settings: SiteSettingsDocument | null | undefined, preview: boolean): string {
  const $ = load(html, {}, false);
  const slots = settingSlotMap(settings);
  for (const binding of SITE_HEADER_BINDINGS) {
    const slot = slots.get(binding.bindingId);
    if (!slot) continue;
    if ('sourceHref' in binding) {
      const targets = $('header .desktop-nav a, header .mobile-nav a').filter((_, element) => $(element).attr('href') === binding.sourceHref);
      targets.each((_, element) => {
        const target = $(element);
        if (slot.linkLabel) setLabel($, target, slot.linkLabel);
        if (slot.href) target.attr('href', safeHref(slot.href));
        const field = slot.linkLabel ? 'linkLabel' : 'href';
        bindData(target, ['navigation', 'slots', { _key: slot._key }, field], preview);
      });
      if (binding.bindingId === 'header-shop') {
        $('header .mobile-nav details').filter((_, element) => $(element).find('a[href^="shop.html?category="]').length > 0)
          .find('summary').each((_, element) => {
            const target = $(element);
            if (slot.linkLabel) setLabel($, target, slot.linkLabel);
            bindData(target, ['navigation', 'slots', { _key: slot._key }, 'linkLabel'], preview);
          });
      }
      continue;
    }
    if ('tab' in binding) {
      $(`header button[data-customization-tab="${binding.tab}"]`).each((_, element) => {
        if (slot.text) setLabel($, $(element), slot.text);
        bindData($(element), ['navigation', 'slots', { _key: slot._key }, 'text'], preview);
      });
      continue;
    }
    $('header button.nav-trigger').each((_, element) => {
      const target = $(element);
      if (target.attr('aria-controls') === 'nav-panel-1' || target.closest('.nav-group').find('[data-customization-menu]').length) {
        if (slot.text) setLabel($, target, slot.text);
        bindData(target, ['navigation', 'slots', { _key: slot._key }, 'text'], preview);
      }
    });
    $('header .mobile-nav details').filter((_, element) => $(element).find('a[href="custom-t-shirts.html"]').length > 0)
      .find('summary').each((_, element) => {
        const target = $(element);
        if (slot.text) setLabel($, target, slot.text);
        bindData(target, ['navigation', 'slots', { _key: slot._key }, 'text'], preview);
      });
  }
  const aboutSlot = slots.get('header-about');
  if (aboutSlot?.linkLabel) {
    $('header .mobile-nav details').filter((_, element) => $(element).find('a[href="about.html"]').length > 0)
      .find('summary').each((_, element) => {
        setLabel($, $(element), aboutSlot.linkLabel!);
        bindData($(element), ['navigation', 'slots', { _key: aboutSlot._key }, 'linkLabel'], preview);
      });
    $('header button.nav-trigger[aria-controls="nav-panel-2"]').each((_, element) => {
      const target = $(element);
      setLabel($, target, aboutSlot.linkLabel!);
      bindData(target, ['navigation', 'slots', { _key: aboutSlot._key }, 'linkLabel'], preview);
    });
  }
  return $.root().html() || '';
}

/** Updates only fixed shared-header bindings; fragment parsing preserves the caller's surrounding document. */
export function applySiteHeaderSettings(
  templateHtml: string,
  settings: SiteSettingsDocument | null | undefined,
  preview = false,
): string {
  return updateHeader(templateHtml, settings, preview);
}

function setText($: ReturnType<typeof load>, selector: string, value: string | undefined, preview: boolean, path?: Array<string | number | { _key: string }>): void {
  if (value === undefined) return;
  const target = $(selector).first();
  if (target.length) {
    setLabel($, target, value);
    if (path) bindData(target, path, preview);
  }
}

function setAddressLines($: ReturnType<typeof load>, selector: string, lines: string[] | undefined, preview: boolean): void {
  if (!lines) return;
  const target = $(selector).first();
  if (!target.length) return;
  target.empty();
  lines.forEach((line, index) => {
    if (index) target.append('<br>');
    target.append($('<span>').text(line).contents());
  });
  bindData(target, ['footer', 'addressLines'], preview);
}

function updateLinkBySource($: ReturnType<typeof load>, selector: string, sourceHref: string, link: SiteFooterLink, columnKey: string, preview: boolean): void {
  if (!link.label && !link.href) return;
  $(selector).filter((_, element) => $(element).attr('href') === sourceHref).each((_, element) => {
    const target = $(element);
    if (link.label) setLabel($, target, link.label);
    if (link.href) target.attr('href', safeHref(link.href));
    bindData(target, ['footer', 'columns', { _key: columnKey }, 'links', { _key: link._key }, link.label ? 'label' : 'href'], preview);
  });
}

/** Applies the 37 legacy page footers. The homepage renderer intentionally keeps homePage.footer. */
export function applySiteFooterSettings(
  templateHtml: string,
  settings: SiteSettingsDocument | null | undefined,
  preview = false,
): string {
  const footer = settings?.footer;
  if (!footer) return templateHtml;
  const $ = load(templateHtml, {}, false);
  setText($, 'footer .home-footer-brand > p', footer.description, preview, ['footer', 'description']);
  setText($, '#home-footer-collective-title', footer.newsletterTitle, preview, ['footer', 'newsletterTitle']);
  setText($, '.home-footer-subscribe > p', footer.newsletterDescription, preview, ['footer', 'newsletterDescription']);
  if (footer.emailPlaceholder !== undefined) {
    const input = $('footer .footer-signup input').first();
    input.attr('placeholder', footer.emailPlaceholder);
    bindData(input, ['footer', 'emailPlaceholder'], preview);
  }
  setText($, 'footer .footer-signup-button', footer.subscribeLabel, preview, ['footer', 'subscribeLabel']);
  if (footer.contactEmail) {
    const email = $('footer .contact-email').first();
    email.attr('href', safeHref(`mailto:${footer.contactEmail}`));
    setLabel($, email, footer.contactEmail);
    bindData(email, ['footer', 'contactEmail'], preview);
  }
  if (footer.managerLabel !== undefined || footer.managerName !== undefined) {
    const manager = $('footer .contact-person').first();
    const current = manager.text();
    const role = footer.managerLabel ?? current.split(':')[0];
    const name = footer.managerName ?? current.split(':').slice(1).join(':').trim();
    setLabel($, manager, `${role}: ${name}`);
    bindData(manager, ['footer', footer.managerLabel !== undefined ? 'managerLabel' : 'managerName'], preview);
  }
  setAddressLines($, 'footer .home-footer-contact address', footer.addressLines, preview);
  for (const social of footer.socialLinks ?? []) {
    const target = $(`footer [data-social="${social.slug}"]`).first();
    if (target.length) {
      target.attr('href', safeHref(social.href));
      target.attr('aria-label', social.label);
      bindData(target, ['footer', 'socialLinks', { _key: social._key }, 'href'], preview);
    }
  }
  const columns = new Map((footer.columns ?? []).map((column) => [column.slug, column]));
  for (const [slug, selector] of [
    ['products', 'footer .footer-products'], ['patches', 'footer .footer-custom-patches'],
    ['company', 'footer .footer-company'], ['support', 'footer .footer-support'],
  ]) {
    const column = columns.get(slug);
    if (!column) continue;
    setText($, `${selector} h2`, column.title, preview, ['footer', 'columns', { _key: column._key }, 'title']);
    for (const link of column.links ?? []) {
      const source = SITE_FOOTER_LINK_BINDINGS.find((binding) => binding.slug === link.slug)?.sourceHref;
      if (source) updateLinkBySource($, `${selector} a`, source, link, column._key, preview);
    }
  }
  setText($, 'footer .home-footer-bottom > span:first-child', footer.copyright, preview, ['footer', 'copyright']);
  if (footer.legalLink) {
    const target = $('footer .home-footer-legal a').first();
    if (footer.legalLink.label) setLabel($, target, footer.legalLink.label);
    if (footer.legalLink.href) target.attr('href', safeHref(footer.legalLink.href));
    bindData(target, ['footer', 'legalLink', footer.legalLink.label ? 'label' : 'href'], preview);
  }
  setText($, 'footer .home-footer-legal > span', footer.tagline, preview, ['footer', 'tagline']);
  return $.root().html() || '';
}

export function applySiteHeaderAndFooter(
  html: string,
  settings: SiteSettingsDocument | null | undefined,
  preview = false,
): string {
  return applySiteFooterSettings(applySiteHeaderSettings(html, settings, preview), settings, preview);
}
