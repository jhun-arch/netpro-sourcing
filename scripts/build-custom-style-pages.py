#!/usr/bin/env python3
"""Build the static product detail pages for headwear and sock substyles."""
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "custom-style-pages.json"
SHELL = ROOT / "custom-headwear.html"
SITE = "https://netprosourcing.vercel.app"


def esc(value: str) -> str:
    return html.escape(str(value), quote=True)


def crop_style(image: str, position: str, size: str = "200% 200%") -> str:
    return f"background-image:url('{esc(image)}');background-size:{esc(size)};background-position:{esc(position)}"


def render_gallery(style: dict) -> str:
    image, pos, alt = style["image"], style["position"], style["alt"]
    aria = esc(alt)
    return f'''<div class="custom-product-gallery" data-custom-product-gallery>
  <div class="custom-product-gallery-body">
    <div class="custom-product-stage">
      <button type="button" class="custom-product-stage-open" data-gallery-open aria-label="Open image viewer: {aria}">
        <span class="custom-product-view" data-gallery-view role="img" aria-label="{aria}" style="{crop_style(image, pos)}"></span>
      </button>
    </div>
    <div class="custom-product-gallery-caption"><strong data-gallery-caption>Style Reference</strong></div>
    <p class="custom-product-gallery-status" data-gallery-status aria-live="polite"></p>
  </div>
  <div class="custom-product-thumbnails" role="group" aria-label="Product reference images">
    <button type="button" class="custom-product-thumb" data-gallery-thumb data-image="{esc(image)}" data-image-size="200% 200%" data-position="{esc(pos)}" data-alt="{aria}" data-label="Style Reference" aria-label="Style Reference: {aria}" aria-pressed="true">
      <span class="custom-product-thumb-art" aria-hidden="true" style="{crop_style(image, pos)}"></span>
    </button>
  </div>
  <dialog class="custom-product-lightbox" data-gallery-dialog aria-labelledby="gallery-dialog-title">
    <div class="custom-product-lightbox-inner">
      <h2 id="gallery-dialog-title" class="sr-only">{esc(style['name'])} Image Viewer</h2>
      <button type="button" class="custom-product-lightbox-close" data-lightbox-close aria-label="Close image viewer">&#215;</button>
      <div class="custom-product-lightbox-view" data-lightbox-view role="img" aria-label="{aria}"></div>
      <p class="custom-product-lightbox-caption" data-lightbox-caption>Style Reference</p>
    </div>
  </dialog>
</div>'''


def render_feature(style: dict) -> str:
    detail = style["detail"]
    points = "".join(
        f'<li><strong>{esc(title)}</strong><span>{esc(copy)}</span></li>'
        for title, copy in style["points"]
    )
    return f'''<section class="custom-product-section custom-product-overview-section" aria-labelledby="product-overview-title">
  <div class="custom-product-wrap custom-product-overview">
    <div class="custom-product-overview-copy">
      <p class="eyebrow">STYLE DETAILS</p>
      <h2 id="product-overview-title">{esc(style['overview_title'])}</h2>
      <p>{esc(style['overview_copy'])}</p>
      <ul class="custom-product-overview-features">{points}</ul>
    </div>
    <figure>
      <span class="custom-editorial-image custom-category-photo" role="img" aria-label="{esc(detail['alt'])}" style="{crop_style(detail['image'], detail['position'], detail['size'])}"></span>
      <figcaption>{esc(detail['caption'])}</figcaption>
    </figure>
  </div>
</section>'''


def render_options(style: dict) -> str:
    cards = "".join(
        f'<article class="custom-style-option"><span>{index:02d}</span><h3>{esc(title)}</h3><p>{esc(copy)}</p></article>'
        for index, (title, copy) in enumerate(style["options"], 1)
    )
    return f'''<section class="custom-product-section custom-style-options" aria-labelledby="style-options-title">
  <div class="custom-product-wrap">
    <header class="custom-product-section-heading"><p class="eyebrow">SPECIFICATION OPTIONS</p><h2 id="style-options-title">{esc(style['options_title'])}</h2><p>{esc(style['options_intro'])}</p></header>
    <div class="custom-product-card-grid custom-style-option-grid">{cards}</div>
  </div>
</section>'''


def render_process(style: dict) -> str:
    steps = "".join(
        f'<li class="custom-product-step"><span>{index:02d}</span><h3>{esc(title)}</h3><p>{esc(copy)}</p></li>'
        for index, (title, copy) in enumerate(style["process"], 1)
    )
    return f'''<section class="custom-product-section custom-product-process custom-style-process" aria-labelledby="product-process-title">
  <div class="custom-product-wrap">
    <header class="custom-product-section-heading"><p class="eyebrow">PROJECT FLOW</p><h2 id="product-process-title">{esc(style['process_title'])}</h2></header>
    <ol class="custom-product-step-grid custom-style-process-grid">{steps}</ol>
  </div>
</section>'''


def render_faq(style: dict) -> str:
    items = "".join(
        f'<details><summary>{esc(question)}</summary><p>{esc(answer)}</p></details>'
        for question, answer in style["faq"]
    )
    return f'''<section class="custom-product-section custom-product-faq" aria-labelledby="product-faq-title">
  <div class="custom-product-wrap custom-product-faq-layout">
    <header class="custom-product-section-heading"><p class="eyebrow">STYLE QUESTIONS</p><h2 id="product-faq-title">Common Questions.</h2></header>
    <div class="custom-product-faq-list">{items}</div>
  </div>
</section>'''


