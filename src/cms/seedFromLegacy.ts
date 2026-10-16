import { load } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { CheerioAPI } from 'cheerio';
import { addArrayItemTypesToSeed } from './arrayItemTypes';
import type { HomePageDocument, SanityImage } from './types';

export type LegacyImage = { __legacyImage: true; path: string; alt: string };
type Seedify<T> = T extends SanityImage
  ? LegacyImage
  : T extends readonly (infer Item)[]
    ? Seedify<Item>[]
    : T extends object
      ? { [Key in keyof T]: Seedify<T[Key]> }
      : T;

export type LegacyHomePageSeed = Seedify<Omit<HomePageDocument, '_rev'>>;
export type HomePageSeedDocument = Omit<HomePageDocument, '_rev'>;

const benefitSlugs = [
  'product-choices',
  'custom-decoration',
  'digital-proof-review',
  'clear-specifications',
  'production-follow-up',
  'delivery-planning',
] as const;

const faqSlugs: Record<string, string> = {
  'home-faq-question-1': 'stock-without-customization',
  'home-faq-question-2': 'project-brief-details',
  'home-faq-question-3': 'minimum-order-quantity',
  'home-faq-question-4': 'digital-artwork-proof',
  'home-faq-question-5': 'artwork-file-guidance',
  'home-faq-question-6': 'delivery-timing',
};

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function requireText($: CheerioAPI, selector: string): string {
  const value = clean($(selector).first().text());
  if (!value) throw new Error(`Legacy homepage content is missing: ${selector}`);
  return value;
}

function requireHref($: CheerioAPI, selector: string): string {
  const value = clean($(selector).first().attr('href'));
  if (!value) throw new Error(`Legacy homepage link is missing: ${selector}`);
  return value;
}

function splitLines($: CheerioAPI, selector: string): string[] {
  const html = $(selector).first().html();
  if (!html) throw new Error(`Legacy homepage heading is missing: ${selector}`);
  const lines = html
    .split(/<br\s*\/?\s*>/i)
    .map((line) => clean(load(`<div>${line}</div>`)('div').text()))
    .filter(Boolean);
  if (lines.length < 2) throw new Error(`Expected at least two lines in ${selector}`);
  return lines;
}

