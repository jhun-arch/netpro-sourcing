# 项目指令

## 实验与生产边界

- 当前工作树服务于 Next.js App Router + Sanity 实验，分支为 experiment/nextjs-sanity。用户于 2026-10-17 授权从首页扩展到全站及产品 CMS；下列原首页试点说明不限制这次明确授权的全站迁移。
- 试点以源码 SHA 9341d2eec51667abd334ec5064b9db6b992af1bf 为基线。
- 只在实验分支开展已授权的试点工作。
- 未经用户明确授权，不得改动 main、连接或写入 Production、发布 Production 部署或迁移 Production 数据。
- Sanity 只使用隔离的新实验项目 projectId 5mntophk、dataset production；该 dataset 名称不得改动，也不得误认为连接了现有 Production 项目或数据。
- 不得将实验项目 token 授予超出实施所需的权限；CORS 起源由用户本人添加准确的 localhost/Preview URL，不扩大授权范围。
- 若实验与 Production 的隔离状态无法确认，先暂停外部写入并报告主代理。
- Marketplace 条款、账号认证和授权必须由用户本人完成；代理不得代点、代接受或绕过条款。
- 不得打印、提交或记录访问令牌、密码或其他凭据。
- Sanity token 仅允许服务端代码、部署配置或受控 seed 脚本从环境安全读取；不得使用 NEXT_PUBLIC_ 前缀或写入客户端 bundle。
- 本地密钥文件必须被 .gitignore 排除，提交前检查是否有意外凭据。

## 多智能体工作流

- 主代理使用 gpt-6-astra、reasoning effort low，负责需求理解、方案、架构、UI/UX 和最终审核。
- 清晰边界的实际实现、重复修改、搜索和验证工作优先委派给 gpt-6-luna、reasoning effort max。
- 新启动的执行代理必须显式指定 gpt-6-luna 和 max；不得依赖继承设置。
- 执行代理只完成分配范围内工作，不替代主代理作架构或交付判断，也不再派生子代理。
- 当前子代理不得派生其他代理。
- 通常同时只启用一个 Luna 代理；最多两个，第二个只用于互不依赖且文件范围不冲突的工作。
- 共享工作树前明确可修改路径、禁止操作和验收条件，避免覆盖用户或其他代理的改动。
- 主代理必须检查实际差异、需求覆盖、关键行为及验证证据后才能交付。

## 首页迁移边界

- 首页由 App Router 提供；保留现有 DOM class、id、aria 属性、data-* 值、语义结构、CSS 和 GSAP/ScrollTrigger 行为。
- CMS 管理文案、图片、替代文本、CTA 链接和经审核的 SEO 文本。
- CSS、布局、断点、动画参数、DOM 选择器和业务行为由代码维护，不建成 CMS 字段。
- 其余根级 .html 页面迁移到 Next 时须保持原 URL、资源与互链；按模块和页面族渐进迁移，不整体重设计。
- /api/contact、/api/quote、/api/purchase 继续复用现有 Node handler，优先用 Pages API 薄包装。
- 首页试点不代表商品目录、库存、定制或询价业务已迁移或完成。
- 后续商品管理必须用唯一稳定 productId 关联库存、stock/custom 意图和 enquiry 记录。

## Schema 与内容安全

- 首页文档类型和 singleton _id 固定为 homePage；Studio 只提供一个首页编辑入口。全站可新增按实际页面组织的编辑入口与独立产品/分类管理，禁止复制或覆盖已有首页内容。
- 重复项保留 Sanity _key，并有不随标题和顺序改变的稳定 slug。
- _key 和 slug 不可按标题、数组索引或文案 hash 重建。
- 字段变更必须同一改动更新 schema、GROQ query、类型、renderer、fixtures、contract check 和相关 tests。
- 自动 contract check 必须捕获 renderer/query 引用了 schema 不存在的字段。
- contract 递归校验 renderer 的完整深层绑定；query 必须保持完整 singleton 查询，CMS tests 必须保留移除 `hero.body` 的负例。
- `scripts/seed-home.ts` 只允许在目标隔离 dataset 首次导入，不用于覆盖后续编辑；数组 `_type` 修复默认 dry-run，显式 `--apply` 时也只能按 `_key` 和 `_rev` 做字段级 patch。
- 拆分、改名或删除字段前必须准备版本化的非破坏性 migration、dry-run、备份和回滚方案。
- migration 不得自动删除未识别字段或旧内容；先报告并保留。
- CI 至少执行 typecheck、Next build 和既有业务 tests。

## Preview 与长期维护

- 当前阶段与后续需求以 `docs/DEVELOPMENT-ROADMAP.md` 和 HANDOFF 最新段落为准。当前仅完成迁移/后台/Visual Editing；T 恤定制器需当前阶段汇报后再等待用户确认，不得提前实现。
- 按阶段运行直接相关的必要验证，不反复执行已通过的全站审计；非阻塞问题记录后在用户指定的最终综合检查阶段集中处理。阻塞、数据安全及破坏性风险及时处理。
- 后续在线定制按具体商品配置启用，不按整个 Clothing 分类启用。页面布局、Sanity 商品能力配置、客户设计和购物袋/询价快照分别维护，稳定身份与版本不得因设计调整重建。

