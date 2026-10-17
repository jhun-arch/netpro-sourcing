# 全站商品与询价数据审计

审计日期：2026-10-17。范围是 Next + Sanity 实验分支中的现有商品目录、商品详情入口、定制风格卡片、浏览器询价状态和根级业务 API。本文是只读盘点与迁移建议；未读取环境变量或密钥，未访问或修改 Sanity 内容，也未触碰 Production。

## 结论

当前目录由 products.js 中的 31 个商品对象驱动；颜色款目前是独立商品记录，尺码是每条记录上的可选值。商品 id 是本地询价键和部分 UI 判断键；报价提交时再把它转成大写 sku（例如 tee-white → TEE-WHITE）。CMS 必须逐字保留小写原始 productId，不能把大写 sku 当作同一个字符串或用它覆盖原 ID。商品详情是对话框，不存在按商品 ID 生成的详情 URL。CMS 负责产品内容与展示数据；联系、报价和购买询价继续由现有 Node API 处理。

本实验已有首页 CMS 试点，但商品目录和询价尚未迁入 Sanity。以下建议不代表 CMS 已接入这些内容。

## 现有数据形状与数量

| 数据源 | 实际数量 | 当前形状与用途 |
|---|---:|---|
| products.js | 31 件 | 5 个分类：clothing 6、socks 9、headwear 9、bags 2、patches 5。31 个 ID 唯一。 |
| data/catalog-style-entries.json | 23 张风格卡 | 4 个分组：clothing/Apparel 5、headwear 8、socks 8、bags 2；没有 patches 分组。它不是商品目录。 |
| purchase-products.js | 0 件 | 文件注明旧零售目录已退役；现有内容不含商品数据。 |

现有商品 ID 按分类如下：

- clothing：tee-white、tee-navy、sweatshirt、hoodie、varsity-jacket、jersey。
- socks：socks、socks-black、ankle-socks、athletic-socks、knee-high-socks、no-show-socks、novelty-socks、wool-socks、compression-socks。
- headwear：cap、cap-beige、visor、camper-hat、beanie、trucker-cap、snapback、dad-hat、bucket-hat。
- bags：tote-bag、backpack。
- patches：patch、patch-embroidered、patch-pvc、patch-chenille、patch-woven。

每件商品都有 id、name、category、color、swatch、sizes、isNew、customizationHref 和 description。部分商品还带有 image、imageAlt、position、imageSize、hoverImage、hoverImageAlt、hoverImagePosition、hoverImageSize、art 或 externalCustomizationHref。当前共有 4 件标记为 isNew；22 件有主图、25 件有穿着图、9 件使用 art 字段。

尺寸值按分类为：服装 S/M/L/XL；袜子 S/M 与 L/XL；头饰和包 One size；贴章 Not specified 与 One size。自定义请求另允许 To be confirmed。颜色是单个参考颜色及十六进制色块值，不存在嵌套 variant 对象。比如 tee-white 和 tee-navy、cap 和 cap-beige 是不同 ID 的记录；不要在首次导入时合并它们。各尺码也没有独立库存或 SKU 记录。

商品描述称为 bulk sourcing 参考，并明确可用性和最终规格以报价确认为准。当前结构没有价格、库存量、MOQ、实际尺寸测量值或材料规格数据；详情对话框展示 Request Pricing，并以代码文案说明尺寸、材料和工艺待项目确认。CMS 不应据此凭空建立价格或现货数量。

商品对象的来源和展示逻辑见 products.js:1-41、app.js:188、app.js:576-645、app.js:691-768。art 值由 app.js 的 art() 映射为 CSS 插图类，不是媒体文件名；迁移时要保留 sprite key 或将显示素材完整替换并核对视觉结果。image 与 hoverImage 指向静态 assets 路径，裁切还依赖 position/size 和 alt 字段。

风格卡数据每项有 slug、name、href、image、position、size、alt；类别对象有 id、label、entries。slug 是定制风格路径标识，不是商品 ID。保留类别和条目顺序、图片裁切、替代文本及现有页面路径。当前商品数据包含 28 个不同 customizationHref（包括贴章页锚点）；五种贴章商品还各有外部 NetproPatches 链接。

