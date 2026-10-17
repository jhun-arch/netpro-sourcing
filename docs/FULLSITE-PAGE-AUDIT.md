# 全站页面与模板审计

审计日期：2026-10-17。范围是实验分支中的根级 HTML、静态资源同步规则、页面脚本与样式、现有 Next.js 路由外壳和页面交互。此文档只记录只读盘点；未运行浏览器或构建，未连接/写入 Sanity，也未改动 Production。

## 结论

仓库有 39 个根级 `.html` 源文件：`index.html` 是当前 App Router 首页模板来源，`scripts/sync-legacy-public.mjs` 明确排除它；其余 38 个 HTML 被复制到 `public/`，保留原 `.html` URL。38 个里有 37 个实际内容页，另有 `checkout.html` 仅将浏览器跳转到 `quote.html`。

这些页面不是一套通用文章模板：存在 6 个公司/内容页、一个商品目录、23 个同族定制产品页、一个独立的定制补丁导流页、Contact/Quote/确认流程、两份法律文本、404 和结账旧书签转向。特别是 `case-studies.html` 目前的页面标题和导航名称是 “Product”，首屏是 “Start with the product.”，内容是产品方向展示和详情弹窗，不是案例研究页面。仓库没有 `quality.html` 或 `custom-product-manufacturing.html`；质量检查内容分散在 `about.html`、`how-it-works.html`、`buying-guide.html` 和各定制产品页。

推荐保留原 `.html` 路由和英文页面 DOM/CSS/JS，以 repo 内受控模板生成 React DOM，只将编辑文案、媒体、替代文本、链接和经审核的产品/页面资料放入有类型的 Sanity 字段。现有首页文档、首页页脚和业务脚本的产品/询价身份不可被全站迁移 seed 覆盖。

## 路由清单

| 路由 / 源文件 | 页面实际用途与模块 | 专属资源 / 复杂度 |
|---|---|---|
| `/`（`index.html`） | 首页；当前由 App Router 提供，旧 HTML 仍是受控模板来源。 | 首页已有 `homePage` CMS 文档和首页页脚绑定；不要以旧静态页脚覆盖。 |
| `/about.html` | 公司介绍与 sourcing 能力；H1 “Your Product Vision. Our Sourcing Expertise.” | `inner-pages.css/js`、`about-editorial.css/js`；中。 |
| `/case-studies.html` | 当前导航名/标题为 “Product”；产品方向展示、细节卡片和原生 `<dialog>`。 | `inner-pages.css/js`、`showcase.css/js`；中。模板名应按实际用途解释。 |
| `/how-it-works.html` | 定制流程、打样及工艺介绍；H1 “Your Product, Made Your Way.” | `inner-pages.js`、`customization-process.css`；中。不是单独的 Quality 页面。 |
| `/what-we-do.html` | 产品 sourcing 服务范围、品类支持、设计与交付协作。 | `inner-pages.css/js`；中。 |
| `/trends-digest.html` | Digest 封面、趋势故事和两处下载入口；下载 `/assets/netpro-trends-digest.txt`。 | `inner-pages.css/js`；中。下载资产与页面内容要一起维护。 |
| `/buying-guide.html` | 订单指导、原生 `<details>` FAQ、项目准备清单。 | `services.css/js`；中。MOQ、交期、质检和认证答案属于需审核的业务声明。 |
| `/shop.html` | 商品目录；类别/颜色/尺码筛选、排序、分页、商品弹窗和 enquiry 入口，URL 保留 `?category=` / `?style=`。 | `products.js`、`app.js`、`enquiry-state.js`、`shop-catalog.css`；高。 |
| `/custom-t-shirts.html`、`/custom-sweatshirts.html`、`/custom-hoodies.html`、`/custom-varsity-jackets.html`、`/custom-jerseys.html` | 5 个服装类定制产品页。 | 共用定制产品模板与 `custom-products.js/css`；高但复用收益高。 |
| `/custom-baseball-caps.html`、`/custom-visors.html`、`/custom-camper-hats.html`、`/custom-beanies.html`、`/custom-trucker-caps.html`、`/custom-snapbacks.html`、`/custom-dad-hats.html`、`/custom-bucket-hats.html` | 8 个头饰类定制产品页。 | 同上；gallery/lightbox、工艺资料、产品特有规格及询价 CTA。 |
| `/custom-ankle-socks.html`、`/custom-crew-socks.html`、`/custom-athletic-socks.html`、`/custom-knee-high-socks.html`、`/custom-no-show-socks.html`、`/custom-novelty-socks.html`、`/custom-wool-socks.html`、`/custom-compression-socks.html` | 8 个袜类定制产品页。 | 同上；产品特有的尺寸/织法/检查细节不能被通用文案误覆盖。 |
| `/custom-tote-bags.html`、`/custom-backpacks.html` | 2 个包袋类定制产品页。 | 同上。 |
| `/custom-patches.html` | 四种补丁工艺说明并导流至外部 NetproPatches。 | `customization.css`、`services.js`；单独模板。`app.js` 根据外链类型打开导流对话框；不是普通 quote landing。 |
| `/contact.html` | 联系信息与 Contact 表单。 | `contact.js`、`submission-confirmation.js`、`/api/contact`；高（发送/回执流程）。 |
| `/quote.html` | 产品 shortlist、stock/custom 请求编辑、项目资料、附件上传与 Quote 提交；允许无商品直接咨询。 | `products.js`、`quote.js`、`submission-confirmation.js`、`checkout.css`、`/api/quote`；高。 |
| `/submission-success.html` | Contact/Quote 提交后的本地收据和下一步。 | `submission-confirmation.js`、`submission-success.css`；中。页面 noindex；收据使用 sessionStorage，最多保留 30 分钟。 |
| `/checkout.html` | 已退役旧地址；HTML meta refresh 即时转到 `quote.html`，没有业务页面、导航、页脚或脚本。 | 作为旧书签兼容路由保留。 |
| `/privacy-policy.html`、`/terms.html` | 隐私和条款正文；另有 `/privacy-policy`、`/terms` 两个 Next rewrite 别名。 | `services.js` 与共用页样式；法律文本需显式版本/审核。 |
| `/404.html` | 自定义 Page Not Found，有导航、页脚及 `noindex`。 | 低；要同时保留直达 `/404.html` 与应用未知路由的 404 行为。 |