- 全站页面布局保留于受控源码模板；`sitePage` 内容字段与模板选择器的绑定清单是长期契约。不得按标题、文案 hash、当前数组顺序或运行时 DOM 位置重建已有 slot/section 身份。布局调整须更新绑定和测试，内容字段沿用稳定身份。
- 页面内容只允许结构化文字、图片、链接和 SEO；不向编辑者开放 HTML、CSS、JS 或 DOM 选择器。增加可编辑模块须同时调整 schema、类型、查询、绑定、初始内容或非破坏 migration、测试与编辑指南。
- 商品 `productId` 是原始业务身份（如 `tee-white`），不能用 Sanity `_id`、标题或邮件中的 `TEE-WHITE` 替代。公开目录与历史询价身份解析分开；下架、归档或移除当前尺码不得静默丢弃已有询价。保留历史规格，不物理删除公开过的身份。
- 新分类须同时贯通 CMS、数据投影、前端筛选/标题/banner/款式入口，不能只增加 schema 后宣称可用。既有邮件 API 与 stock/custom payload 契约不因 CMS 迁移而重写。
- 普通内链继续使用全文档导航以兼容旧脚本生命周期；引入客户端路由前，必须先完成并验证旧脚本的清理及重复初始化。
- 模板快照检查仅规范化 CRLF/CR 与 LF，其他内容严格比较；不得因 Windows/Linux 换行差异重建绑定 UUID 或重新导入 CMS。新增检查须同时在 Git 中的 LF 源文件上验证。
- 未知页面由精准 Proxy 同源重写到 `/api/not-found-page`，由 Route Handler 输出原站完整 HTML 和 404 状态；不要在 Proxy rewrite 上设置 404，以免云端替换为平台错误页。错误页资源与内链须根相对化以兼容嵌套路径，保留片段链接。不得扩大到 Studio、API、资源或非页面方法；修改路由后实际检查单段与嵌套未知路径的服务端 HTML，不能只看客户端画面。
- 草稿 revision 必须按当前 pageKey 与共享导航/页脚/目录取值，SSR 与轮询 API 使用相同范围；不把其他独立页面编辑当作当前页变更。保留正常实时更新、手动刷新和退出入口。预览页面选择只允许稳定登记路由，继续使用完整文档导航。
- Sanity 图片字段提供中文建议像素尺寸、比例及裁切说明；这些是编辑提示，不强制限制已有素材或修改内容身份。拼版素材替换为独立图片时应明确说明，不要求上传整张拼版。
- 需要按请求读取 CMS 的入口须在捕获应用错误之前建立明确的 Next 请求边界（如 `connection()`）；不得把框架动态渲染控制流包装成 CMS 连接失败。构建期不导入或覆盖内容。

- Embedded Studio 的路由固定为 `/studio`；`sanity.config.ts` 的 `basePath` 与 renderer 的 `createDataAttribute.baseUrl` 必须共用 `src/sanity/urls.ts` 中的 `SANITY_STUDIO_BASE_PATH`。Presentation `initial` 使用同源相对路径 `/`，让 localhost、Preview 和其他实验分支部署沿用当前 origin；不要硬编码某个 Preview host。
- 图片编辑绑定须覆盖实际点击面：分类透明图片链接保留原 href，但编辑路径指向图片，可见 CTA 继续编辑链接。Banner 的点击穿透样式只由草稿模式下的 DraftVisualEditing 提供，保持仅活动轮播图可命中，并保留文字与按钮交互；不得把这些预览样式加入公开页面。
- Sanity 外部 Studio 已注册，`sanity.cli.ts` 的 `deployment.appId` 固定为 `lms1plunpquzbvyrpkqshkyb`，避免创建重复 Studio。变更前先核实 Manage Studios 中的现有注册，不要由代码或 CLI 重复创建。
- 普通访客只读 published 内容；草稿仅通过认证的 Sanity preview 握手读取。
- Preview 必须可撤销；退出时清理 draft mode 和临时状态。
- SEO 输出清除 stega；实验预览设置 noindex，canonical 使用受控的站点配置。
- 原生 Studio 历史还原已实测通过：已发布版本 → 历史 → 还原 → 确认 → 草稿 → 发布；不要把历史 API 的 noVersionRevival 标记误判为 Studio 无法还原。可选历史时间范围取决于 Sanity 计划。
- Presentation 的草稿自动刷新在真实 Edge 中仍不稳定；保留“草稿已更新，点击更新预览”原生链接，并以实际 iframe 内容验收。首次连接超时时可点“重试”，不得将轮询成功等同于预览更新成功。
- 保持 reduced-motion、键盘交互、ARIA 状态和 hydration 一致。
- 客户端脚本须清理事件监听器、观察器、定时器和 ScrollTrigger，支持安全重复初始化。
- 交付说明列出改动文件、实际验证、未运行的检查、未完成授权和未验证限制。
- 不得把计划、模拟或文档写成已完成的真实 CMS 集成或部署。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 实验构建与部署目标

- Next + Sanity 实验只允许在 `experiment/nextjs-sanity` 分支继续；部署目标必须是已存在的 `netprosourcing` Vercel 项目和 Preview 环境，构建前核对项目、分支与目标。
- 不修改原 `netprosourcing` 项目的 Production 配置或原站代码。不得以空实验项目 bootstrap 或首次部署成功为 Production 构建或发布的依据；Vercel 首次部署可能忽略 `--target=preview` 并选择 Production。
- `prebuild` 必须先运行 `scripts/assert-experiment-target.mjs`，再同步静态资源和校验 CMS contract。Vercel Production 或无法确认的 Vercel target 必须失败关闭；本地和非 Vercel CI 构建允许继续。
