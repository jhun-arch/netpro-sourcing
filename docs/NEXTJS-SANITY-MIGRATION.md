# Next.js App Router + Sanity 首页试点

本文记录实验边界、实施方案和维护约定，并标明当前已验证的范围。它不代表已完成浏览器预览、邮件发送或 Production 部署。

## 当前实现状态

- Next.js App Router 首页、独立 `/studio`、静态旧页/资源同步和 Pages API 薄包装已落盘；首页通过拆分的旧 HTML 模板和显式内容绑定保留原 DOM hooks、CSS 与脚本行为。
- 独立 Sanity 项目 `5mntophk` 的 `production` dataset 已导入首页 singleton 与源图片。导入包含 27 个图片资源、19 个图库项、4 个品类、3 个流程步骤和 6 个 FAQ；seed 使用 `createIfNotExists`，不会覆盖后续编辑。数组对象缺失的 `_type` 已由主代理按 `_key` 和 revision guard 做字段级修复。
- `src/cms/contracts.ts` 递归展开 Sanity schema，并直接检查 renderer 的深层绑定路径；查询必须返回未投影的完整 singleton。CMS 测试覆盖字段缺失负例、稳定身份和 seed `_type`。
- 本地 CMS tests、typecheck、contract check 和 Next build 已通过；既有 31 个业务测试由基础设施代理验证通过。完整浏览器视觉和交互检查由主代理负责。
- Preview/CORS 握手尚未完成浏览器验证；CORS 管理权限需要用户本人添加准确起源。独立 Vercel 项目没有邮件发送环境，实验邮件发送未配置、未测试。未部署 Production。

## 已确认基线与当前状态

- GitHub 仓库：jhun-arch/netpro-sourcing。
- 已确认 Production deployment：dpl_ErniJL5W5ypaPdUE6kmAidi91uMF。
- Production URL：https://netprosourcing-qqoyodtgw-junhil.vercel.app。
- 此部署源码 SHA：9341d2eec51667abd334ec5064b9db6b992af1bf。
- 本地 main 与远端 main：c1ef6c49157646cd5155d028cf446dcaeb567185。
- 实验工作树：D:\Users\Administrator\Documents\ChatGPT\NetPro-nextjs-sanity。
- 实验分支：experiment/nextjs-sanity，基于上述首页来源 SHA 建立。
- 用户已接受 Marketplace 条款；Sanity 免费 Marketplace resource 和 installation 已创建（resource ID ir_c260Hhq0yX0rvCVk，installation ID icfg_RBsQgcvP2JTY2UW7vqqGcOf7，external resource ID res-01sh185w1gxc1uvm）。
- Sanity projectId 为 5mntophk，是新建且独立的实验项目；其公开 dataset 名为 production。此名称不表示使用了现有 Sanity Production 项目或 Vercel Production 数据。
- 独立 Vercel project netpro-nextjs-sanity-experiment 已创建，当前仅配置 preview/development；不得更改现有 netprosourcing project。
- 环境变量名为 NEXT_PUBLIC_SANITY_PROJECT_ID、NEXT_PUBLIC_SANITY_DATASET、SANITY_API_READ_TOKEN、SANITY_API_WRITE_TOKEN。token 只允许服务端或受控 seed 从环境安全读取，不得打印或记录。
- read token 权限为 viewer，write token 权限为 editor。CORS 管理请求返回 401；主代理会请用户本人添加准确的 localhost 和 Preview origins，不扩大授权。
- 上述 seed 结果是本次已完成的内容读写；Studio 编辑、草稿 handshake、CORS 与浏览器视觉仍需主代理验证。不要把已导入内容说成已验证的完整 preview 或部署流程。
- 当前 registry 可见版本：Next 16.4.2、Sanity 6.19.0、next-sanity 13.3.4、React 19.2.3、@sanity/locale-zh-hans 2.1.40；安装时按兼容矩阵重新解析并锁定。Studio 使用 Sanity 中文 locale 包，不使用 next-intl。
- 首页 SEO head 在 index.html:1-24；现有 OG image 是已跟踪的 assets/hero.png，首屏主图为 assets/hero.webp。
- 不因 OG image 与首屏使用不同文件格式而判断资源缺失；改动前分别核对既有 SEO 意图。