类目不是完全动态的：app.js:210-211 只接收 all、clothing、socks、headwear、bags、patches；目录标题和分类 banner 也在 app.js:607-612 固定映射。shop-styles.js 的 tabs 来自静态 HTML，categoryForShopFilter() 只显式处理 headwear 和 socks，其余值回退到 clothing。若未来新增商品类目，需要让页面从分类数据生成/接受筛选项与标签，并为 banner 提供内容或通用回退；不能只在 Sanity 新建分类文档。New Arrivals 是筛选模式，不是商品分类。

## URL 与界面行为

shop.html 中的商品图片和名称是带 data-detail 的按钮。app.js 通过稳定商品 id 查找记录并打开 shop.html 内的 product-dialog；详情 HTML 在运行时渲染到 product-detail，URL 不会变成商品详情路径。首页复用同类对话框。详情加入询价时，保存在本地的是 id、size、quantity、intent、customization、notes。

因此，不要为现有数据推导或重建商品详情 slug；将来若新增独立商品页，应另设 URL slug，并制定旧页面、搜索引擎和外部链接的跳转策略。当前可见的静态定制页仍由 customizationHref 直达，例如 custom-t-shirts.html；贴章对话框优先使用 externalCustomizationHref 指向 NetproPatches。shop.html?category=... 和 shop.html?style=... 是目录筛选 URL，style 的值由定制页路径生成，不是 productId。路径契约见 app.js:206-225、app.js:644-673、app.js:698-708、shop-styles.js:46、shop-styles.js:115-123。

custom-products.js 只负责定制商品页图库、灯箱和头饰选项交互，不是商品数据源。各 custom-*.html 页面包含独立的文案、图库和产品说明。把目录对象迁入 CMS 不会自动迁移这些页面内容或交互。

## 询价及业务接口契约

浏览器状态保存在 netpro-b2b-enquiry，条目字段为 id、size、quantity、intent、customization、notes。intent 是 stock 或 custom；定制选项固定为 logo、material、style，备注最多 500 字；最多 50 行，每行最多 100,000 件。相同行由商品 ID、尺码、意图、定制选项和备注组合去重。规范见 enquiry-state.js:4-55、enquiry-state.js:65-149。

现有失效风险：normalizeItem 会用已加载的商品数组验证 ID 与尺码；商品列表非空而 ID 不存在，或尺码不再被该商品接受时，load() 会丢弃本地旧条目。若 CMS 公共查询只返回在售商品，简单下架或删档会让访客的本地询价在下一次读取时消失。

quote.js 在提交前由 id 查商品，并将 id 转成大写 sku（例如 tee-white 转为 TEE-WHITE），同时发送商品名、颜色、尺码、数量、stock/custom 意图、定制选项和备注；api/quote.js 校验这些字段并将其整理进报价邮件及幂等引用号。提交载荷目前没有独立 productId 字段；大写 sku 是现有邮件记录里的线索，既不等于原始小写 productId，也不能作为 CMS 的 productId。客户端和服务端入口见 quote.js:265-311、api/quote.js:31-96、api/quote.js:129-205。接口没有把商品或询价写入 Sanity 的逻辑。

## 建议的 Sanity 内容模型

后台字段标题、说明和分组均使用中文。用简短说明提示编辑人员哪些信息影响目录筛选、询价及旧链接；将机器关联编号设为创建后不可编辑或隐藏字段。不要让后台用标题、排序位置或 Sanity 自动生成 ID 替代业务 ID。

| 文档类型 | 字段建议 | 约束 |
|---|---|---|
| 商品分类 productCategory | categoryId、目录名称、风格卡分组名称、排序、是否在目录展示 | categoryId 保留 clothing/socks/headwear/bags/patches。现有目录显示 Clothing，而风格卡将 clothing 显示为 Apparel，应允许这两个展示名分别保留。 |
| 商品 product | productId、商品名称、商品说明、分类引用、参考颜色、色块、可选尺码、是否新品、排序、上架状态、目录图、穿着图、图片替代文本、定制页链接、外部定制链接 | productId 原样使用上方现有 ID，唯一且不可变；尺寸及当前 ID 粒度不变。排序与名称独立。无来源的价格、库存和规格字段不要伪造。 |
| 定制风格 catalogStyle | styleId、分类引用、名称、现有页面路径、图片、裁切/位置、替代文本、排序 | 可用现有 slug 作为 styleId（稳定但与 productId 分开）。首批 23 张卡片逐条保留，不把它们误建成商品。 |

