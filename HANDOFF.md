# Handoff：Next.js + Sanity 首页试点

更新时间：2026-10-16。继续工作前先读本文件、[README.md](README.md)、[docs/NEXTJS-SANITY-MIGRATION.md](docs/NEXTJS-SANITY-MIGRATION.md) 和面向内容编辑者的 [docs/CONTENT-EDITOR-GUIDE.md](docs/CONTENT-EDITOR-GUIDE.md)。后两份记录验收证据与日常操作；不要重复已完成的真实 CMS 验证。

## 仓库与隔离基线

- 实验工作树：`D:\Users\Administrator\Documents\ChatGPT\NetPro-nextjs-sanity`。
- 实验分支：`experiment/nextjs-sanity`，首页迁移源基线：`9341d2eec51667abd334ec5064b9db6b992af1bf`。
- 现有 Production 基线仍是 deployment `dpl_ErniJL5W5ypaPdUE6kmAidi91uMF`，URL `https://netprosourcing-qqoyodtgw-junhil.vercel.app`，源 SHA 为上述基线；正式站未被修改或新部署。
- 本地 `main` 为 `395e1af34e0312d4da5d6767920471229cde14ab`（reflog 显示 2026-09-16 clone 后未修改）；`origin/main` 为 `c1ef6c49157646cd5155d028cf446dcaeb567185`。不要切换或写入任一 `main`。
- 独立 Vercel 项目首次空项目 deployment 被平台选择为 Production，queued deployment `dpl_9m9zS65L9bG4o7sUcyN8F6kSCbXh` 已取消、未分配 alias。不要再次触发该项目的首次部署。
- 已验收功能 Preview 快照为 READY：源码 SHA `41f354710fc3fbeea2b77b35680e41e3187edb51`，deployment `dpl_BDTSNEjS2VQGKtciUVnkZwpN7uea`，URL `https://netprosourcing-bgl0z7dhz-junhil.vercel.app`。稳定 branch alias 仍是 `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app`。正式站仍是上述 Production 基线，未修改或新部署。
- Sanity 只连接隔离 project `5mntophk`、dataset `production`。dataset 名称不表示现有 Sanity/Vercel Production；不要连接现有 Production 数据。

## 已完成与验证