分组计数为：首页 1；公司/内容页 6；Shop 1；23 个标准定制产品页；独立 custom patches 1；Contact、Quote、成功页 3；法律页 2；404 1；checkout 转向 1，共 39 个源文件。

## 可复用布局与共享资源

- **导航和页脚：**除无 shell 的 `checkout.html` 外，其余 38 个 HTML 都在源 HTML 中直接包含导航与页脚；它们都不是由 `app.js` 插入。37 个非首页文件的 footer markup 相同；`index.html` footer 是单独版本，其品牌链接为 `#home`（旧内页用 `index.html#home`），目前首页 footer 已由 `homePage` CMS 管理。不要重建或覆盖首页的 footer 内容。
- 32 个 HTML 文件共用完全相同的 `site-header` markup。`about.html`、`case-studies.html`、`how-it-works.html`、`trends-digest.html`、`what-we-do.html` 在 About 导航的当前项加 `aria-current="page"`；首页品牌链接用 `#home`。导航目标基本一致，适合做一个带当前页面状态和首页链接选项的代码组件。移动菜单使用 `<details>`，桌面定制导航使用 tabs/tabpanel；保留两个版本的键盘/ARIA 行为。
- 各页面 `body` class 是 CSS/脚本条件的一部分：`home-page`、`inner-page`、`about-editorial-page`、`product-showcase-page`、`about-page`、`custom-product-page`、`contact-page`、`shop-page`、`checkout-page`、`quote-page`、`submission-success-page`。迁移到 Next 时按路由恢复原 class；不要把当前首页 layout 的 `body.home-page` 套到所有页面。
- 共用静态层主要是 `styles.css`、`typography.css`、`b2b.css`、`motion.css`、`refinements.css`、`inner-typography.css`、`site-footer.css`、`link-motion.css`。按族加载的资源包括 `inner-pages.css/js`、`services.css/js`、`custom-products.css/js`、`about-editorial.css/js`、`customization-process.css`、`showcase.css/js`、`shop-catalog.css`、`submission-success.css`、`checkout.css`、`customization.css`、`site-closing-cta.css`。各文件 query version 参数是现有缓存约定，搬运时须保留路径/顺序或有对应替代策略。
- 全部 39 个根级 HTML 中有 **0 个内联 `<script>`**；源文件里的外部脚本都带 `defer`。各页面按自身依赖排列 GSAP/ScrollTrigger、`enquiry-state.js`、`app.js`、导航/动效与页面专属脚本；脚本先后次序存在页面差异，迁移应逐页保留。`app.js` 本身不依赖 `DOMContentLoaded` 事件，而是在脚本执行时查询并绑定当前 DOM；它只启动一次，没有 App Router 路由生命周期的重绑入口。它会动态插入 WhatsApp 控件和 search/bag/custom-style/patch 对话框，但不创建 footer。
- `app.js` 先检查 `window.NETPRO_PRODUCTS`：存在数组则直接启动旧业务逻辑；不存在时才加载 `products.js`。因此未来可由服务端渲染的 CMS catalog 数据预置这个全局，再复用原业务代码，但必须保留 `id`、分类、size、customization URL、意图和 enquiry-state 兼容。现有 HTML 内 `<script defer>` 的逐文档启动语义最容易由普通 `<a>` 完整导航保留；若改用客户端转场，必须另加明确的初始化/清理生命周期。
- `scripts/sync-legacy-public.mjs` 根据 `scripts/legacy-public-manifest.json` 复制所有已跟踪的非首页根 HTML、根 CSS/JS 和 `assets/` 到 `public/`，并在同步时重建整个 `public/`。新增 App Router 页面接管某 `.html` 路径时，应同步停止将该路径的 HTML 发布到 `public/`，继续保留源文件作为模板；避免静态文件和页面路由争夺同一 URL。`next.config.ts` 现有 `/index.html -> /`、`/privacy-policy -> /privacy-policy.html`、`/terms -> /terms.html` 也须纳入路由表。

