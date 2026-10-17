import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, type CheerioAPI } from 'cheerio';
import { SITE_PAGE_MANIFEST } from '../src/fullsite/pageManifest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatesPath = path.join(root, 'src/fullsite/legacyTemplates.generated.ts');
const bindingsPath = path.join(root, 'src/fullsite/pageBindings.generated.ts');
const templateJsonPath = path.join(root, 'src/fullsite/legacyTemplates.generated.json');
const bindingsJsonPath = path.join(root, 'src/fullsite/pageBindings.generated.json');
const bindingType = `{
  slotId: string; label: string; kind: 'text' | 'image' | 'link'; selector: string; sectionId: string; sectionLabel: string;
  textMode?: 'plain' | 'lines'; text?: string; textLines?: string[]; textNodePath?: string; attribute?: string; sourcePath?: string; alt?: string;
  href?: string; linkLabel?: string; editableLinkLabel?: boolean; target?: 'gallery' | 'option' | 'background' | 'inline-background';
}`;

type SeedValue = {
  slotId: string;
  label: string;
  kind: 'text' | 'image' | 'link';
  textMode?: 'plain' | 'lines';
  selector: string;
  textNodePath?: string;
  attribute?: string;
  sourcePath?: string;
  alt?: string;
  href?: string;
  linkLabel?: string;
  editableLinkLabel?: boolean;
  text?: string;
  textLines?: string[];
};

type Binding = SeedValue & { sectionId: string; sectionLabel: string; target?: 'gallery' | 'option' | 'background' | 'inline-background' };

