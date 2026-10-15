#!/usr/bin/env python3
"""Build the static product detail pages for headwear and sock substyles."""
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "custom-style-pages.json"
IMAGE_MANIFEST = ROOT / "data" / "style-module-image-manifest.json"
SHELL = ROOT / "custom-baseball-caps.html"
SITE = "https://netprosourcing.vercel.app"
PRODUCTS_CSS_VERSION = "20261012-16"


def esc(value: str) -> str:
    return html.escape(str(value), quote=True)


def crop_style(image: str, position: str, size: str = "200% 200%") -> str:
    return f"background-image:url('{esc(image)}');background-size:{esc(size)};background-position:{esc(position)}"


def render_gallery(style: dict) -> str:
    detail = style["detail"]
    slides = [
        {
            "image": style["image"],
            "position": style.get("position", "center"),
            "size": style.get("image_size", "cover"),
            "alt": style["alt"],
            "label": style.get("image_caption", f"{style['name']} profile"),
        },
        {
            "image": detail["image"],
            "position": detail.get("position", "center"),
            "size": detail.get("size", "cover"),
            "alt": detail["alt"],
            "label": detail.get("caption", f"{style['name']} construction detail"),
        },
    ]
    first = slides[0]
    previous_next = '''<button type="button" class="custom-product-gallery-button is-previous" data-gallery-previous aria-label="Previous image">&#8249;</button>
          <button type="button" class="custom-product-gallery-button is-next" data-gallery-next aria-label="Next image">&#8250;</button>'''
    thumbnails = "".join(
        f'''<button type="button" class="custom-product-thumb" data-gallery-thumb data-image="{esc(slide['image'])}" data-image-size="{esc(slide['size'])}" data-lightbox-size="{esc(slide['size'])}" data-position="{esc(slide['position'])}" data-alt="{esc(slide['alt'])}" data-label="{esc(slide['label'])}" aria-label="Show {esc(slide['label'])}" aria-pressed="{'true' if index == 0 else 'false'}">
      <span class="custom-product-thumb-art" aria-hidden="true" style="{crop_style(slide['image'], slide['position'], slide['size'])}"></span>
    </button>'''
        for index, slide in enumerate(slides)
    )
    aria = esc(first["alt"])
    return f'''<div class="custom-product-gallery" data-custom-product-gallery>
  <div class="custom-product-gallery-body">
    <div class="custom-product-stage">
      <button type="button" class="custom-product-stage-open" data-gallery-open aria-label="Open image viewer: {aria}">
        <span class="custom-product-view" data-gallery-view role="img" aria-label="{aria}" style="{crop_style(first['image'], first['position'], first['size'])}"></span>
      </button>
      {previous_next}
    </div>
    <p class="custom-product-gallery-status" data-gallery-status aria-live="polite"></p>
  </div>
  <div class="custom-product-thumbnails" role="group" aria-label="Product reference images">
    {thumbnails}
  </div>
  <dialog class="custom-product-lightbox" data-gallery-dialog aria-labelledby="gallery-dialog-title">
    <div class="custom-product-lightbox-inner">
      <h2 id="gallery-dialog-title" class="sr-only">{esc(style['name'])} Image Viewer</h2>
      <button type="button" class="custom-product-lightbox-close" data-lightbox-close aria-label="Close image viewer">&#215;</button>
      <button type="button" data-lightbox-previous aria-label="Previous image">&#8249;</button>
      <div class="custom-product-lightbox-view" data-lightbox-view role="img" aria-label="{aria}"></div>
      <button type="button" data-lightbox-next aria-label="Next image">&#8250;</button>
    </div>
  </dialog>
</div>'''


EDITORIAL_TILE_SIZE = "400% 400%"
EDITORIAL_ROLES = {
    "overview": "measurement",
    "branding": "craft_detail",
    "brief": "brief",
    "measurements": "measurement",
    "inspection": "sampling",
    "construction": "quality_check",
    "packout": "tissue_pack",
    "packaging": ["presentation_box", "protective_bag", "mailer", "blank_insert"],
    "applications": ["brand_still_life", "retail_display", "team_colorway", "ecommerce_hero"],
}