function assetPath(source: string | undefined, label: string): string {
  if (!source) throw new Error(`Legacy homepage image is missing: ${label}`);
  const pathname = source.startsWith('http') ? new URL(source).pathname : source;
  const normalized = pathname.replace(/^\//, '').replace(/\\/g, '/');
  if (!normalized.startsWith('assets/') || normalized.split('/').includes('..')) {
    throw new Error(`Only tracked files under assets/ can be seeded (${label}).`);
  }
  return normalized;
}

function image(source: string | undefined, alt: string | undefined, label: string): LegacyImage {
  return { __legacyImage: true, path: assetPath(source, label), alt: clean(alt) };
}

function cssCategoryImage(css: string, category: string): string {
  const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = new RegExp(`\\.home-page\\s+\\.category\\[data-category=['"]${escaped}['"]\\][^{]*\\{([^}]*)\\}`, 'i');
  const block = css.match(rule)?.[1];
  const src = block?.match(/background-image\s*:\s*url\((?:['"])?([^)'"\s]+)(?:['"])?\)/i)?.[1];
  return assetPath(src, `category ${category} CSS background`);
}

function stableSlug(value: string, label: string): string {
  const slug = value.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (slug.length < 3) throw new Error(`Could not derive a stable source identity for ${label}.`);
  return slug;
}

function keyed<T>(slug: string, fields: T): T & { _key: string; slug: string } {
  return { ...fields, _key: `k-${slug}`, slug };
}

export function extractHomepageSeed(html: string, css: string): LegacyHomePageSeed {
  const $ = load(html);
  const categories = $('.home-story .category').toArray();
  const processImages = $('.home-process-image').toArray();
  const steps = $('.home-process-step').toArray();
  const startingPoints = $('.home-starting-points .process-card').toArray();
  const gallery = $('.home-about-gallery-group [data-gallery-item]').toArray();
  const benefits = $('[data-why-item]').toArray();
  const faqs = $('[data-faq-list] .home-faq-item').toArray();
  const footerSocials = $('.footer-social-links [data-social]').toArray();
  const footerColumns = $('.home-footer-middle .footer-column').toArray();

  const expectCount = (items: unknown[], expected: number, label: string) => {
    if (items.length !== expected) throw new Error(`Expected ${expected} ${label}; found ${items.length}.`);
  };
  expectCount(categories, 4, 'collection categories');
  expectCount(processImages, 3, 'process images');
  expectCount(steps, 3, 'process steps');
  expectCount(startingPoints, 2, 'starting-point cards');
  expectCount(benefits, benefitSlugs.length, 'benefits');
  expectCount(faqs, Object.keys(faqSlugs).length, 'FAQ items');
  expectCount(footerColumns, 4, 'footer columns');

  const getSocialIconKey = (node: AnyNode) => clean($(node).attr('data-social')).toLowerCase();
  const rawOgImage = $('meta[property="og:image"]').attr('content') ?? '/assets/hero.png';
  const ogAlt = $('meta[property="og:image:alt"]').attr('content') ?? 'Netpro Sourcing product sourcing and customization';
  const documentTitle = clean($('title').text()) || 'Netpro Sourcing';

  const galleryItems = gallery.map((node) => {
    const card = $(node);
    const source = card.find('img').first().attr('src');
    const stableId = `gallery-${stableSlug(assetPath(source, 'gallery image').split('/').at(-1) ?? '', 'gallery image')}`;
    const caption = clean(card.find('.home-about-tile-caption').text());
    return keyed(stableId, {
      category: clean(card.attr('data-category')) as 'clothing' | 'headwear' | 'socks' | 'patches',
      caption,
      href: clean(card.attr('href')),
      linkLabel: clean(card.attr('aria-label')),
      image: image(source, card.find('img').first().attr('alt'), stableId),
    });
  });
  const gallerySlugs = galleryItems.map((item) => item.slug);
  if (new Set(gallerySlugs).size !== gallerySlugs.length) {
    throw new Error('The source gallery repeats an image filename; give repeated entries explicit stable IDs before seeding.');
  }

  const categoryItems = categories.map((node) => {
    const category = clean($(node).attr('data-category')) as 'clothing' | 'headwear' | 'socks' | 'patches';
    const slug = `category-${category}`;
    return keyed(slug, {
      category,
      title: clean($(node).find('.category-toggle span').text()),
      description: clean($(node).find('.category-details p').text()),
      image: image(cssCategoryImage(css, category), $(node).find('.category-photo').attr('aria-label'), slug),
      cta: {
        label: clean($(node).find('.category-details a.button').text()),
        href: clean($(node).find('.category-details a.button').attr('href')),
      },
    });
  });

  const processItems = steps.map((node, index) => {
    const button = $(node).find('[data-process-toggle]').first();
    const sourceId = clean(button.attr('id')).replace(/^process-step-/, '');
    if (!sourceId || sourceId === clean(button.attr('id'))) throw new Error('Process step is missing its stable source id.');
    const img = processImages[index];
    const processImage = $(img);
    return keyed(`process-${stableSlug(sourceId, 'process step')}`, {
      title: clean(button.find('.home-process-step-title').text()),
      body: clean($(node).find('.home-process-step-panel p').text()),
      image: image(processImage.attr('src'), processImage.attr('alt'), `process step ${sourceId}`),
    });
  });

  const startingPointItems = startingPoints.map((node) => {
    const card = $(node);
    const img = card.find('img').first();
    const link = card.find('.process-copy a').first();
    const sourceId = stableSlug(assetPath(img.attr('src'), 'starting point image').split('/').at(-1) ?? '', 'starting point');
    return keyed(`starting-${sourceId}`, {
      title: clean(card.find('.process-copy h3').text()),
      body: clean(card.find('.process-copy p').text()),
      image: image(img.attr('src'), img.attr('alt'), `starting point ${sourceId}`),
      cta: { label: clean(link.text()), href: clean(link.attr('href')) },
    });
  });

  const filterItems = $('.home-about-filters [data-gallery-filter]').toArray().map((node) => {
    const category = clean($(node).attr('data-gallery-filter')) as 'all' | 'clothing' | 'headwear' | 'socks' | 'patches';
    return keyed(`gallery-filter-${category}`, { category, label: clean($(node).text()) });
  });
  expectCount(filterItems, 5, 'gallery filters');

  const benefitItems = benefits.map((node, index) => {
    const title = clean($(node).find('h3').text());
    return keyed(benefitSlugs[index], { title, body: clean($(node).find('p').text()) });
  });

  const faqItems = faqs.map((node) => {
    const button = $(node).find('.home-faq-toggle').first();
    const sourceId = clean(button.attr('id'));
    const slug = faqSlugs[sourceId];
    if (!slug) throw new Error(`FAQ source id has no explicit stable seed identity: ${sourceId}`);
    return keyed(`faq-${slug}`, {
      question: clean(button.find('span').first().text()),
      answer: clean($(node).find('.home-faq-answer-inner p').text()),
    });
  });

  const socialLinks = footerSocials.map((node) => {
    const link = $(node);
    const iconKey = getSocialIconKey(node);
    return keyed(`social-${iconKey}`, {
      label: clean(link.attr('aria-label')),
      href: clean(link.attr('href')),
      iconKey,
    });
  });

  const columns = footerColumns.map((node) => {
    const column = $(node);
    const sourceClass = (column.attr('class') ?? '').split(/\s+/).find((name) => name.startsWith('footer-') && name !== 'footer-column');
    if (!sourceClass) throw new Error('Footer link group is missing its stable source class.');
    const links = column.find(':scope > a').toArray().map((linkNode) => {
      const link = $(linkNode);
      const href = clean(link.attr('href'));
      return keyed(`footer-link-${stableSlug(href, 'footer link')}`, { label: clean(link.text()), href });
    });
    if (new Set(links.map((link) => link.slug)).size !== links.length) {
      throw new Error(`Footer link group ${sourceClass} repeats a destination; seed explicit IDs before importing.`);
    }
    return keyed(`footer-${sourceClass.replace(/^footer-/, '')}`, {
      title: clean(column.find(':scope > h2').text()),
      links,
    });
  });

  const addressHtml = $('.home-footer-contact address').html() ?? '';
  const addressLines = addressHtml.split(/<br\s*\/?\s*>/i)
    .map((line) => clean(load(`<div>${line}</div>`)('div').text()))
    .filter(Boolean);
  const manager = requireText($, '.home-footer-contact .contact-person');
  const managerParts = manager.split(':', 2).map(clean);
  const titleMeta = clean($('meta[property="og:title"]').attr('content')) || documentTitle;
  const descriptionMeta = clean($('meta[name="description"]').attr('content'));
  const ogDescription = clean($('meta[property="og:description"]').attr('content')) || descriptionMeta;

  return {
    _id: 'homePage',
    _type: 'homePage',
    seo: {
      title: documentTitle,
      description: descriptionMeta,
      ogTitle: titleMeta,
      ogDescription,
      ogImage: image(rawOgImage, ogAlt, 'Open Graph image'),
    },
    hero: {
      titleLines: $('#hero-title > span').toArray().map((node) => clean($(node).text())),
      body: requireText($, '.hero-copy > p'),
      slides: $('.hero-slides .hero-photo').toArray().map((node) => {
        const photo = $(node);
        const slug = `hero-${stableSlug(assetPath(photo.attr('src'), 'hero slide').split('/').at(-1) ?? '', 'hero slide')}`;
        return keyed(slug, { image: image(photo.attr('src'), photo.attr('alt'), slug) });
      }),
      primaryCta: {
        label: clean($('.hero-actions a.button.primary').text()),
        href: requireHref($, '.hero-actions a.button.primary'),
      },
      secondaryCta: {
        label: clean($('.hero-actions a.button.outline').text()),
        href: requireHref($, '.hero-actions a.button.outline'),
      },
    },
    collection: {
      eyebrow: requireText($, '.home-story-copy .eyebrow'),
      titleLines: splitLines($, '#catalog-title'),
      body: clean($('.home-story-copy > p').eq(1).text()),
      cta: {
        label: clean($('.home-story-copy .home-story-link').text()),
        href: requireHref($, '.home-story-copy .home-story-link'),
      },
      categories: categoryItems,
    },
    process: {
      titleLines: $('#process-title > span').toArray().map((node) => clean($(node).text())),
      body: requireText($, '.home-process-heading > p'),
      steps: processItems,
      primaryCta: {
        label: clean($('.home-process-primary').text()),
        href: requireHref($, '.home-process-primary'),
      },
      secondaryCta: {
        label: clean($('.home-process-secondary').text()),
        href: requireHref($, '.home-process-secondary'),
      },
    },
    startingPoints: {
      eyebrow: requireText($, '.home-starting-points-intro .eyebrow'),
      title: requireText($, '#starting-points-title'),
      body: clean($('.home-starting-points-intro > p').last().text()),
      items: startingPointItems,
    },
    brandStory: {
      title: clean($('#sourcing-title').attr('aria-label')) || clean($('#sourcing-title').text()),
      body: requireText($, '.home-about-support > p'),
      cta: {
        label: clean($('.home-about-actions a').text()),
        href: requireHref($, '.home-about-actions a'),
      },
      galleryFilters: filterItems,
      gallery: galleryItems,
    },
    benefits: {
      intro: {
        title: requireText($, '#home-why-title'),
        body: requireText($, '.home-why-lead'),
        capabilities: $('.home-why-capabilities li').toArray().map((node) => clean($(node).text())),
      },
      items: benefitItems,
    },
    faq: {
      title: requireText($, '#home-faq-title'),
      contactTitle: requireText($, '#home-faq-contact-title'),
      contactBody: requireText($, '.home-faq-contact > p'),
      contactCta: {
        label: clean($('.home-faq-contact > a').text()),
        href: requireHref($, '.home-faq-contact > a'),
      },
      items: faqItems,
      guideCta: {
        label: clean($('.home-faq-guide').text()),
        href: requireHref($, '.home-faq-guide'),
      },
    },
    closingCta: {
      titleLines: splitLines($, '#closing-title'),
      cta: {
        label: clean($('.closing-actions a').text()),
        href: requireHref($, '.closing-actions a'),
      },
    },
    footer: {
      description: requireText($, '.home-footer-brand > p'),
      newsletterTitle: requireText($, '#home-footer-collective-title'),
      newsletterDescription: requireText($, '.home-footer-subscribe > p'),
      emailPlaceholder: clean($('#home-collective-email').attr('placeholder')),
      subscribeLabel: clean($('.footer-signup-button').text()),
      contactEmail: requireText($, '.home-footer-contact .contact-email').replace(/^mailto:/, ''),
      addressLines,
      managerLabel: managerParts[0] || 'Sales Manager',
      managerName: managerParts[1] || manager,
      socialLinks,
      columns,
      copyright: requireText($, '.home-footer-bottom > span'),
      legalLink: {
        label: clean($('.home-footer-legal > a').text()),
        href: requireHref($, '.home-footer-legal > a'),
      },
      tagline: clean($('.home-footer-legal > span').text()),
    },
  } as LegacyHomePageSeed;
}

export function buildSeedDocument(
  seed: LegacyHomePageSeed,
  assetRefs: Readonly<Record<string, string>>,
): HomePageSeedDocument {
  const resolve = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(resolve);
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (record.__legacyImage === true) {
        const path = String(record.path);
        const ref = assetRefs[path];
        if (!ref) throw new Error(`Sanity asset was not uploaded for ${path}.`);
        return { _type: 'image', asset: { _type: 'reference', _ref: ref }, alt: String(record.alt ?? '') };
      }
      return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, resolve(item)]));
    }
    return value;
  };
  return addArrayItemTypesToSeed(resolve(seed) as HomePageSeedDocument);
}

export function collectLegacyImagePaths(seed: LegacyHomePageSeed): string[] {
  const paths = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (record.__legacyImage === true) {
      paths.add(String(record.path));
      return;
    }
    Object.values(record).forEach(visit);
  };
  visit(seed);
  return [...paths];
}