def render_related(style: dict, catalog: dict[str, dict]) -> str:
    cards = []
    for slug in style["related"]:
        related = catalog[slug]
        cards.append(
            f'''<article class="custom-product-card"><a class="custom-product-link-card" href="{esc(slug)}.html">
  <figure><span class="custom-product-card-image" role="img" aria-label="{esc(related['alt'])}" style="{crop_style(related['image'], related['position'])}"></span></figure>
  <div class="custom-product-card-copy"><h3>{esc(related['name'])}</h3></div>
</a></article>'''
        )
    return f'''<section class="custom-product-section custom-product-cards-section custom-style-related" aria-labelledby="related-styles-title">
  <div class="custom-product-wrap">
    <header class="custom-product-section-heading"><p class="eyebrow">MORE {esc(style['family'].upper())} STYLES</p><h2 id="related-styles-title">Explore Related Styles.</h2></header>
    <div class="custom-product-card-grid custom-style-related-grid">{''.join(cards)}</div>
  </div>
</section>'''


def render_main(style: dict, catalog: dict[str, dict]) -> str:
    category_file = "custom-headwear.html" if style["family"] == "Headwear" else "custom-socks.html"
    category_name = "Headwear" if style["family"] == "Headwear" else "Socks"
    family_project = "Headwear" if style["family"] == "Headwear" else "Sock"
    current = f"Custom {style['name']}"
    eyebrow = f"CUSTOM {style['family'].upper()}"
    cta_title = f"Discuss Your {style['name']} Project."
    cta_label = "Request a Quote"
    return f'''<main id="main" class="custom-product-main custom-style-detail-page">
  <nav class="custom-product-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="apparel-customization-process.html">Customization</a><span aria-hidden="true">/</span><a href="{category_file}">Custom {category_name}</a><span aria-hidden="true">/</span><span aria-current="page">{esc(style['name'])}</span></nav>
  <section class="custom-product-hero" aria-labelledby="product-title">
    {render_gallery(style)}
    <div class="custom-product-copy">
      <p class="eyebrow">{esc(eyebrow)}</p>
      <h1 id="product-title">{esc(current)}</h1>
      <p class="custom-product-lead">{esc(style['lead'])}</p>
      <div class="custom-product-action"><a class="button primary" href="quote.html">Discuss This Style <svg aria-hidden="true"><use href="#i-arrow"/></svg></a><p class="custom-product-action-note">Share the style, quantity, artwork and destination. The confirmed scope is recorded in your quote.</p></div>
    </div>
  </section>
  {render_feature(style)}
  {render_options(style)}
  {render_process(style)}
  {render_faq(style)}
  {render_related(style, catalog)}
  <section class="custom-product-cta" aria-labelledby="product-cta-title"><div class="custom-product-wrap custom-product-cta-inner"><h2 id="product-cta-title">{esc(cta_title)}</h2><a class="button primary" href="quote.html">{esc(cta_label)} <svg aria-hidden="true"><use href="#i-arrow"/></svg></a></div></section>
</main>'''


def set_meta(prefix: str, pattern: str, replacement: str) -> str:
    updated, count = re.subn(pattern, lambda _m: replacement, prefix, count=1, flags=re.I | re.S)
    if count != 1:
        raise ValueError(f"Expected one shell metadata field for {pattern!r}; got {count}")
    return updated


def render_page(style: dict, catalog: dict[str, dict]) -> str:
    page_path = ROOT / (style["slug"] + ".html")
    main = render_main(style, catalog)
    if page_path.exists():
        # Regeneration preserves any navigation, cache, or footer edits made to the page shell.
        existing = page_path.read_bytes().decode("utf-8")
        start = existing.index('<main id="main"')
        end = existing.index("</main>", start) + len("</main>")
        return existing[:start] + main + existing[end:]

    # New pages inherit the latest category shell once; subsequent builds replace only <main>.
    shell = SHELL.read_bytes().decode("utf-8")
    start = shell.index('<main id="main"')
    end = shell.index("</main>", start) + len("</main>")
    prefix, suffix = shell[:start], shell[end:]
    title = f"Custom {style['name']} &mdash; Netpro Sourcing"
    desc = esc(style["description"])
    canonical = f'{SITE}/{style["slug"]}.html'
    og_image = f'{SITE}/assets/banner-{"headwear" if style["family"] == "Headwear" else "socks"}.webp'
    prefix = set_meta(prefix, r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">')
    prefix = set_meta(prefix, r'<title>.*?</title>', f'<title>{title}</title>')
    prefix = set_meta(prefix, r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{canonical}">')
    prefix = set_meta(prefix, r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{esc("Custom " + style["name"] + " | Netpro Sourcing")}">')
    prefix = set_meta(prefix, r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">')
    prefix = set_meta(prefix, r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{canonical}">')
    prefix = set_meta(prefix, r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{og_image}">')
    return prefix + main + suffix


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slugs", nargs="*", help="Generate selected page slugs only")
    args = parser.parse_args()
    global STYLES
    STYLES = json.loads(DATA.read_text(encoding="utf-8"))["styles"]
    catalog = {style["slug"]: style for style in STYLES}
    selected = STYLES if not args.slugs else [style for style in STYLES if style["slug"] in set(args.slugs)]
    missing = set(args.slugs or []) - {style["slug"] for style in selected}
    if missing:
        parser.error("Unknown style slug(s): " + ", ".join(sorted(missing)))
    for style in selected:
        (ROOT / (style["slug"] + ".html")).write_bytes(render_page(style, catalog).encode("utf-8"))
    print(f"Generated {len(selected)} page(s): " + ", ".join(style["slug"] + ".html" for style in selected))


STYLES: list[dict]

if __name__ == "__main__":
    main()