- App Router 首页和 `/studio`、旧静态资源同步、旧 `.html` 页面兼容及 Pages API 薄包装已实现。保留旧首页 DOM hooks、CSS、JavaScript 与 GSAP；首页之外没有重写旧业务。
- 首页内容已导入真实 Sanity：27 个图片资源、19 个图库项、4 个品类、3 个流程步骤和 6 个 FAQ。仅首页接入 CMS。
- 真实 CMS live flow 已完成：匿名请求保持 published 首页，认证 preview 显示 draft；`document.publish` action 发布测试内容，测试 CDN 图片 HTTP 200；随后按字段与 `_key` / `_rev` guard 恢复内容，临时 preview secret 已按 revision/source/studio URL guard 清理，报告状态为 `finished`。
- 首次 finish 曾因 60 秒内首页未观察到 CDN 更新而停止。服务端 Sanity client 改为 `useCdn: false` 直读 API 后，finish 安全续跑成功。live state 和 report 在 ignored `output/` 中；下一轮 `prepare` 前应由主代理归档已完成状态，不能覆盖它。
- 最新检查：业务/部署 guard tests 34 项、CMS tests 13 项、renderer tests 2 项均通过；typecheck、contract check、diff check 通过。GitHub Actions run `38878650129` 对当前 SHA 完成成功，包含 Next build。
- 首页浏览器验收：1440px 桌面主要模块几何与 Production 一致；390px 无横向溢出；流程、FAQ 与 GSAP 行为正常；首页 fresh browser console 为 0 errors/warnings。
- 另验证首页 → Shop → EssentialWhiteTee → Add Enquiry → Quote，确认询价行包含 `TEE-WHITE / White / S / quantity 1 / Ready stock`；没有提交邮件。
- 用户已在 Sanity 项目 `5mntophk` 为 `http://localhost:3000` 和 `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app` 配置 CORS 并启用 Allow credentials；用户随后在真实 Edge Studio 登录成功。
- Studio 的 StructureBuilder `root` 与嵌套列表已补稳定 ID，导航命名为“内容管理 / 页面管理 / 首页”和“可视化编辑”；schema 的首屏、轮播图片、FAQ 预览已使用中文标题/问题与图片，Sanity 原生 `StructureBuilder.serialize()` 回归测试已加入 `cms:test`。同时关闭未使用的 Releases 与 Scheduled Drafts。
- 真实 Studio 验收：点击 Visual Editing iframe 中的 H1 能定位并编辑 `hero.titleLines`；发布的测试标题和素材库图片曾在匿名预览正确显示。首页草稿保持匿名访客不可见。
- Studio 素材库选图和图片裁剪入口已在真实 UI 验收中确认可用。Studio 本地文件上传自动化因 Edge 扩展未开启 “Allow access to file URLs” 而未测；没有扩大浏览器权限，之前的服务端真实上传已单独验证。不要把自动化限制写成素材库或裁剪不可用，也不要把自动化选图记为用户操作。
- Studio 原生历史还原已通过：顶部切“已发布”→选旧发布记录→“还原”→确认，随后检查“草稿”并发布。该次还原 revision 为 `UQk7Z4OgJQ8fetnaESVSag`。之后又将标题和首图恢复为原内容；与 `output/studio-ui-before.json` 的首页完整内容比较（忽略系统字段）为 0 差异。最终原 H1 为 `Source the Basics.`；published revision 为 `al0S314bK9an6mdDZyQNAR`，`homePage` 没有遗留 draft。`UQk7…` 是历史还原过程的 revision，`al0S…` 是最后清理并发布原内容后的 revision，不要混淆。
- 草稿自动更新仍不稳定，不得写成通过：初次 Presentation iframe 偶尔等待 15 秒超时，点“重试”后可连接；编辑后的新 revision 曾长时间未被脚本导航反映。已验收功能 Preview 提供绿色原生链接“草稿已更新，点击更新预览”。真实 Edge 实测：将 H1 改为 `CMS 链接刷新验收` 后，出现该链接；点击后约 6.6 秒，iframe H1 更新且状态回到 `current`。自动 `replace` 单独仍不可靠；日常操作按需点击该链接，不要把这项后备验收描述成自动刷新通过。

## 尚未验证与下一步

- 最新 Preview 的 Studio CORS、登录、首页编辑、原生历史还原和原生刷新后备均已实测；脚本自动更新不稳定，仍需如实标记为未通过。若后续改动刷新逻辑，需另行做真实 iframe 验收。
- 当前最终内容已恢复并发布；下一次写入 CMS 前先由主代理确认无未完成 draft。后续构建按已授权范围核对 `scripts/assert-experiment-target.mjs`、项目、分支与 Preview target；不得触碰 Production。
- 根级其余 38 个 `.html` 页面继续静态提供。产品管理、库存、定制申请、结算和询价业务尚未 CMS 化。后续按页面/领域渐进迁移；商品模型必须以唯一稳定 `productId` 关联 stock/custom 状态和 enquiry 历史，并保留现有 API 契约。
- 原邮件处理代码保留，但没有真实邮件投递验证；本轮没有发邮件。若要测邮件，先明确收件人和安全 Preview 邮件环境。

## 强制边界

- 只在 `experiment/nextjs-sanity` 继续本实验。未经用户明确授权，不改 `main`、不更改现有 Production 配置、不连接或写入 Production 数据、不部署/提升 Production。
- 不提交或输出 token、secret 或 `.env.local` 值。不要把 Sanity 凭据暴露给客户端。
- 不把首页试点表述为产品 CMS、旧 38 页或邮件投递迁移已完成。
- `src/sanity/schemaTypes/homePage.ts` 的通用图片 `alt` 当前只有长度验证、没有 `required()`；首屏三个装饰图留空 alt 是可发布状态。不要为了误报而新增 required 规则或更改内容模型。