FALLBACK_EDITORIAL_POSITIONS = {
    "hero": "0% 0%", "craft_detail": "33.333333% 0%", "brief": "66.666667% 0%", "measurement": "100% 0%",
    "sampling": "0% 33.333333%", "quality_check": "33.333333% 33.333333%", "tissue_pack": "66.666667% 33.333333%",
    "presentation_box": "100% 33.333333%", "protective_bag": "0% 66.666667%", "mailer": "33.333333% 66.666667%",
    "blank_insert": "66.666667% 66.666667%", "brand_still_life": "100% 66.666667%", "retail_display": "0% 100%",
    "team_colorway": "33.333333% 100%", "ecommerce_hero": "66.666667% 100%", "ecommerce_alt": "100% 100%",
}


def editorial_panel(style: dict, role: str) -> dict:
    return style.get("editorial_panels", {}).get(role, {})


def editorial_crop(style: dict, role: str) -> str:
    panel = editorial_panel(style, role)
    position = panel.get("position", FALLBACK_EDITORIAL_POSITIONS[role])
    size = style.get("editorial_background_size", EDITORIAL_TILE_SIZE)
    return crop_style(style["editorial_image"], position, size)


def editorial_alt(style: dict, role: str, fallback: str) -> str:
    return editorial_panel(style, role).get("alt", fallback)


def render_hero_details(style: dict) -> str:
    items = "".join(
        f'<details><summary>{esc(title)}</summary><p>{esc(copy)}</p></details>'
        for title, copy in style["options"]
    )
    return f'<div class="custom-product-details">{items}</div>'


def render_overview(style: dict) -> str:
    points = "".join(
        f'<li><strong>{esc(title)}</strong><span>{esc(copy)}</span></li>'
        for title, copy in style["points"]
    )
    detail_items = "".join(
        f'<details><summary>{esc(item["title"])}</summary><p>{esc(item["copy"])}</p></details>'
        for item in style["overview_details"]
    )
    return f'''<section class="custom-product-section custom-product-overview-section" aria-labelledby="product-overview-title">
  <div class="custom-product-wrap custom-product-overview">
    <figure>
      <span class="custom-editorial-image custom-category-photo" role="img" aria-label="{esc(editorial_alt(style, EDITORIAL_ROLES['overview'], style['name'] + ' style overview'))}" style="{editorial_crop(style, EDITORIAL_ROLES['overview'])}"></span>
    </figure>
    <div class="custom-product-overview-copy">
      <h2 id="product-overview-title">{esc(style['overview_title'])}</h2>
      <p>{esc(style['overview_copy'])}</p>
      <ul class="custom-product-overview-features">{points}</ul>
      <div class="custom-product-details custom-product-overview-details">{detail_items}</div>
    </div>
  </div>
</section>'''


def render_branding(style: dict) -> str:
    detail_label = "Knit and finishing detail" if style["family"] == "Socks" else "Headwear construction detail"
    items = "".join(f"<li>{esc(item)}</li>" for item in style["brand_points"])
    return f'''<section class="custom-editorial-feature" aria-labelledby="brand-detail-title">
  <div class="custom-product-wrap custom-editorial-feature-inner">
    <figure>
      <span class="custom-editorial-image custom-category-photo" role="img" aria-label="{esc(editorial_alt(style, EDITORIAL_ROLES['branding'], detail_label))}" style="{editorial_crop(style, EDITORIAL_ROLES['branding'])}"></span>
    </figure>
    <div class="custom-editorial-copy">
      <p class="eyebrow">BRAND DETAILS</p>
      <h2 id="brand-detail-title">Artwork That Feels Like Yours.</h2>
      <p>{esc(style['brand_intro'])}</p>
      <ul class="custom-editorial-points">{items}</ul>
    </div>
  </div>
</section>'''


def render_process(style: dict) -> str:
    image_roles = ["brief", "measurement", "brief", "sampling", "quality_check", "tissue_pack"]
    steps = "".join(
        f'''<li>
  <span class="custom-process-image custom-category-photo" role="img" aria-label="{esc(editorial_alt(style, position, style['name'] + ' project stage: ' + title))}" style="{editorial_crop(style, position)}"></span>
  <div><span>{index:02d}</span><h3>{esc(title)}</h3><p>{esc(copy)}</p></div>
</li>'''
        for index, ((title, copy), position) in enumerate(zip(style["process"], image_roles), 1)
    )
    return f'''<section class="custom-product-section custom-product-process custom-editorial-process custom-style-process" aria-labelledby="product-process-title">
  <div class="custom-product-wrap">
    <header class="custom-product-section-heading"><p class="eyebrow">PROJECT FLOW</p><h2 id="product-process-title">{esc(style['process_title'])}</h2></header>
    <ol class="custom-process-grid">{steps}</ol>
  </div>
</section>'''