## Sanity 内容与代码责任边界

**适合 CMS 管理的内容：**

- 6 个公司/内容页的 SEO title/description、标题、段落、图片及 alt、卡片/步骤列表、FAQ 问答、CTA 文案和链接；页面模块种类、DOM 顺序、设计布局由模板代码确定。
- 23 个定制页的产品名称/slug、获准公开的规格说明、图片图库/alt、工艺说明、包装信息、应用场景、FAQ 和 CTA；将稳定产品身份作为引用键，避免按标题或数组顺序造 ID。
- 商品目录中由业务确认可公开编辑的名称、品类、展示色/尺码、图片及 alt；catalog 与 23 个定制页应通过固定 `productId` 关联，且 Shop filter URL、quote line 与历史 enquiry 使用同一个稳定 ID。
- 已审核的站点导航文字/链接和 37 个重复页脚的共享文字/链接可以考虑作为一个站点设置文档。首页已有 footer 字段属于现存 `homePage` 内容；合并为共享设置前需非破坏性迁移、比对并保留原 `_key`/revision，不得 seed 覆盖。
- Trends Digest 的文案和故事可结构化管理；当前下载是实际静态 `.txt` 资产，应同步发布/校验下载内容和可访问路径。

**必须由代码维护：**

- CSS、DOM 节点/顺序、class/id/aria/data hooks、断点、布局、GSAP 和交互参数、图片裁切实现、HTML 模板，以及 route 到内容文档的映射。
- API/表单 payload 与错误约定、联系/报价提交、验证/限流/幂等/邮件、附件类型与 3 件/2 MB 限制、库存/stock-custom 意图逻辑、数量边界、浏览器询价状态、成功收据和外部跳转。
- `productId` 的不可变身份、catalog schema/query/renderer 的一致性校验和安全字段投影。当前 `products.js` 的说明明确指出现货可用性和规格由报价确认；它不提供实际库存或承诺价，不得仅因后台可编辑就声称库存、MOQ、交期或认证已经确认。
- Terms/privacy 正文可以结构化入 CMS，但发布过程需保留审核人/版本记录；质量、交期、MOQ、环保标准、材料和折扣声明均须按真实业务口径批准。不要通过模板或 AI 自动生成新的事实承诺。

现有 Sanity 试点只提供 `homePage` 内容类型；此审计没有连接 CMS 或新增/修改文档类型。