展示字段按中文分组，例如“基本信息”“目录展示”“询价与定制”。图片编辑尽量用可视化图片控件；若仍沿用静态资源，保留原路径、position 和 size；若转为 Sanity 图片资源，也必须保留相同的裁切表现和 alt。customizationHref 的相对 .html 路径和锚点、externalCustomizationHref 的绝对 URL 应分别维护，不要合并成只含新 slug 的字段。

商品可有独立的 active/archived 上架状态。归档表示不在公开目录展示，不代表删除文档、改名或更换 productId。类别引用最终由前端投影为当前 category 字符串，以兼容筛选参数和现有组件。

新增分类需作为前端契约变更处理：适配器可向页面提供窗口级分类数据（例如 window.NETPRO_CATEGORIES），并让现有白名单、标题、筛选控件、风格卡 tabs 和 banner 查找该数据；继续兼容现有五个分类 ID 及 URL 参数。对现有类目只迁数据，不需要扩大筛选范围。

## 首次导入与前端消费

1. 以 products.js 和 data/catalog-style-entries.json 为唯一初次快照，生成导入预览，核对 31 件商品、5 个商品分类、23 张风格卡、唯一 ID 和所有链接。不得用首页 seed 覆盖商品内容。
2. Sanity 文档 _id 可用固定前缀加 productId/categoryId/styleId 确定性生成；业务 productId 本身仍单独存字段。导入采用只创建缺失文档的模式，遇到已有文档先报告差异，不默认覆盖编辑内容；保留源数组顺序并写入单独 sortOrder。图片先保留静态路径或按明确映射上传，不能丢失 sprite key、裁切和 alt。
3. 公开页面仅查询已发布且 active 的商品做目录展示；询价状态解析器还要能按 productId 读到归档商品。投影适配为现有前端字段（id、category、sizes、color、swatch、art/image、hoverImage、customizationHref 等），使产品卡片、搜索、筛选、对话框和本地询价沿用现有行为。不要将 Sanity _id 写进询价条目。
4. 类别筛选与风格卡分别读取分类和 catalogStyle 数据。保持 shop.html、定制页 .html 路径、贴章外链和 category/style 查询参数在切换数据源期间有效。

当前 CMS 接入只完成首页。商品查询、商品 schema、一次性导入、前端适配器和询价兼容改造都仍需独立实现和验证。

## 下架、删除与历史兼容策略

- 普通下架只把状态设为 archived；目录查询排除它，询价解析仍可读取其 ID、旧尺码、颜色和名称。
- 不物理删除曾公开或被询价引用的商品。发现重复或录错时保留旧 ID 为别名/映射，并把新 ID 显式映射；不能把旧 ID 重新分配给另一种产品。
- 旧尺码若不再接新请求，仍需在历史解析数据中保留；新旧可选值可分开管理。否则当前浏览器状态校验会静默丢条目。若前端未来改为保留条目快照，须能展示已归档商品并让用户确认可用性，提交时仍保持原 productId 与规格快照。
- 现有 quote API 发送邮件，未在此代码路径创建可供 CMS 级联删除的询价文档。邮件中的商品名、sku、颜色、尺码、数量和请求类型是历史快照，应作为历史记录保留。后续若添加持久化询价，应同时保存 productId 和提交时的名称/颜色/尺码快照，并允许关联目标归档而非级联删除。
- 如业务需要 API 明确收到 productId，应另行做向后兼容的 payload 扩展，并保留当前 sku、名称与规格快照；本次内容迁移不应重写报价 API。

## 不迁移到 Sanity 的接口

| 接口 | 当前职责 | 迁移边界 |
|---|---|---|
| POST /api/contact | 校验联系表单、限流/幂等并发送联系确认邮件 | 保留 api/contact.js Node handler；Pages API 薄包装在 pages/api/contact.ts。 |
| POST /api/quote | 校验询价、附件及商品行，生成引用号并发送客户与内部邮件 | 保留 api/quote.js 及其现有 payload、验证、附件、限流、幂等和邮件行为；薄包装在 pages/api/quote.ts。 |
| POST /api/purchase | 旧购买询价邮件入口；代码明确说明只收购买询价、不处理订单或付款 | 保留 api/purchase.js 与 pages/api/purchase.ts 兼容入口。purchase.js 和 purchase-products.js 的浏览器零售流程已注明退役。 |

Sanity 管理内容，不负责邮件、附件、限流、幂等、报价引用号或交易流程。CMS 预览的 App Router API 也不是商品业务 API。