function cssIdent(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function stableSelector($: CheerioAPI, element: any): string {
  const id = $(element).attr('id');
  if (id && $(`#${cssIdent(id)}`).length === 1) return `#${cssIdent(id)}`;

  const segments: string[] = [];
  let current = element;
  while (current?.tagName && !['body', 'html'].includes(current.tagName.toLowerCase())) {
    const node = $(current);
    let segment = current.tagName.toLowerCase();
    const classes = (node.attr('class') || '').split(/\s+/).filter(Boolean).sort();
    if (classes.length) segment += classes.slice(0, 3).map((name: string) => `.${cssIdent(name)}`).join('');
    const parent = current.parent;
    const siblings = parent?.children?.filter((child: any) => child.tagName?.toLowerCase() === current.tagName.toLowerCase()) ?? [];
    if (siblings.length > 1) segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    segments.unshift(segment);
    current = current.parent;
  }
  return segments.join(' > ');
}

function textChildren(element: any): any[] {
  const output: any[] = [];
  const walk = (node: any) => {
    if (node.type === 'text') {
      if (String(node.data ?? '').trim()) output.push(node);
      return;
    }
    if (node.type === 'tag' && (node.tagName === 'br' || node.tagName === 'svg' || node.attribs?.['aria-hidden'] === 'true')) return;
    for (const child of node.children ?? []) walk(child);
  };
  walk(element);
  return output;
}

function groupsOfText(element: any): string[][] {
  const directLineSpans = (element.children ?? []).filter((node: any) => node.type === 'tag' && node.tagName === 'span');
  if (directLineSpans.length > 1 && !(element.children ?? []).some((node: any) => node.type === 'tag' && node.tagName === 'br')) {
    return directLineSpans.map((span: any) => [textChildren(span).map((node) => String(node.data).trim()).join(' ')]);
  }
  const groups: string[][] = [[]];
  const walk = (node: any) => {
    if (node.type === 'tag' && node.attribs?.['aria-hidden'] === 'true') return;
    if (node.type === 'tag' && (node.tagName === 'svg' || node.tagName === 'br')) {
      if (node.tagName === 'br') groups.push([]);
      return;
    }
    if (node.type === 'text') {
      if (String(node.data ?? '').trim()) groups.at(-1)!.push(String(node.data).trim());
      return;
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(element);
  return groups.filter((parts) => parts.length).map((parts) => [parts.join('')]);
}

function textNodeEntries(element: any): Array<{ path: string; value: string }> {
  const entries: Array<{ path: string; value: string }> = [];
  const visit = (node: any, path: number[], hidden = false) => {
    if (hidden || node.type === 'tag' && (node.tagName === 'svg' || node.attribs?.['aria-hidden'] === 'true')) return;
    if (node.type === 'text') {
      const value = String(node.data ?? '');
      if (value.trim() && value.trim() !== '*') entries.push({ path: path.join('.'), value });
      return;
    }
    (node.children ?? []).forEach((child: any, index: number) => visit(child, [...path, index]));
  };
  (element.children ?? []).forEach((child: any, index: number) => visit(child, [index]));
  return entries;
}

function visibleAnchorLabel($: CheerioAPI, element: any): string {
  const clone = $(element).clone();
  clone.find('svg,[aria-hidden="true"]').remove();
  return clone.text().replace(/\s+/g, ' ').trim();
}

function hasBlockContent($: CheerioAPI, element: any): boolean {
  return $(element).find('h1,h2,h3,h4,h5,h6,p,ul,ol,li,blockquote,figure,section,article,div,table,dl,dt,dd,form').length > 0;
}

function isComplexLink($: CheerioAPI, element: any): boolean {
  return hasBlockContent($, element) || textNodeEntries(element).length > 1;
}

function shortContext(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/[。.!?]+$/g, '').slice(0, 48);
}

const moduleTranslations = new Map<string, string>([
  ['from first brief to delivery plan', '从初步需求到交付计划'],
  ['common questions', '常见问题'],
  ['frequently asked questions', '常见问题'],
  ['artwork that feels like yours', '品牌图案与视觉识别'],
  ['product range inspiration', '产品系列灵感'],
  ['brand & product planning', '品牌与产品规划'],
  ['where the range can fit', '产品系列应用场景'],
  ['custom boxes', '定制包装 · 纸盒'],
  ['sports & teams', '运动与团队系列'],
  ['shipping mailers', '运输包装袋'],
  ['protective bags', '防护包装袋'],
  ['labels & inserts', '标签与内页'],
  ['retail collections', '零售系列搭配'],
  ['packout, considered', '包装与配套方案'],
  ['online ranges', '线上产品系列'],
  ['details make the difference', '细节决定成品效果'],
  ['find your starting point', '选择定制起点'],
  ['ready to start an enquiry', '开始提交项目询价'],
  ['your idea, made clearer at every step', '逐步梳理产品构想'],
  ['a clear path from idea to product', '从构想到成品的定制流程'],
  ['one conversation through the next steps', '沟通后推进后续步骤'],
  ['save the notes and shape a product brief', '整理需求并形成产品方案'],
  ['turn references into a working direction', '将参考素材转化为设计方向'],
  ['four ways to make an idea more specific', '让设计构想更具体的四种方式'],
  ['four ways to build an emblem', '布贴徽章的四种制作方式'],
  ['production & dispatch', '生产与发货'],
  ['precision in the details', '关注每一处制作细节'],
  ['choose your style', '选择设计风格'],
  ['sock colorways', '袜子配色方案'],
  ['fabric & color', '面料与颜色'],
  ['branding & labels', '品牌标识与标签'],
  ['about working with netpro', '与 Netpro 合作'],
  ['contact us', '联系 Netpro'],
  ['privacy policy', '隐私政策正文'],
  ['terms', '使用条款正文'],
]);

function chineseSectionLabel(pageKey: string, currentLabel: string): string {
  const heading = currentLabel.replace(/^页面模块\s*[·:：]\s*/u, '').trim();
  const normalized = heading.toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
  const exact = moduleTranslations.get(normalized);
  if (exact) return `页面模块 · ${exact}`;
  if (/image viewer/i.test(heading)) return `页面模块 · ${SITE_PAGE_MANIFEST.find((page) => page.pageKey === pageKey)?.label ?? '产品'}图片展示`;
  if (/image|gallery/i.test(heading)) return `页面模块 · ${SITE_PAGE_MANIFEST.find((page) => page.pageKey === pageKey)?.label ?? '页面'}图片展示`;
  if (/question|faq/i.test(heading)) return '页面模块 · 常见问题';
  if (/shape .* around your brief|designed around the team brief|build .* around your range/i.test(heading)) {
    return `页面模块 · ${SITE_PAGE_MANIFEST.find((page) => page.pageKey === pageKey)?.label ?? '产品'}定制设计`;
  }
  const page = SITE_PAGE_MANIFEST.find((entry) => entry.pageKey === pageKey);
  if (page?.group === 'custom-products') return `页面模块 · ${page.label}产品内容`;
  if (page?.group === 'legal') return `页面模块 · ${page.label}正文`;
  if (page?.group === 'forms') return pageKey === 'quote' ? '页面模块 · 项目询价与产品清单' : '页面模块 · 联系信息与表单';
  if (pageKey === 'shop') return '页面模块 · 商品目录与筛选';
  if (pageKey === 'case-studies') return '页面模块 · 产品展示内容';
  if (pageKey === 'buying-guide') return '页面模块 · 采购指南内容';
  if (pageKey === 'how-it-works') return '页面模块 · 定制流程内容';
  if (pageKey === 'what-we-do') return '页面模块 · 服务范围介绍';
  if (pageKey === 'trends-digest') return '页面模块 · 行业趋势内容';
  if (pageKey === 'about') return '页面模块 · 品牌与服务介绍';
  if (pageKey === '404') return '页面模块 · 页面未找到提示';
  if (pageKey === 'submission-success') return '页面模块 · 提交结果说明';
  return `页面模块 · ${page?.label ?? '页面'}内容`;
}

function labelFor(kind: Binding['kind'], element: any, $: CheerioAPI, context: string): string {
  if (kind === 'image') return `图片 · ${context || '页面素材'}`;
  if (kind === 'link') return `链接 · ${context || '页面链接'}`;
  const tag = element.tagName?.toLowerCase();
  const type = tag?.startsWith('h') ? '标题' : tag === 'label' ? '表单文字' : '正文';
  const raw = $(element).clone().children().remove().end().text();
  const sample = shortContext(raw);
  return `${type} · ${sample || context || '页面文字'}`.slice(0, 100);
}

function sectionFor($: CheerioAPI, element: any, pageKey: string, ids: Map<string, string>): { sectionId: string; sectionLabel: string } {
  const section = $(element).closest('main section, main article, main form').get(0)
    ?? $(element).closest('main').get(0);
  if (!section) {
    const selector = `${pageKey}:main`;
    if (!ids.has(selector)) ids.set(selector, `section-${randomUUID().replaceAll('-', '').slice(0, 12)}`);
    return { sectionId: ids.get(selector)!, sectionLabel: '页面正文' };
  }
  const selector = stableSelector($, section);
  if (!ids.has(selector)) ids.set(selector, `section-${randomUUID().replaceAll('-', '').slice(0, 12)}`);
  const heading = $(section).find('h1,h2,h3').first().text().trim();
  return { sectionId: ids.get(selector)!, sectionLabel: chineseSectionLabel(pageKey, shortContext(heading) || '正文').slice(0, 100) };
}

function slotId(): string {
  return `slot-${randomUUID().replaceAll('-', '').slice(0, 16)}`;
}

function addBinding(bindings: Binding[], pageKey: string, $: CheerioAPI, element: any, kind: Binding['kind'], sectionIds: Map<string, string>, extra: Partial<Binding> = {}) {
  const selector = extra.selector || stableSelector($, element);
  const section = sectionFor($, element, pageKey, sectionIds);
  const context = $(element).closest('section,article,form').find('h1,h2,h3').first().text().trim();
  const binding: Binding = {
    slotId: slotId(),
    label: extra.label || labelFor(kind, element, $, context),
    kind,
    selector,
    sectionId: section.sectionId,
    sectionLabel: section.sectionLabel,
    ...extra,
  };
  bindings.push(binding);
}

function buildBindings(pageKey: string, html: string): Binding[] {
  const $ = load(html);
  const bindings: Binding[] = [];
  const sectionIds = new Map<string, string>();
  const main = $('main');
  if (!main.length) return bindings;

  main.find('img[src]').each((_, element) => {
    const sourcePath = $(element).attr('src');
    if (!sourcePath || /^(?:https?:|data:|blob:)/i.test(sourcePath)) return;
    addBinding(bindings, pageKey, $, element, 'image', sectionIds, { sourcePath, alt: $(element).attr('alt') || '' });
  });
  main.find('[data-gallery-thumb][data-image]').each((_, element) => {
    addBinding(bindings, pageKey, $, element, 'image', sectionIds, {
      selector: stableSelector($, element), sourcePath: $(element).attr('data-image'),
      alt: $(element).attr('data-alt') || '', target: 'gallery',
    });
  });
  main.find('[data-option-image]').each((_, element) => {
    addBinding(bindings, pageKey, $, element, 'image', sectionIds, {
      sourcePath: $(element).attr('data-option-image'), alt: $(element).attr('data-option-alt') || '', target: 'option',
    });
  });

  const editableTags = 'h1,h2,h3,h4,h5,h6,p,li,label,figcaption,dt,dd,blockquote,summary,address,button';
  main.find(editableTags).each((_, element) => {
    const node = $(element);
    if (node.closest('script,style,svg,template').length || node.find('a').length) return;
    if (element.tagName?.toLowerCase() === 'button' && node.attr('aria-label')) return;
    const allText = node.text().replace(/\s+/g, ' ').trim();
    if (!allText) return;
    const blockDescendant = node.find('main,section,article,form,div,p,h1,h2,h3,h4,h5,h6,ul,ol,table').length > 0;
    if (blockDescendant) return;
    const selector = stableSelector($, element);
    const lines = groupsOfText(element);
    const isLines = lines.length > 1 && ($(element).find('br').length > 0 || element.tagName?.match(/^h[1-6]$/));
    if (isLines) {
      addBinding(bindings, pageKey, $, element, 'text', sectionIds, {
        selector, textMode: 'lines', textLines: lines.map((line) => line.join('')),
      });
      return;
    }
    for (const textNode of textNodeEntries(element)) {
      addBinding(bindings, pageKey, $, element, 'text', sectionIds, {
        selector, textNodePath: textNode.path, textMode: 'plain', text: textNode.value,
        label: labelFor('text', element, $, shortContext(textNode.value)),
      });
    }
  });
  main.find('input[placeholder],textarea[placeholder]').each((_, element) => {
    addBinding(bindings, pageKey, $, element, 'text', sectionIds, {
      selector: stableSelector($, element), attribute: 'placeholder', textMode: 'plain',
      text: $(element).attr('placeholder') || '', label: `输入提示 · ${$(element).attr('name') || '表单字段'}`,
    });
  });
  main.find('a[href]').each((_, element) => {
    const node = $(element);
    if (node.closest('header,footer').length) return;
    const href = node.attr('href');
    const label = visibleAnchorLabel($, element);
    if (!href || /^javascript:/i.test(href)) return;
    const editableLinkLabel = !isComplexLink($, element);
    addBinding(bindings, pageKey, $, element, 'link', sectionIds, {
      href,
      editableLinkLabel,
      ...(editableLinkLabel && label ? { linkLabel: label } : {}),
    });
  });

  if (pageKey === 'about') {
    const selector = '.ip-about-hero';
    const sectionId = sectionFor($, $(selector).get(0), pageKey, sectionIds).sectionId;
    bindings.push({
      slotId: slotId(), label: '图片 · About 首屏背景', kind: 'image',
      selector, sectionId, sectionLabel: '页面模块 · About 首屏',
      sourcePath: 'assets/about-hero-v2.webp', alt: 'Netpro sourcing and production studio', target: 'background',
    });
  }
  if (pageKey === 'contact') {
    const sectionId = sectionFor($, $('.contact-layout').get(0), pageKey, sectionIds).sectionId;
    bindings.push({
      slotId: slotId(), label: '图片 · 联系页面背景', kind: 'image',
      selector: '.contact-layout', sectionId, sectionLabel: '页面模块 · 联系页面',
      sourcePath: 'assets/contact-studio.webp', alt: 'Netpro studio', target: 'background',
    });
  }
  return bindings;
}

function inlineBackgroundBindings(pageKey: string, html: string, existing: Binding[]): Binding[] {
  const $ = load(html);
  const main = $('main');
  const additions: Binding[] = [];
  const sectionIds = new Map<string, string>();
  // Reuse persisted module identities where a section already has a binding.
  for (const binding of existing) {
    const section = $(binding.selector).closest('main section, main article, main form').get(0) ?? $('main').get(0);
    if (!section) continue;
    const selector = stableSelector($, section);
    if (!sectionIds.has(selector)) sectionIds.set(selector, binding.sectionId);
  }
  const seenSelectors = new Set(existing.map((binding) => binding.selector));
  main.find('[style*="background-image"]').each((_, element) => {
    const node = $(element);
    // These surfaces are populated from an existing gallery/option image slot at runtime.
    if (node.closest('[data-gallery-thumb], [data-gallery-view], [data-headwear-options], .custom-product-thumb-art').length) return;
    const style = node.attr('style') || '';
    const match = style.match(/background-image\s*:\s*url\((?:\s*["']?)([^"')]+)(?:["']?\s*)\)/i);
    const sourcePath = match?.[1]?.trim();
    if (!sourcePath || /^(?:https?:|data:|blob:)/i.test(sourcePath)) return;
    const selector = stableSelector($, element);
    if (seenSelectors.has(selector)) return;
    seenSelectors.add(selector);
    const section = sectionFor($, element, pageKey, sectionIds);
    const label = node.attr('aria-label')?.trim() || shortContext(node.closest('figure').text()) || '页面背景图片';
    additions.push({
      slotId: slotId(), label: `图片 · ${shortContext(label) || '页面素材'}`.slice(0, 100), kind: 'image',
      selector, sectionId: section.sectionId, sectionLabel: section.sectionLabel,
      sourcePath, alt: node.attr('aria-label') || '', target: 'inline-background',
    });
  });
  return additions;
}

type TemplateRecord = Record<string, string>;
type BindingRecord = Record<string, Binding[]>;

const args = new Set(process.argv.slice(2));
const initialize = args.has('--init-bindings');
const refreshTemplates = args.has('--refresh-templates');
const addInlineBackgrounds = args.has('--add-inline-background-bindings');
const normalizeLinkBindings = args.has('--normalize-link-bindings');
if ([initialize, refreshTemplates, addInlineBackgrounds, normalizeLinkBindings].filter(Boolean).length > 1) throw new Error('Choose one page-binding migration mode.');

const currentTemplates: TemplateRecord = {};
for (const page of SITE_PAGE_MANIFEST) {
  currentTemplates[page.pageKey] = readFileSync(path.join(root, page.route.slice(1)), 'utf8');
}

function validateBindings(templates: TemplateRecord, bindings: BindingRecord): number {
  let total = 0;
  for (const page of SITE_PAGE_MANIFEST) {
    const html = templates[page.pageKey];
    const pageBindings = bindings[page.pageKey];
    if (!html || !Array.isArray(pageBindings)) throw new Error(`Generated page contract is missing ${page.pageKey}.`);
    const $ = load(html);
    const ids = new Set<string>();
    for (const binding of pageBindings) {
      total++;
      if (!binding.slotId || !binding.sectionId || ids.has(binding.slotId)) throw new Error(`${page.pageKey}: missing or duplicate fixed slot/section ID.`);
      ids.add(binding.slotId);
      const found = $(binding.selector);
      if (found.length !== 1) throw new Error(`${page.pageKey}: fixed binding ${binding.slotId} selector matches ${found.length} nodes.`);
      if (binding.kind === 'text' && binding.textNodePath) {
        const target = found.get(0)!;
        const path = binding.textNodePath.split('.').map(Number);
        let node: any = target;
        for (const childIndex of path) node = node?.children?.[childIndex];
        if (node?.type !== 'text') throw new Error(`${page.pageKey}: text-node path for ${binding.slotId} no longer resolves to text.`);
      }
      if (binding.kind === 'link' && binding.editableLinkLabel === false && binding.linkLabel !== undefined) {
        throw new Error(`${page.pageKey}: complex link ${binding.slotId} must not expose a label field.`);
      }
    }
  }
  return total;
}

if (initialize) {
  if (existsSync(bindingsJsonPath)) throw new Error('Fixed page bindings already exist; refusing to regenerate persisted slot identities.');
  const bindings: BindingRecord = {};
  for (const page of SITE_PAGE_MANIFEST) bindings[page.pageKey] = buildBindings(page.pageKey, currentTemplates[page.pageKey]);
  const total = validateBindings(currentTemplates, bindings);
  writeFileSync(templateJsonPath, `${JSON.stringify(currentTemplates)}\n`, 'utf8');
  writeFileSync(bindingsJsonPath, `${JSON.stringify(bindings)}\n`, 'utf8');
  writeFileSync(templatesPath, `/** Controlled snapshot; refresh only with scripts/build-page-bindings.ts --refresh-templates. */\nimport templateData from './legacyTemplates.generated.json';\nexport const LEGACY_TEMPLATES: Record<string, string> = templateData;\n`, 'utf8');
  writeFileSync(bindingsPath, `/** Persisted fixed selector contract. Slot/section IDs are independent UUIDs and must not be regenerated. */\nimport bindingData from './pageBindings.generated.json';\nexport type GeneratedPageBinding = ${bindingType};\nexport const PAGE_BINDINGS: Record<string, GeneratedPageBinding[]> = bindingData as Record<string, GeneratedPageBinding[]>;\n`, 'utf8');
  console.log(`Initialized ${Object.keys(bindings).length} fixed page templates with ${total} stable slot IDs.`);
} else {
  if (!existsSync(bindingsJsonPath) || !existsSync(templateJsonPath)) {
    throw new Error('No generated contracts exist. Run once with --init-bindings before CMS import.');
  }
  const savedBindings = JSON.parse(readFileSync(bindingsJsonPath, 'utf8')) as BindingRecord;
  if (addInlineBackgrounds) {
    let added = 0;
    for (const page of SITE_PAGE_MANIFEST) {
      const current = savedBindings[page.pageKey];
      const additions = inlineBackgroundBindings(page.pageKey, currentTemplates[page.pageKey], current);
      current.push(...additions);
      added += additions.length;
    }
    const total = validateBindings(currentTemplates, savedBindings);
    writeFileSync(bindingsJsonPath, `${JSON.stringify(savedBindings)}\n`, 'utf8');
    writeFileSync(bindingsPath, `/** Persisted fixed selector contract. Slot/section IDs are independent UUIDs and must not be regenerated. */\nimport bindingData from './pageBindings.generated.json';\nexport type GeneratedPageBinding = ${bindingType};\nexport const PAGE_BINDINGS: Record<string, GeneratedPageBinding[]> = bindingData as Record<string, GeneratedPageBinding[]>;\n`, 'utf8');
    console.log(`Added ${added} inline-background image slots to the persisted binding contract (${total} total slots).`);
    process.exit(0);
  }
  if (normalizeLinkBindings) {
    let changedLinks = 0;
    for (const page of SITE_PAGE_MANIFEST) {
      const $ = load(currentTemplates[page.pageKey]);
      for (const binding of savedBindings[page.pageKey]) {
        const beforeLabel = binding.sectionLabel;
        binding.sectionLabel = chineseSectionLabel(page.pageKey, beforeLabel);
        if (beforeLabel !== binding.sectionLabel) changedLinks++;
        if (binding.kind === 'link') {
          const target = $(binding.selector).get(0);
          if (!target) throw new Error(`${page.pageKey}: link binding ${binding.slotId} no longer matches the source template.`);
          const editableLinkLabel = !isComplexLink($, target);
          const linkLabel = visibleAnchorLabel($, target);
          const before = JSON.stringify([binding.editableLinkLabel, binding.linkLabel]);
          binding.editableLinkLabel = editableLinkLabel;
          if (editableLinkLabel && linkLabel) binding.linkLabel = linkLabel;
          else delete binding.linkLabel;
          if (before !== JSON.stringify([binding.editableLinkLabel, binding.linkLabel])) changedLinks++;
        }
      }
    }
    const total = validateBindings(currentTemplates, savedBindings);
    writeFileSync(bindingsJsonPath, `${JSON.stringify(savedBindings)}\n`, 'utf8');
    writeFileSync(bindingsPath, `/** Persisted fixed selector contract. Slot/section IDs are independent UUIDs and must not be regenerated. */\nimport bindingData from './pageBindings.generated.json';\nexport type GeneratedPageBinding = ${bindingType};\nexport const PAGE_BINDINGS: Record<string, GeneratedPageBinding[]> = bindingData as Record<string, GeneratedPageBinding[]>;\n`, 'utf8');
    console.log(`Normalized ${changedLinks} persisted link/module-label records while preserving all slot and section IDs (${total} total bindings).`);
    process.exit(0);
  }
  const total = validateBindings(currentTemplates, savedBindings);
  const savedTemplates = JSON.parse(readFileSync(templateJsonPath, 'utf8')) as TemplateRecord;
  const changed = SITE_PAGE_MANIFEST.filter((page) => savedTemplates[page.pageKey] !== currentTemplates[page.pageKey]);
  if (refreshTemplates) {
    writeFileSync(templateJsonPath, `${JSON.stringify(currentTemplates)}\n`, 'utf8');
    console.log(`Refreshed ${changed.length} source snapshots after validating ${total} existing fixed bindings; no slot IDs changed.`);
  } else if (changed.length) {
    throw new Error(`Source HTML differs from the controlled snapshot (${changed.map((page) => page.route).join(', ')}); validate old bindings then run --refresh-templates.`);
  } else {
    console.log(`Page contract passed: ${Object.keys(savedBindings).length} pages, ${total} fixed bindings; no files rewritten.`);
  }
}
