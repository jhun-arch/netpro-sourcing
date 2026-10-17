# 全站 Next.js + Sanity 迁移

更新：2026-10-17。本文记录全站迁移的模型边界、现状和待验收项目，不把工作树代码或目录导入误称为已经发布的全站版本。

## 当前状态与验收边界

- 目录已导入隔离 Sanity 项目：59 个目录文档（31 product、5 productCategory、23 catalogStyle），41 个去重源图片按内容哈希复用或上传。使用 `createIfNotExists`；既有 `homePage` revision 和内容未变。不要覆盖或重复导入这些内容。
- 全站页面注册表、旧模板渲染、页面/共享设置 schema、目录投影和旧脚本适配已经进入当前工作树。
- `sitePage` 与 `siteSettings` 的首次导入仍待主代理确认/执行。页面 seed 默认为 dry-run；任何 apply 都必须先检查隔离目标、已有 published/draft 身份并生成写前备份。不能以 seed 计划代替实际数据状态。
- 最新目录契约测试 6 项通过，TypeScript 检查通过；主代理运行的 Sanity 目录文档错误级校验返回 0 个错误。页面 agent 仍在修复 SSR/Schema 预检，fullsite:test 和全站预检尚未通过验收；最终构建、真实浏览器检查和新 Preview 验收仍需完成。
- 已验收的 Preview 快照是较早的首页试点，不含本次全站工作树快照。稳定分支地址为 [实验 Preview](https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app)，[Studio](https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app/studio)；不要将 alias 或首页历史验收当作全站通过证据。
- Production 页面、配置和数据没有因本次全站实现而修改或部署。全站实际验收前，文档交付状态保持“待主代理验收”。

首页试点的历史证据和边界见 [NEXTJS-SANITY-MIGRATION.md](NEXTJS-SANITY-MIGRATION.md)；页面和商品盘点分别见 [FULLSITE-PAGE-AUDIT.md](FULLSITE-PAGE-AUDIT.md)、[FULLSITE-PRODUCT-AUDIT.md](FULLSITE-PRODUCT-AUDIT.md)。

## 页面模型与稳定绑定

非首页页面固定登记在 `src/fullsite/pageManifest.ts`（37 个页面/旧 URL），首页继续使用既有 `homePage` singleton。页面以原模板为布局来源，在服务端将受控内容投影为 DOM；保留旧 body class、样式/字体与脚本顺序，普通链接仍走完整页面导航。

`sitePage` 提供固定的页面身份、模块和内容槽位。编辑者可改文字、允许编辑的链接和图片，以及 SEO/社交分享文字与图像；模板中的 HTML、CSS、脚本、DOM 选择器、模块顺序和身份字段仍由代码维护。模块、槽位、label 和 route 是稳定绑定的一部分，不能按当前标题、文本、排序或数组索引重新生成。新页面或新模块需要同步 manifest、Schema、模板绑定和 contract checks。

`siteSettings` 集中管理已登记的共享导航文字/链接和非首页页脚。首页自己的页脚仍保留在 `homePage.footer`。共享绑定范围由代码维护，不应任意增删数组元素来创建新导航入口。

固定兼容路由包括旧 `.html` 页面；`/index.html` 跳转首页，`/checkout.html` 跳转询价页面，`/privacy-policy` 和 `/terms` 作为无扩展名兼容别名保留。实际部署后的状态以 HTTP 验收为准。

## 商品、分类与款式目录

Sanity product 使用原有稳定 `productId` 投影回旧 `NETPRO_PRODUCTS` 形状，并保留原有 Shop 产品详情弹窗、询价 API、浏览器存储和邮件流程。产品文档维护目录展示与询价所需数据，没有独立产品详情 URL，也没有独立产品 SEO 字段；搜索与分享元数据由 Shop 页面和 `sitePage` 负责。

目录投影区分当前可选尺码与历史尺码：目录 UI 只展示当前尺码，旧 enquiry validator 可识别当前与历史的并集。新产品默认两份尺码均为 `One size`；seed 内容保持源站原值。新增尺码必须追加到历史列表，验证器还会与导入快照和已发布文档比较以防移除曾用规格。