## 目标与非目标

第一阶段只迁移首页到 Next App Router，并把首页可编辑内容接入真实 Sanity。
保留页面设计、CSS、JS、GSAP/ScrollTrigger 和既有业务行为，不重写业务。

范围包括首页文案、图像、alt、CTA、SEO 文本、Studio 首页编辑入口、
已发布内容读取、草稿预览安全边界、旧 .html URL 与现有 API 兼容。

不迁移商品目录、库存、结算、定制申请或询价邮件业务。
不连接 Production Sanity/Vercel，不迁移 Production 数据，也不部署 Production。
不把布局、样式、DOM hook、断点、色值或动画参数做成 CMS 字段。

## 最小组件边界

| 组件 | 职责 | 必须保留的 DOM hook |
| --- | --- | --- |
| SiteHeader、GlobalDialogs、SiteFooter | 导航、搜索/询价对话框、页脚 | .site-header、#search-dialog、#bag-dialog |
| Hero | 图片轮播、标题、导语、CTA、滚动提示 | .hero、.hero-photo、#hero-title |
| CollectionIntro、CategoryAccordion | 产品故事和四类品类入口 | .home-story、.accordion、[data-category]、#panel-* |
| ProcessSteps | 三步介绍、配图、CTA | .home-process、[data-process-toggle/image] |
| StartingPoints | Ready Stock 与 Custom Production 卡片 | .home-starting-points、.service-grid |
| BrandStory、ProductGallery | 介绍、类别筛选、图片链接长廊 | [data-home-about]、[data-home-gallery]、[data-gallery-item] |
| WhyNetpro | 六项服务优势及滚动进度 | [data-home-why]、[data-why-item] |
| HomeFaq、ClosingCta | 联系引导、FAQ、末尾 CTA | [data-home-faq]、.home-faq-toggle、.closing-cta |

原始模块范围：index.html:123-175 为 Hero 和品类；
178-279 为流程和起点；281-386 为品牌故事和图库；
388-491 为优势、FAQ 和末尾 CTA；493-570 为页脚。
图库有 19 个源图项；home-sections.js:17-32 会克隆源组形成循环，
CMS 只保存一份源数组，不保存克隆副本。

## Singleton 与字段设计

固定文档类型 homePage、固定 singleton _id homePage；projectId 为 5mntophk，dataset 为 production。
这是全新隔离实验项目内的 dataset，不得改名或与现有 Production 混淆。

建议字段分组：

| 分组 | 可编辑内容 |
| --- | --- |
| seo | title、description、OG title/description/image；canonical 受控或经审核 |
| hero | titleLines、body、slides[]、primaryCta、secondaryCta |
| collection | eyebrow、title、body、cta、categories[] |
| process | title、body、steps[]、ctas[] |
| startingPoints[] | title、body、image、imageAlt、cta |
| brandStory | title、body、cta、gallery[] |
| benefits[] | title、body、代码白名单 iconKey |
| faq | contactTitle/body/cta、items[]、guideCta |
| closingCta | title、cta |
| footer | 描述、联系信息、社交链接、链接组、legal 链接 |

- 排序数组使用 Sanity 自动生成的 _key 作为 React key；写入后不重建。
- 每项另设固定 slug；品类为 clothing、socks、headwear、patches。
- 流程 slug 为 brief、proof、production；benefit/FAQ 也设稳定 slug。
- 标题或排序变动不改变 _key/slug；流程标题、说明与图片放在同一对象。
- _key 由 Sanity 管理，renderer 以它定位数组项；隐藏 slug 用稳定的随机初始值创建，不按标题或索引重建。renderer/Studio 不允许编辑 `_key`、`_type` 等技术标记。
- 图片字段包含 asset、alt 和所需 crop/hotspot；不按文件名生成 alt。
- CTA 含 label、href；内部路径沿用根级 .html 或明确锚点。
- 外链校验协议与目标域，并保留安全的 target/rel 行为。
- class、id、aria/data hook、CSS 样式和动画参数继续由代码维护。

