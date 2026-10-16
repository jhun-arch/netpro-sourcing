# Handoff：Next.js + Sanity 首页试点

更新时间：2026-10-16。继续工作前先读本文件、[README.md](README.md) 和 [docs/NEXTJS-SANITY-MIGRATION.md](docs/NEXTJS-SANITY-MIGRATION.md)。后两者记录完整验收和长期维护规则；不要重复已完成的真实 CMS 验证。

## 仓库与隔离基线

- 实验工作树：`D:\Users\Administrator\Documents\ChatGPT\NetPro-nextjs-sanity`。
- 实验分支：`experiment/nextjs-sanity`，首页迁移源基线：`9341d2eec51667abd334ec5064b9db6b992af1bf`。
- 现有 Production 基线仍是 deployment `dpl_ErniJL5W5ypaPdUE6kmAidi91uMF`，URL `https://netprosourcing-qqoyodtgw-junhil.vercel.app`，源 SHA 为上述基线；正式站未被修改或新部署。
- 本地 `main` 为 `395e1af34e0312d4da5d6767920471229cde14ab`（reflog 显示 2026-09-16 clone 后未修改）；`origin/main` 为 `c1ef6c49157646cd5155d028cf446dcaeb567185`。不要切换或写入任一 `main`。
- 独立 Vercel 项目首次空项目 deployment 被平台选择为 Production，queued deployment `dpl_9m9zS65L9bG4o7sUcyN8F6kSCbXh` 已取消、未分配 alias。不要再次触发该项目的首次部署。
- 当前实验 Preview 使用既有 `netprosourcing` 项目、`experiment/nextjs-sanity` 分支及 Preview 环境。deployment `dpl_54zLN8oPGBhz8ctaheqNr2yyqMDU` 状态 READY，URL `https://netprosourcing-lv5bxija4-junhil.vercel.app`，稳定 alias `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app`。后续同分支的获准提交会触发新 Preview build，稳定 alias 保持不变。
- Sanity 只连接隔离 project `5mntophk`、dataset `production`。dataset 名称不表示现有 Sanity/Vercel Production；不要连接现有 Production 数据。

## 已完成与验证

- App Router 首页和 `/studio`、旧静态资源同步、旧 `.html` 页面兼容及 Pages API 薄包装已实现。保留旧首页 DOM hooks、CSS、JavaScript 与 GSAP；首页之外没有重写旧业务。
- 首页内容已导入真实 Sanity：27 个图片资源、19 个图库项、4 个品类、3 个流程步骤和 6 个 FAQ。仅首页接入 CMS。
- 真实 CMS live flow 已完成：匿名请求保持 published 首页，认证 preview 显示 draft；`document.publish` action 发布测试内容，测试 CDN 图片 HTTP 200；随后按字段与 `_key` / `_rev` guard 恢复原标题和首图，临时 preview secret 已按 revision/source/studio URL guard 清理，报告状态为 `finished`。测试 revision：`6By78OquIO7xHAaGfnWlgH`；恢复 revision：`al0S314bK9an6mdDZxo0B4`。
- 首次 finish 曾因 60 秒内首页未观察到 CDN 更新而停止。服务端 Sanity client 改为 `useCdn: false` 直读 API 后，finish 安全续跑成功。live state 和 report 在 ignored `output/` 中；下一轮 `prepare` 前应由主代理归档已完成状态，不能覆盖它。
- 本地通过：31 个既有业务 tests、8 个 CMS tests、2 个 renderer tests、3 个部署 guard tests、typecheck、contract check 和 Next build。
- 首页浏览器验收：1440px 桌面主要模块几何与 Production 一致；390px 无横向溢出；流程、FAQ 与 GSAP 行为正常；首页 fresh browser console 为 0 errors/warnings。
- 另验证首页 → Shop → EssentialWhiteTee → Add Enquiry → Quote，确认询价行包含 `TEE-WHITE / White / S / quantity 1 / Ready stock`；没有提交邮件。

## 尚未验证与下一步

- Studio Preview URL 为 `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app/studio`，目前仍显示 “Connect this Studio / Add CORS origin”，未登录，console 有 12 条 CORS errors。CORS 由用户在 [Sanity project API settings](https://sanity.io/manage/project/5mntophk/api) 为精确 origins `http://localhost:3000` 和 `https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app` 启用 **Allow credentials**；用户已被请求设置，尚未回复。不要声称 Studio 登录、非技术用户编辑/发布或 Visual Editing 已通过。
- CORS 完成后，先验 `/studio` 登录、首页文案及图片编辑、草稿预览、发布和 Visual Editing 图片点选；不要扩大 origin 或 token 权限。
- 当前 Preview deployment 已 READY；下一次同分支提交前先核对 `scripts/assert-experiment-target.mjs`、项目、分支和 target，再按授权构建 Preview 并检查 alias 指向。
- 根级其余 38 个 `.html` 页面继续静态提供。产品管理、库存、定制申请、结算和询价业务尚未 CMS 化。后续按页面/领域渐进迁移；商品模型必须以唯一稳定 `productId` 关联 stock/custom 状态和 enquiry 历史，并保留现有 API 契约。
- 原邮件处理代码保留，但没有真实邮件投递验证；本轮没有发邮件。若要测邮件，先明确收件人和安全 Preview 邮件环境。

## 强制边界

- 只在 `experiment/nextjs-sanity` 继续本实验。未经用户明确授权，不改 `main`、不更改现有 Production 配置、不连接或写入 Production 数据、不部署/提升 Production。
- 不提交或输出 token、secret 或 `.env.local` 值。不要把 Sanity 凭据暴露给客户端。
- 不把首页试点表述为产品 CMS、旧 38 页或邮件投递迁移已完成。
- `src/sanity/schemaTypes/homePage.ts` 的通用图片 `alt` 当前只有长度验证、没有 `required()`；首屏三个装饰图留空 alt 是可发布状态。不要为了误报而新增 required 规则或更改内容模型。