商品通过 `active` 上架状态控制公开可见性。下架/归档不会从完整身份集合删除商品，Studio 也隐藏删除、复制与取消发布操作。不要通过删除文档“清理”目录，否则旧 enquiry 无法可靠识别商品。

分类的 `categoryId` 与款式的 `styleId` 自动生成并隐藏，不要求编辑者手动写 ID。新增分类/款式由后台内容配置进入目录投影；固定的主导航入口仍由代码登记，不会因为新增分类而自动多出一个导航按钮。旧类别和款式的 `.html` href 保持不变；款式卡片以已保存的 href 继续进入原定制页面。若改变目标，必须校验页面、筛选参数及旧导航兼容后再发布。

## 图片来源、替换和裁剪

当 CMS 图片未提供可用新资产时，renderer 保留源模板/目录原图及源显示比例和位置。显式更换为 Sanity image 后，使用 Sanity asset 的 crop/hotspot，并以新单图的常规尺寸/居中规则呈现，不再套用旧拼图的比例/位置。产品主图、悬停图、分类横幅和款式卡均保留导入素材引用作为 fallback；alt 优先取 Sanity 图片自己的 `image.alt`，再回退到源内容的 alt。原站 art 作为隐藏兼容数据保留；预览定位图片字段时，即使视觉内容仍使用 art，也应命中可编辑的 image 字段。

`imageSize`、`position`、悬停图对应字段、asset refs 和 art 等是隐藏/只读兼容字段。编辑者应在可见图片字段中上传/选图和设置裁剪，不直接填写 CSS 值或改素材 ID。

## Studio 草稿与发布

普通访客读取 published 文档，认证 Presentation 读取 draft。Studio 分为“页面管理 / 产品管理 / 产品分类 / 定制款式入口 / 全站设置”；页面文档仍使用固定路由。草稿通过真实页面预览并核对后再发布。页面内容没有任意 HTML/JS 注入能力。

首页试点曾观察到草稿自动刷新不稳定。Presentation 首次连接可能需重试；自动脚本导航未稳定，因此可使用绿色原生“草稿已更新，点击更新预览”链接作为后备，并确认 iframe 实际显示草稿。这个刷新后备曾在历史首页 Preview 实测成功，但不能据此声称当前全站工作树的刷新已经过真实浏览器验证。全站新版需由主代理在新 Preview 再验。

## 导入与维护规则

- 全站页面 seed 在不带参数时只生成 dry-run 报告；`--apply` 先检查隔离 project/dataset 和目标身份，包含 published 与 `drafts.*`，写前保存快照，并只用 `createIfNotExists` 创建缺失文档。
- 目录 seed 默认 dry-run；已导入目录不应再次覆盖或重建。图片资产按内容哈希复用，只为缺失文档引用上传所需素材；现有文档内容不覆盖。
- 首页文档不属于全站页面 seed 的写入目标；禁止重做首页 seed 或重置首页数据。apply 前检查是否存在意外草稿、目标 project/dataset、备份和需要创建的确切 ID。
- 新产品、分类、款式使用系统生成的稳定身份；编辑标题、顺序、图片和状态不应改变身份。若业务需要添加固定页面 URL、导航入口、模块类型或 DOM 绑定，先做代码层非破坏迁移并更新 contract tests。

## 最终验收门槛

主代理需在同一实验分支核对实际 diff 与 schema、运行全量 contract/业务测试与 typecheck、完成目标 guard 下的 build，核对全站及兼容路由、CSS/字体/脚本顺序和站内资源的 HTTP 状态，并在新的安全 Preview 做页面族与目录/询价浏览器抽查。HTTP smoke 入口为 npm run fullsite:http -- --origin <allowlisted-origin>，origin 仅可为 http://localhost:3000 或稳定 Preview；此项只读取公开响应和站内资源，不写 CMS、不调用邮件 POST，尚待主代理在新 Preview 实际运行。邮件 POST 和真实客户邮件不得作为 smoke test。任何步骤未执行或失败，都应明确保留为未验收；不将本地代码检查、Sanity seed 或历史首页浏览器结果写成 Production/全站通过。
