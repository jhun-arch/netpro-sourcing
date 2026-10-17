# Next.js App Router + Sanity 首页试点

## 2026-10-17：Studio 跳转与外部注册

- 实际复现的错误链接位于前端根路径 `/intent/edit/mode=presentation;id=homePage;type=homePage;path=hero.titleLines%3A1?baseUrl=%2F...`，浏览器显示 404。原因是 `createDataAttribute()` 未提供 Studio `baseUrl`，SDK 默认使用 `/`。
- renderer 和 Studio 现在共用 `src/sanity/urls.ts` 的 `/studio`；Presentation 保持同源 `/`，草稿 API 仍为根级 `/api/draft-mode/...`。没有更改 Studio catch-all 路由或引入 `/studio/studio`。官方解码和 `createEditUrl` 回归覆盖标题、正文、轮播图片及分类图片点击面，保留原导航 href。
- 普通内容图片、标题与正文已在真实 Edge 中打开正确字段。Banner 原先被全屏文字层遮挡；草稿专用命中样式让空白区域穿透，图片按 GSAP 实际变换位置命中，公开页面不包含此样式。不能依赖初始 `is-active` 类判断正常轮播中的可见图，原脚本不会持续更新它。减少动态效果模式仍排除隐藏图片。
- 最终背景图也已真实验证：Banner 打开 `hero.slides[_key=="k-hero-shop-banner"].image`，分类图片打开 `collection.categories[_key=="k-category-clothing"].image` 并聚焦图片编辑框。分类父 article 的技术标识编辑绑定已移除；透明图片链接编辑图片，可见 CTA 仍编辑链接，导航 href 不变。已验收代码快照 `cc48bcd`，GitHub CI [38993348617](https://github.com/jhun-arch/netpro-sourcing/actions/runs/38993348617) 成功，覆盖 52 项测试、typecheck、contract 和 build。READY Preview 快照 `dpl_GSWzoP7xgYB7Q3ubDgiQCQRYBB3J`；后续文档提交可产生新 Preview，稳定分支 alias 不变。
- 已使用官方 `sanity deploy --external --url https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app/studio --schema-required --yes --json` 注册现有外部 Studio，项目 `5mntophk`、dataset `production`、workspace `default`，Schema `_.schemas.default` 同步 1/1 成功。`sanity.cli.ts` 固定 appId `lms1plunpquzbvyrpkqshkyb`；后续运行明确返回 `action: update`，不是重复创建。
- Manage Studios 已真实显示唯一 Vercel 条目、6.19.0 与正常 Manifest，点击可进入已登录后台。NextStudio 已自带官方 bridge 脚本，无需重复注入。注册与外部托管规范见 [Sanity 官方文档](https://www.sanity.io/docs/studio/deployment)。
- 注册前后首页文档连 revision 均未变。后续发布测试用空补丁创建内容不变的草稿，认证预览读取草稿 revision `C2mJHPGim6sg1UxmDudE5S`，匿名草稿接口仍返回 401；真实后台发布按钮成功，最终 published revision 为 `Inok3TNKzt158wJXIkG13l`。无遗留 draft，完整非系统内容与注册前备份一致。没有重置、迁移或覆盖已有内容。
- Presentation 首次 iframe 载入偶尔仍会超过 15 秒，属于此前的连接限制；独立认证草稿预览、编辑跳转和发布已验证。不要把 URL 404 修复表述为自动刷新与首次连接问题也已全部解决。

本文记录实验边界、实施方案、已完成验收和后续维护约定。用户已为 localhost 与稳定 Preview origin 设置 CORS 并启用 Allow credentials，真实 Edge Studio 登录、内容编辑、发布、Visual Editing 点选和原生历史还原均已验收。脚本自动刷新仍不稳定，但新 revision 出现后可用绿色原生链接“草稿已更新，点击更新预览”更新 iframe。邮件投递未验证。现有正式站未部署或修改；独立空项目曾触发平台的 Production target，但在 QUEUED 阶段取消且未分配 alias。非技术用户的操作步骤见 [内容编辑指南](CONTENT-EDITOR-GUIDE.md)。

## 当前实现状态

- Next.js App Router 首页、独立 `/studio`、静态旧页/资源同步和 Pages API 薄包装已落盘；首页通过拆分的旧 HTML 模板和显式内容绑定保留原 DOM hooks、CSS 与脚本行为。
- 独立 Sanity 项目 `5mntophk` 的 `production` dataset 已导入首页 singleton 与源图片。导入包含 27 个图片资源、19 个图库项、4 个品类、3 个流程步骤和 6 个 FAQ；seed 使用 `createIfNotExists`，不会覆盖后续编辑。数组对象缺失的 `_type` 已由主代理按 `_key` 和 revision guard 做字段级修复。
- `src/cms/contracts.ts` 递归展开 Sanity schema，并直接检查 renderer 的深层绑定路径；查询必须返回未投影的完整 singleton。CMS 测试覆盖字段缺失负例、稳定身份和 seed `_type`。
- 已验收功能源码 SHA `41f354710fc3fbeea2b77b35680e41e3187edb51` 的 [GitHub Actions 检查](https://github.com/jhun-arch/netpro-sourcing/actions/runs/38878650129)已通过 Next build；业务/部署 guard、CMS 和 renderer 测试均通过，typecheck、contract check、diff check 也通过。首页桌面/移动布局、流程/FAQ/GSAP 行为和旧询价流程另有真实浏览器验收记录；邮件未发送。
- Sanity 草稿握手、无 cookie published 隔离、图片 CDN 可读、真实 `document.publish` 和字段级恢复均已完成。临时 draft 已发布后移除，临时 preview secret 经 revision/source/studio URL guard 清理。当前最终发布内容和 revision 见下方真实 Studio 验收记录。
- 首次 finish 因公开页面在 60 秒内未观察到 CDN 内容而停止；服务端 Sanity client 改为 `useCdn: false` 直读 API 后，finish 续跑成功。保留 HTTP 页面轮询与 revision guard，不把超时或失败状态描述为通过。
- 已验收功能 Preview 快照为 READY：源码 SHA `41f354710fc3fbeea2b77b35680e41e3187edb51`，deployment `dpl_BDTSNEjS2VQGKtciUVnkZwpN7uea`，URL `https://netprosourcing-bgl0z7dhz-junhil.vercel.app`；稳定 branch alias 仍为 `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app`。Production project/deployment/SHA 经 API 再次核对，保持原值。
- 用户已在 [Sanity project API settings](https://sanity.io/manage/project/5mntophk/api) 为 `http://localhost:3000` 与稳定 Preview origin `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app` 配置 CORS 并启用 **Allow credentials**，随后在真实 Edge Studio 登录成功。首页 Studio 导航为“内容管理 → 页面管理 → 首页”，另有“可视化编辑”。
- 因 Sanity StructureBuilder 曾报 `id is required for lists`，根列表和嵌套列表已加稳定 ID；当前通过真实 `StructureBuilder.serialize()` 回归测试验证列表可序列化并含首页入口/迁移说明。Studio 显示中文工具标题；首屏、轮播数组和 FAQ 的预览使用“首屏内容”、图片缩略图/中文 fallback、question 文本，减少技术 slug 暴露。未使用的 Releases 与 Scheduled Drafts 已关闭。
- Visual Editing iframe 点击 H1 可定位 `hero.titleLines` 并编辑。Studio UI 验收确认素材库选图与裁剪入口可用；本地文件上传自动化因 Edge 扩展未开启 “Allow access to file URLs” 而未测，没有扩大浏览器权限。此前服务端真实上传已单独验证。不要把该自动化限制表述为用户无法上传，也不要把自动化选图归于用户。
- Studio 原生历史还原已通过：切到“已发布”→选旧发布记录→“还原”→确认，再检查草稿并发布。还原过程 revision 为 `UQk7Z4OgJQ8fetnaESVSag`。随后最后一次清理将 H1 和首图恢复到原内容，与 `output/studio-ui-before.json` 的完整首页内容比较（忽略系统字段）为 0 差异；最终 H1 为 `Source the Basics.`，published revision 为 `al0S314bK9an6mdDZyQNAR`，`homePage` 没有遗留 draft。`UQk7…` 是历史还原过程 revision，`al0S…` 是最后恢复原内容后的 revision。
- 自动草稿刷新仍不稳定：真实 Edge Presentation iframe 有时首次等待 15 秒超时，点“重试”后可连接。新 revision 已能从受保护的 revision endpoint 读到，但脚本 `reload` / `replace` 长时间未及时更新 iframe；Studio 手动刷新按钮也未能稳定更新。绿色原生后备链接已真实验收：H1 改为 `CMS 链接刷新验收` 后，点击“草稿已更新，点击更新预览”，约 6.6 秒后 iframe 显示新 H1 且状态为 `current`。只将此原生点击后备记为通过，不得宣称自动刷新成功。验证截图：`output/playwright/studio-final-verified.jpg`。
- 浏览器流程也已验证：Homepage → Shop → EssentialWhiteTee → Add Enquiry → Quote，询价内容为 `TEE-WHITE / White / S / quantity 1 / Ready stock`；未提交邮件。首页是本阶段唯一接入 CMS 的页面。其余 38 个旧 `.html` 页面继续以静态资源保留，商品管理/库存/定制/询价业务没有迁入 Sanity。现有邮件代码保留，但没有真实邮件投递验证。现有正式站没有新部署或被修改。

## 真实 CMS 验证脚本

该脚本面向隔离项目 `5mntophk/production`，启动时还会强制核对本地 Sanity project/dataset 环境变量。`--origin` 只接受精确的 `http://localhost:3000` 或稳定 Preview branch alias `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app`，拒绝其他域名、路径和已知 Production 主机；无需通过环境变量放宽 origin。

```powershell
node --env-file=.env.local --import tsx scripts/verify-cms-live.ts prepare --origin http://localhost:3000
node --env-file=.env.local --import tsx scripts/verify-cms-live.ts finish --origin http://localhost:3000
```

`prepare` 遇到任何已有 run state 或 `drafts.homePage` 都会停止。它先备份已发布首页，再上传 `assets/about-product-detail-v4.webp`，创建带临时标题和测试图的唯一 draft，并通过 Sanity 官方 `createPreviewSecret` 与应用实际 `/api/draft-mode/enable` 完成预览握手。随后分别验证无 cookie 请求仍显示 published 首页、有 preview cookie 的请求显示 draft 标记与新图。此步骤已完成并由主代理浏览器确认草稿 H1。应用 API read token、Sanity write token 和 preview secret 都不会写入文件或日志；secret 只在内存中用于握手，输出状态只记录其独立 document ID 和到期时间。官方握手可能同时返回空值 `sanity-preview-variant` cookie；脚本会校验所有 cookie origin 后滤除空值，并只要求/回放非空 `__prerender_bypass`。

`output/cms-live-state.json` 保存发布内容快照和 revision guard 信息；`output/cms-preview-cookies.json` 保存短期预览 session cookie，供主代理浏览器加载。这些是 ignored 本地文件，其中 cookie 文件仍是敏感 session 凭据，禁止提交、分享或贴入日志。`output/cms-live-report.json` 仅保存安全的验证结果。

主代理在浏览器中验证预览后运行 `finish`。脚本会再次确认 published/draft/secret revision 与测试标记，使用 Sanity `document.publish` action 的 `ifDraftRevisionId` 和 `ifPublishedRevisionId` 发布一次以验证真实发布读取；随后只按已知字段、数组 `_key` 与当前 `_rev` 恢复原首页标题第一行和首张图引用。发布及恢复后脚本会轮询真实 HTTP 首页（最多 60 秒），核对 H1 与 Sanity 图像 ID，再检查图像 CDN。脚本保存为 `finishing` 后可从“原 published + 测试 draft”“测试内容已 published”或“原内容已恢复”三个精确内容/revision 状态安全续跑；发现其他改动、并发 draft 或不匹配 revision 会停止，不覆盖。完成后删除本次创建且 revision/source/studio URL 均匹配的 preview secret，并通过 `/api/draft-mode/disable` 使脚本保存的 cookie 失效。主代理的浏览器 context 必须另行访问该 disable endpoint 退出草稿模式。此次真实 finish 已成功；首次运行曾在 60 秒内未观察到发布后的 CDN 页面而停止，随后服务端 Sanity client 设置 `useCdn: false` 直读 API，按安全状态续跑并完成发布检查、原内容恢复和 secret 清理。

遇到 revision 冲突、已有 draft、state 不匹配或发布/恢复校验失败时，脚本会停止，不覆盖未知内容，并保留备份供主代理处理。它不会删除图库、上传图片或用户 draft；新上传测试资产在恢复后保留为未引用资源。已存在的 run state 不会被新 `prepare` 覆写，完成后需由主代理归档后才能开启下一轮。

## 已确认基线与当前状态

- GitHub 仓库：jhun-arch/netpro-sourcing。
- 已确认 Production deployment：dpl_ErniJL5W5ypaPdUE6kmAidi91uMF。
- Production URL：https://netprosourcing-qqoyodtgw-junhil.vercel.app。
- 此部署源码 SHA：9341d2eec51667abd334ec5064b9db6b992af1bf。
- 本地 main：395e1af34e0312d4da5d6767920471229cde14ab（reflog 显示 2026-09-16 clone 后未修改）；origin/main：c1ef6c49157646cd5155d028cf446dcaeb567185。该实验不得修改任一 main。
- 实验工作树：D:\Users\Administrator\Documents\ChatGPT\NetPro-nextjs-sanity。
- 实验分支：experiment/nextjs-sanity，基于上述首页来源 SHA 建立。
- 用户已接受 Marketplace 条款；Sanity 免费 Marketplace resource 和 installation 已创建（resource ID ir_c260Hhq0yX0rvCVk，installation ID icfg_RBsQgcvP2JTY2UW7vqqGcOf7，external resource ID res-01sh185w1gxc1uvm）。
- Sanity projectId 为 5mntophk，是新建且独立的实验项目；其公开 dataset 名为 production。此名称不表示使用了现有 Sanity Production 项目或 Vercel Production 数据。
- 独立 Vercel project `netpro-nextjs-sanity-experiment` 已创建，但首次尝试即使显式选择 Preview 仍被平台标记为 Production；queued deployment `dpl_9m9zS65L9bG4o7sUcyN8F6kSCbXh` 已取消，未分配 alias。后续 Preview 使用现有 `netprosourcing` project 的 `experiment/nextjs-sanity` 分支，仅设置该 git branch 与 Preview target 的 Sanity public project/dataset、viewer read token；没有配置 write token 或更改既有 Production 环境变量。
- 已验收功能 Preview 快照：`41f354710fc3fbeea2b77b35680e41e3187edb51` / `dpl_BDTSNEjS2VQGKtciUVnkZwpN7uea` / `https://netprosourcing-bgl0z7dhz-junhil.vercel.app`，状态 READY；稳定 branch alias 为 `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app`。
- 环境变量名为 NEXT_PUBLIC_SANITY_PROJECT_ID、NEXT_PUBLIC_SANITY_DATASET、SANITY_API_READ_TOKEN、SANITY_API_WRITE_TOKEN。token 只允许服务端或受控 seed 从环境安全读取，不得打印或记录。
- read token 权限为 viewer，write token 权限为 editor。用户已配置准确的 localhost 与稳定 Preview alias CORS origins 并启用 Allow credentials；未扩大 origin 或 token 权限。
- seed、草稿 handshake、真实 publish/restore、匿名 published 隔离，以及真实 Edge Studio 登录、编辑/发布、Visual Editing 点击与历史还原均已在隔离实验数据上验证。自动刷新没有稳定通过；原生“草稿已更新，点击更新预览”链接已在真实 iframe 验收可用。
- 当前 package 精确版本：Next 16.4.2、Sanity 6.19.0、next-sanity 13.3.4、React/React DOM 19.3.1、@sanity/locale-zh-hans 2.1.40；Studio 使用 Sanity 中文 locale 包，不使用 next-intl。
- 首页 SEO head 在 index.html:1-24；现有 OG image 是已跟踪的 assets/hero.png，首屏主图为 assets/hero.webp。
- 不因 OG image 与首屏使用不同文件格式而判断资源缺失；改动前分别核对既有 SEO 意图。

## 验收结论与下一步

- 首页 CMS 试点的 published/draft 读取、真实 publish、无 cookie 隔离、图像 CDN、revision-guarded 恢复、Edge Studio 编辑/发布、Visual Editing 点选和原生历史还原均已验收；首页以外业务迁移不在本次范围。
- 最新 Preview 上脚本自动刷新仍不稳定；已验证原生绿色链接可更新 iframe。日常编辑按指南使用该链接。若未来调整刷新逻辑，须再次通过真实 iframe 验收后才能更新状态。
- 后续同分支 commit 经授权后检查新 Preview build 与稳定 alias 指向，构建目标必须通过 `scripts/assert-experiment-target.mjs`，不得触碰 Production 配置或部署。
- 其余 38 个根级 `.html` 页面继续静态托管；产品、库存、定制与询价记录尚未 CMS 化。未来讨论商品 CMS 时先设计稳定 `productId` 与 stock/custom/enquiry 的兼容迁移方案，再单独验收。
- 现有邮件处理代码保持原样，未进行真实投递测试。若需验收邮件，应先明确测试收件人与安全的 Preview 邮件环境，使用可审计的测试方式；本次没有发送邮件。

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
11. Sanity 官方 [History experience 文档](https://www.sanity.io/docs/user-guides/history-experience) 标明 Free 计划保留 3 天历史，Growth 90 天，Enterprise 365 天。历史还原已在本项目真实 Studio 完成验证；使用 Studio 文档历史中的“已发布”旧版本 →“还原”→确认→草稿→发布流程。计划影响可选历史时间范围；还原结果仍需发布草稿才会更新公开内容。
12. 未来商品必须用唯一 productId 关联库存、stock/custom 请求和 enquiry 历史记录。
13. 交付只报告实际运行的验证；未创建的 CMS/部署资源明确标记未创建。
14. `scripts/repair-home-array-types.ts` 默认只 dry-run；写入必须显式 `--apply`，且只通过数组 `_key` 路径补缺失 `_type`，使用 `_rev` 的 `ifRevisionId` 保护并发编辑。不得改成整文档覆盖或把 seed 当内容更新工具。
