export type SanityImage = {
  _type?: 'image';
  asset?: {
    _type?: 'reference';
    _ref?: string;
    _id?: string;
    url?: string;
    metadata?: {
      lqip?: string;
      dimensions?: { width: number; height: number; aspectRatio?: number };
    };
  } | null;
  alt?: string;
  crop?: { top: number; bottom: number; left: number; right: number } | null;
  hotspot?: { x: number; y: number; height: number; width: number } | null;
};

export type KeyedSlug<T extends string = string> = { _type: T; _key: string; slug: string };
export type HomeCta = { label: string; href: string };
export type HomeCategory = 'clothing' | 'headwear' | 'socks' | 'patches';

export type HomePageDocument = {
  _id: 'homePage';
  _rev: string;
  _type: 'homePage';
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: SanityImage;
  };
  hero: {
    titleLines: string[];
    body: string;
    slides: Array<KeyedSlug<'heroSlide'> & { image: SanityImage }>;
    primaryCta: HomeCta;
    secondaryCta: HomeCta;
  };
  collection: {
    eyebrow: string;
    titleLines: string[];
    body: string;
    cta: HomeCta;
    categories: Array<KeyedSlug<'homeCategory'> & {
      category: HomeCategory;
      title: string;
      description: string;
      image: SanityImage;
      cta: HomeCta;
    }>;
  };
  process: {
    titleLines: string[];
    body: string;
    steps: Array<KeyedSlug<'processStep'> & { title: string; body: string; image: SanityImage }>;
    primaryCta: HomeCta;
    secondaryCta: HomeCta;
  };
  startingPoints: {
    eyebrow: string;
    title: string;
    body: string;
    items: Array<KeyedSlug<'startingPoint'> & {
      title: string;
      body: string;
      image: SanityImage;
      cta: HomeCta;
    }>;
  };
  brandStory: {
    title: string;
    body: string;
    cta: HomeCta;
    galleryFilters: Array<KeyedSlug<'galleryFilter'> & { category: 'all' | HomeCategory; label: string }>;
    gallery: Array<KeyedSlug<'galleryItem'> & {
      category: HomeCategory;
      caption: string;
      href: string;
      linkLabel: string;
      image: SanityImage;
    }>;
  };
  benefits: {
    intro: { title: string; body: string; capabilities: string[] };
    items: Array<KeyedSlug<'homeBenefit'> & { title: string; body: string }>;
  };
  faq: {
    title: string;
    contactTitle: string;
    contactBody: string;
    contactCta: HomeCta;
    items: Array<KeyedSlug<'homeFaqItem'> & { question: string; answer: string }>;
    guideCta: HomeCta;
  };
  closingCta: { titleLines: string[]; cta: HomeCta };
  footer: {
    description: string;
    newsletterTitle: string;
    newsletterDescription: string;
    emailPlaceholder: string;
    subscribeLabel: string;
    contactEmail: string;
    addressLines: string[];
    managerLabel: string;
    managerName: string;
    socialLinks: Array<KeyedSlug<'socialLink'> & { label: string; href: string; iconKey: string }>;
    columns: Array<KeyedSlug<'footerColumn'> & {
      title: string;
      links: Array<KeyedSlug<'footerLink'> & { label: string; href: string }>;
    }>;
    copyright: string;
    legalLink: HomeCta;
    tagline: string;
  };
};

export type HomePageSelection = HomePageDocument;