def render_packaging(style: dict) -> str:
    cards = "".join(
        f'''<article class="custom-product-card">
  <figure><span class="custom-product-card-image custom-category-photo" role="img" aria-label="{esc(editorial_alt(style, position, style['name'] + ' ' + title.lower() + ' reference'))}" style="{editorial_crop(style, position)}"></span></figure>
  <div class="custom-product-card-copy"><h3>{esc(title)}</h3></div>
</article>'''
        for title, position in zip(style["packaging"], EDITORIAL_ROLES["packaging"])
    )
    return f'''<section class="custom-product-section custom-product-packaging-section custom-editorial-packaging" aria-labelledby="product-packaging-title">
  <div class="custom-product-wrap">
    <header class="custom-product-section-heading">
      <h2 id="product-packaging-title">Packout, Considered.</h2>
      <p>Bring packing and label requirements into the quote.</p>
    </header>
    <div class="custom-product-card-grid custom-product-packaging-grid">{cards}</div>
  </div>
</section>'''


def render_applications(style: dict) -> str:
    cards = "".join(
        f'''<article>
  <span class="custom-audience-image custom-category-photo" role="img" aria-label="{esc(editorial_alt(style, position, style['name'] + ' context: ' + title))}" style="{editorial_crop(style, position)}"></span>
  <h3>{esc(title)}</h3>
</article>'''
        for title, position in zip(style["applications"], EDITORIAL_ROLES["applications"])
    )
    return f'''<section class="custom-product-section custom-editorial-audience" aria-labelledby="audience-title">
  <div class="custom-product-wrap">
    <header class="custom-product-section-heading">
      <p class="eyebrow">FOR YOUR RANGE</p>
      <h2 id="audience-title">Where The Range Can Fit.</h2>
    </header>
    <div class="custom-audience-grid">{cards}</div>
  </div>
</section>'''


def render_inspiration(style: dict) -> str:
    cards = [
        (role, editorial_alt(style, role, style["name"] + " style inspiration"))
        for role in style["concept_roles"]
    ]
    figures = "".join(
        f'''<figure>
  <span class="custom-concept-image custom-category-photo" role="img" aria-label="{esc(alt)}" style="{editorial_crop(style, role)}"></span>
</figure>'''
        for role, alt in cards
    )
    return f'''<section class="custom-product-section custom-editorial-concepts custom-editorial-concepts--white" aria-labelledby="product-range-title">
  <div class="custom-product-wrap">
    <header class="custom-product-section-heading">
      <p class="eyebrow">STYLE INSPIRATION</p>
      <h2 id="product-range-title">Product Range Inspiration.</h2>
    </header>
    <div class="custom-concept-grid">{figures}</div>
  </div>
</section>'''


def render_faq(style: dict) -> str:
    items = "".join(
        f'<details><summary>{esc(question)}</summary><p>{esc(answer)}</p></details>'
        for question, answer in style["faq"]
    )
    return f'''<section class="custom-product-section custom-product-faq" aria-labelledby="product-faq-title">
  <div class="custom-product-wrap custom-product-faq-layout">
    <header class="custom-product-section-heading"><h2 id="product-faq-title">Common Questions.</h2></header>
    <div class="custom-product-faq-list">{items}</div>
  </div>
</section>'''


def render_style_directions(style: dict) -> str:
    cards = "".join(
        f'''<article class="custom-product-card">
  <figure><span class="custom-product-card-image custom-category-photo" role="img" aria-label="{esc(editorial_alt(style, item['role'], style['name'] + ' ' + item['title'].lower() + ' reference'))}" style="{editorial_crop(style, item['role'])}"></span></figure>
  <div class="custom-product-card-copy"><h3>{esc(item['title'])}</h3></div>
</article>'''
        for item in style["style_directions"]
    )
    return f'''<section class="custom-product-section custom-product-cards-section" aria-labelledby="starting-point-title">
  <div class="custom-product-wrap">
    <header class="custom-product-section-heading"><h2 id="starting-point-title">Find Your Starting Point.</h2></header>
    <div class="custom-product-card-grid custom-style-grid">{cards}</div>
  </div>
</section>'''