## 最小无重设计迁移次序

1. **先固定路由和受控 shell。**保留所有 `.html` 路径、资源根路径、查询参数、现有公共 CSS/JS 和当前首页实现。为旧页建立单独 route group/layout，按路径输出正确 `body` class；把 32 份共用导航收敛为代码组件并提供 `aria-current`，37 份共用内页 footer 复用一份。首页继续由现有首页 renderer/footer 字段负责。普通 `<a>` 完整导航先维持老脚本启动语义。
2. **迁移低业务风险的内容页。**用各自受控模板承接 `about.html`、`what-we-do.html`、`how-it-works.html`、`buying-guide.html`、`trends-digest.html` 和实际 Product 展示页 `case-studies.html`；逐页把文案/媒体绑定到 Sanity，完整保留原 hooks、页序、下载文件和详情弹窗。
3. **复用一个定制产品模板接入 23 个商品页。**为每个现有 `.html` 建固定 route→稳定 product document 映射；不同类别的规格/图片和 FAQ 只做数据，不让 CMS 改变 DOM 结构。`custom-patches.html` 保持独立导流模板。
4. **迁移 Shop catalog 并验证 enquiry 边界。**先把稳定 `productId` 与 stock/custom 行、`enquiry-state.js` 本地数据、Shop 深链和 quote summary 对齐；迁数据时不得改动既有业务 API/持久化格式。
5. **最后接入 Contact/Quote/confirmation。**保持 `/api/contact`、`/api/quote`、Pages API 薄包装、文件限制与状态反馈；成功页只读当前会话的临时收据并保留 noindex。法律文本与 404/checkout 可使用简单页模板，但需保留 legal alias 和旧 redirect。

每一步只替换字段的数据来源，不重排或重画现有布局。页面模板和 CMS schema 以显式类型/字段绑定为边界，不在 Studio 提供 HTML、CSS 或 JavaScript 编辑。

## 主要风险

1. **双路由发布冲突：**迁移页仍被同步进 `public/`；当前同步会重建 public，清单必须与已接管的页面路由保持一致。
2. **首页样式泄漏：**当前 `app/(site)/layout.tsx` 固定 `body.home-page` 并导入首页 CSS 及 `LegacyScripts`；不可直接用作所有旧页面共享 layout。
3. **客户端切页不会重新执行 legacy bootstrap：**`app.js` 和页面脚本绑定 DOM 一次。用 Next `<Link>` 时老事件监听会继续指向旧 DOM，或页面脚本不再执行；先保留完整导航或实现可重复初始化/清理机制。
4. **询价身份/数据不一致：**catalog ID、category、sizes、`customizationHref`、stock/custom 意图与 enquiry line 绑定。更改产品 slug/title 不得重建产品 ID；必须沿用项目要求的稳定 `productId` 并测试从 Shop 到 Quote 的记录内容。
5. **URL/SEO 变更：**`.html` 深链、`/privacy-policy`/`/terms` 别名、`/checkout.html` 重定向、`/404.html` 与默认 not-found 都是独立行为。内链还使用相对路径和 query 参数，不能只验首页地址。
6. **内容误承诺：**页面包含 MOQ、价钱、交期、质检、标准与促销说法；CMS 编辑必须经过业务审核，现货描述不得被误用为实时库存。
7. **首页 CMS 数据所有权：**homePage 首页 footer 已真实接 CMS，禁止使用静态重复 footer seed 覆盖；共享导航/页脚抽取需先比对现有发布内容并迁移引用。

## 盘点依据与未做事项

盘点依据：根 `*.html` 和 `scripts/legacy-public-manifest.json`；`scripts/sync-legacy-public.mjs`、`next.config.ts`、`app/(site)/layout.tsx`、`app/(site)/LegacyScripts.tsx`、`products.js`、`app.js` 与页面专属 JS/CSS。Next 路由建议参考本地 `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`、`.../03-api-reference/03-file-conventions/route-groups.md` 与 `.../page.md`：路由由文件系统定义，layout 负责共享 UI，route group 不改变 URL。

未运行 build、自动化测试或浏览器验收；没有做 CMS schema/数据改动，也没有修改页面、资源、API 或部署配置。