## 页面渲染与旧站兼容

App Router 的 root layout 负责现有全局 CSS 和 body.home-page；
首页 Server Component 读取 published homePage 并生成保留原 DOM hook 的 markup。
先保持 HTML 结构，再逐模块接入数据；不改动样式与动效实现来迁就 CMS。

现有 home-process.js、home-sections.js 和 app.js 直接查询 DOM，
且 app.js 会克隆节点、创建 dialog 交互、启动 GSAP 与 ScrollTrigger。
这些脚本须在 hydration 后按依赖顺序初始化，并在卸载时清理监听器、
IntersectionObserver、定时器和 ScrollTrigger；App Router client transition
不会自动重跑传统 defer 脚本。若仍通过客户端脚本加载，缺少 GSAP 时应降级。

仓库有 39 个根级 .html 页面。首页改为 / 后，其余 38 个页面仍需保持
/shop.html、/quote.html、/how-it-works.html 等原路径。
将非首页 HTML、静态 JS/CSS、products.js 与 assets 映射到 public 根路径，
或配置等价的 Vercel rewrites；避免以 public/index.html 覆盖 App Router /。
检查 HTML、CSS url()、JS 动态加载中的相对路径，确保仍可访问 /assets/...。

现有 CSS 中有相对 assets URL，尤其 styles.css 字体和 home-studio.css
品类背景；需验证构建输出保留资源路径与加载顺序。
category 图片是 CSS background，类别 slug 与 data-category 必须一致。

## API 兼容

客户端使用 POST /api/contact 和 /api/quote；仓库根 api/contact.js、
api/quote.js、api/purchase.js 是 Vercel Node req/res handlers。
Next App Router 不会自动把仓库根 api/ 变成 App Route。

短期建立 pages/api/contact.js、pages/api/quote.js、pages/api/purchase.js
薄包装并委托原 handler，保留 Node runtime、body parsing、请求大小限制、
状态码、JSON 错误、校验、honeypot、限流、幂等和邮件行为。
检查包装与 readBody 约定一致；quote 附件约束为最多 3 个、合计最多 2 MB。
不得复制或重写业务 handler；首页试点不改变现有表单 payload/API 契约。

## 实施阶段与验收

### 0. 基线和隔离

- 确认分支和基础 SHA，保留用户现有改动边界。
- 盘点首页资源、DOM hook、静态 URL、API handler 与既有业务 tests。
- Marketplace 条款或账号认证需要本人操作时暂停，由用户本人完成。
- 验收：实验分支隔离明确；无 Production 写入；无凭据进入文件或输出。

### 1. Next 首页骨架与静态兼容