def render_main(style: dict) -> str:
    request_target = f"{style['slug']}.html"
    current = f"Custom {style['name']}"
    eyebrow = f"CUSTOM {style['family'].upper()}"
    project_name = (
        style["name"][:-1]
        if style["name"].endswith("s") and not style["name"].endswith("ss")
        else style["name"]
    )
    cta_title = f"Discuss Your {project_name} Project."
    shop_query = urlencode({"style": style["slug"]})
    return f'''<main id="main" class="custom-product-main custom-style-detail-page">
  <nav class="custom-product-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><span aria-current="page">{esc(style['name'])}</span></nav>
  <section class="custom-product-hero" aria-labelledby="product-title">
    {render_gallery(style)}
    <div class="custom-product-copy">
      <p class="eyebrow">{esc(eyebrow)}</p>
      <h1 id="product-title">{esc(current)}</h1>
      <p class="custom-product-lead">{esc(style['lead'])}</p>
      <div class="custom-product-action"><button type="button" class="button primary" data-custom-request="{esc(request_target)}">Add custom request</button><p class="custom-product-action-note">Share the details you have. We can clarify the open points together.</p><p class="custom-product-browse-ready"><a class="text-link" href="shop.html?{esc(shop_query)}">Browse ready-stock {esc(style['name'].lower())} ↗</a></p></div>
      {render_hero_details(style)}
    </div>
  </section>
  {render_overview(style)}
  {render_branding(style)}
  {render_process(style)}
  {render_packaging(style)}
  {render_style_directions(style)}
  {render_applications(style)}
  {render_inspiration(style)}
  {render_faq(style)}
  <section class="custom-product-cta" aria-labelledby="product-cta-title"><div class="custom-product-wrap custom-product-cta-inner"><h2 id="product-cta-title">{esc(cta_title)}</h2><button type="button" class="button primary" data-custom-request="{esc(request_target)}">Add custom request</button></div></section>
</main>'''


def set_meta(prefix: str, pattern: str, replacement: str) -> str:
    updated, count = re.subn(pattern, lambda _m: replacement, prefix, count=1, flags=re.I | re.S)
    if count != 1:
        raise ValueError(f"Expected one shell metadata field for {pattern!r}; got {count}")
    return updated


def render_page(style: dict) -> str:
    page_path = ROOT / (style["slug"] + ".html")
    main = render_main(style)
    if page_path.exists():
        # Regeneration preserves any navigation, cache, or footer edits made to the page shell.
        existing = page_path.read_bytes().decode("utf-8")
        newline = "\r\n" if "\r\n" in existing else "\n"
        existing = existing.replace("\r\n", "\n")
        start = existing.index('<main id="main"')
        end = existing.index("</main>", start) + len("</main>")
        rendered = existing[:start] + main + existing[end:]
        rendered = re.sub(r'custom-products\.css\?v=[^"]+', f'custom-products.css?v={PRODUCTS_CSS_VERSION}', rendered)
        return rendered.replace("\n", newline)

    # New pages inherit the latest product detail shell once; subsequent builds replace only <main>.
    shell = SHELL.read_bytes().decode("utf-8")
    newline = "\r\n" if "\r\n" in shell else "\n"
    shell = shell.replace("\r\n", "\n")
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
    rendered = prefix + main + suffix
    rendered = re.sub(r'custom-products\.css\?v=[^"]+', f'custom-products.css?v={PRODUCTS_CSS_VERSION}', rendered)
    return rendered.replace("\n", newline)