- 建立 App Router root layout 和首页路由，保留 CSS 顺序及 body.home-page。
- 映射旧静态页面、资源和现有 API URL。
- 验收：/ 渲染首页；.html、资源、查询参数和 /api/* 路径可用。
- 验收：关键 class/id/aria/data hook 与现有 DOM 对应。

### 2. Sanity 实验环境与 Studio

- 使用已就绪的 projectId 5mntophk 与 dataset production；写入内容前确认只指向此新实验项目。
- 建立 homePage singleton、schema、稳定 slug 和唯一 Studio 首页入口。
- 导入前保存 HTML 内容快照；导入可重复执行且不覆盖后续编辑。
- 验收：访问范围仅限实验数据，无生产 project/dataset/token 绑定。

### 3. Query、类型、contract 与展示

- Server Component 查询 published homePage，提供安全的空内容/读取失败处理。
- 自动检查 renderer 使用的深层字段存在于 schema，且 GROQ query 仍返回完整 singleton；测试包含删除 `hero.body` 后必须失败的负例。类型检查另由 TypeScript 执行。
- 接入文案和图片数据，保留 DOM hook、CSS、GSAP 与 reduced-motion。
- 验收：published 内容公开读取；草稿不会从公开 query 输出。

### 4. Preview、SEO 与凭据

- 仅通过认证 Sanity preview handshake 启用 draft mode。
- 公开访问只读 published；token 仅在服务端环境变量中，不用 NEXT_PUBLIC_*。
- Preview/experiment 设置 noindex；canonical 来自受控配置；SEO 去 stega。
- 验收：未认证请求读不到草稿；token 不进客户端；预览不可索引。

### 5. CI 与人工验收

- CI 执行 contract check、typecheck、Next build 和既有业务 tests。
- 核对桌面/移动、键盘/ARIA、reduced-motion、轮播、品类、图库、FAQ 和进度动画。
- 核对旧静态路由、API payload、错误结构、附件大小及既有邮件行为。
- 主代理审核实际 diff、需求覆盖、UI/UX 和验证证据。
- 验收：关键行为延续当前首页，无未授权 Production 操作。

## 风险清单与控制

| 风险 | 控制 |
| --- | --- |
| DOM hook 漂移导致 CSS/脚本失效 | 保留 class/id/aria/data，并用 contract 与浏览器检查覆盖 |
| hydration 与脚本克隆/改写冲突 | hydration 后初始化，禁止 SSR 随机数据，提供 cleanup |
| GSAP 与页面脚本竞态 | 固定依赖顺序，缺库降级，保留 reduced-motion |
| .html 页面/静态资源消失 | public 映射或等价 rewrite，逐项核对原 URL |
| 根 api 不再路由或 body 语义变化 | Pages API 薄包装并验证请求/响应契约 |
| schema/query/types/render 漂移 | 自动 contract check，同提交更新所有接口面 |
| 字段清理导致数据丢失 | 版本化非破坏 migration、dry-run、备份和回滚 |
| 排序使交互配对错误 | 稳定 _key/slug，步骤图片与文案同对象 |
| 草稿、token 或 stega 暴露 | 认证 preview、服务端 token、SEO 去 stega |
| 实验误连 Production | 隔离 project/dataset/config；无证据时不写入 |
| 商品迁移破坏询价关联 | 本期不迁商品；未来以 productId 稳定关联 |

## 长期维护规则

1. 每个公开字段有明确用途、类型、必填/默认策略和展示位置。
2. 字段变更同一改动更新 schema、GROQ、类型、renderer、fixtures、contract 和 tests。
3. 拆分、改名或删除字段必须先有版本化 migration、dry-run、备份和回滚方法。
4. migration 先兼容新旧格式；不得自动删除未知字段，先报告并保留。
5. _key 表示数组项持久身份，slug 表示跨内容/业务引用身份；标题和位置不生成身份。
6. 图片替换检查 alt、焦点裁剪、移动构图、体积和首屏优先级。
7. CTA 内链遵守根级 URL 策略；外链校验协议与域名。
8. 公开访问永远不回退读 draft；preview 授权可撤销，退出时清理状态。
9. SEO 输出去 stega；实验 preview 使用 noindex 和受控 canonical。
10. 定期检查依赖兼容、token 权限、dataset 隔离、备份和 contract 覆盖。
11. 当前版本历史 API 标注 maxRetentionDays 为 90、noVersionRevival；恢复能力须由真实 Studio 确认，不得先承诺 Free 支持。
12. 未来商品必须用唯一 productId 关联库存、stock/custom 请求和 enquiry 历史记录。
13. 交付只报告实际运行的验证；未创建的 CMS/部署资源明确标记未创建。
14. `scripts/repair-home-array-types.ts` 默认只 dry-run；写入必须显式 `--apply`，且只通过数组 `_key` 路径补缺失 `_type`，使用 `_rev` 的 `ifRevisionId` 保护并发编辑。不得改成整文档覆盖或把 seed 当内容更新工具。