def apply_image_manifest(styles: list[dict], parser: argparse.ArgumentParser) -> None:
    if not IMAGE_MANIFEST.exists():
        parser.error(f"Missing editorial image manifest: {IMAGE_MANIFEST.relative_to(ROOT)}")
    manifest = json.loads(IMAGE_MANIFEST.read_text(encoding="utf-8"))
    manifest_styles = {item["slug"]: item for item in manifest.get("styles", [])}
    missing_styles = {style["slug"] for style in styles} - set(manifest_styles)
    if missing_styles:
        parser.error("Missing editorial images for: " + ", ".join(sorted(missing_styles)))

    required_panels = set(FALLBACK_EDITORIAL_POSITIONS)
    expected_options = ["Fabric & Fit", "Decoration", "Project Planning"]
    expected_features = ["Product Details", "Artwork & Finish", "Brand Details"]
    expected_overview_details = ["Manufacturing Scope", "Private Label Details"]
    expected_process = [
        "Project Brief", "Measurement Development", "Feasibility & Quote",
        "Digital Proof Review", "Production Inspection", "Delivery Planning",
    ]
    expected_packaging = ["Custom Boxes", "Protective Bags", "Shipping Mailers", "Labels & Inserts"]
    expected_audiences = ["Brand & Product Planning", "Retail Collections", "Sports & Teams", "Online Ranges"]
    for style in styles:
        image = manifest_styles[style["slug"]]
        asset = image.get("asset", "")
        asset_path = ROOT / asset
        if not asset.startswith("assets/") or not asset_path.is_file():
            parser.error(f"Missing or invalid editorial image for {style['slug']}: {asset!r}")

        panels = image.get("panels", [])
        panel_keys = [panel.get("key") for panel in panels]
        if len(panel_keys) != len(set(panel_keys)):
            parser.error(f"Duplicate editorial panel keys for {style['slug']}")
        panel_map = {panel["key"]: panel for panel in panels}
        missing_panels = required_panels - set(panel_map)
        if missing_panels:
            parser.error(f"Missing editorial panels for {style['slug']}: " + ", ".join(sorted(missing_panels)))
        invalid_panels = [
            key for key, panel in panel_map.items()
            if not panel.get("position") or not panel.get("alt", "").strip()
        ]
        if invalid_panels:
            parser.error(f"Missing position or alt text for {style['slug']} panels: " + ", ".join(sorted(invalid_panels)))

        expected_content = {
            "hero details": ([item[0] for item in style.get("options", [])], expected_options),
            "overview features": ([item[0] for item in style.get("points", [])], expected_features),
            "overview accordions": ([item.get("title") for item in style.get("overview_details", [])], expected_overview_details),
            "process stages": ([item[0] for item in style.get("process", [])], expected_process),
            "packaging cards": (style.get("packaging", []), expected_packaging),
            "audience cards": (style.get("applications", []), expected_audiences),
        }
        for section, (actual, expected) in expected_content.items():
            if actual != expected:
                parser.error(f"Invalid {section} structure for {style['slug']}")
        if len(style.get("style_directions", [])) != 4 or len(style.get("concept_roles", [])) != 2:
            parser.error(f"Expected four product directions and two concept roles for {style['slug']}")
        if len(style.get("faq", [])) != 4:
            parser.error(f"Expected four FAQ items for {style['slug']}")
        used_roles = {item["role"] for item in style["style_directions"]} | set(style["concept_roles"])
        if used_roles - set(panel_map):
            parser.error(f"Unknown editorial roles for {style['slug']}: " + ", ".join(sorted(used_roles - set(panel_map))))

        style["editorial_image"] = asset
        style["editorial_background_size"] = image.get(
            "background_size", manifest.get("layout", {}).get("background_size", EDITORIAL_TILE_SIZE)
        )
        style["editorial_panels"] = panel_map


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slugs", nargs="*", help="Generate selected page slugs only")
    args = parser.parse_args()
    styles = json.loads(DATA.read_text(encoding="utf-8"))["styles"]
    selected = styles if not args.slugs else [style for style in styles if style["slug"] in set(args.slugs)]
    missing = set(args.slugs or []) - {style["slug"] for style in selected}
    if missing:
        parser.error("Unknown style slug(s): " + ", ".join(sorted(missing)))
    apply_image_manifest(selected, parser)
    for style in selected:
        (ROOT / (style["slug"] + ".html")).write_bytes(render_page(style).encode("utf-8"))
    print(f"Generated {len(selected)} page(s): " + ", ".join(style["slug"] + ".html" for style in selected))


if __name__ == "__main__":
    main()
