# Netpro Sourcing

Netpro Sourcing 的旧版静态网站与隔离的 Next.js + Sanity 实验工作树。当前实验代码已扩展到全站页面、商品目录、分类、定制款式和共享导航/页脚；旧询价 API、邮件处理与页面交互仍沿用原有实现。

> **当前状态（2026-10-17）：**首页、37 内页、共享设置和商品目录已安全导入，共 98 个真实内容文档。4832c1d 全站 Preview 构建与相关回归已通过；当前收尾图片提示、页面切换、预览刷新范围与云端 404。Production 未修改或部署。

- [稳定 Preview 地址](https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app)
- [Studio 地址](https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app/studio)
- [中文内容编辑指南](docs/CONTENT-EDITOR-GUIDE.md)
- [全站迁移状态与实施约束](docs/FULLSITE-MIGRATION.md)
- [阶段顺序、T 恤后续需求与已知问题](docs/DEVELOPMENT-ROADMAP.md)
- [页面盘点](docs/FULLSITE-PAGE-AUDIT.md) · [产品与目录盘点](docs/FULLSITE-PRODUCT-AUDIT.md)
- [首页试点迁移记录](docs/NEXTJS-SANITY-MIGRATION.md)（记录历史首页验收，不代表全站已验收）

## 开发

全站实验位于隔离工作树的 `experiment/nextjs-sanity` 分支。常用本地检查：

```powershell
npm run dev
npm run typecheck
npm run test
npm run cms:test
npm run catalog:test
npm run fullsite:test
npm run fullsite:http
```

页面与共享设置的初次 seed 在不带参数时只做 dry-run；只有在目标、备份和状态经过主代理确认后，工程维护者才可显式 apply。目录文档此前已导入，不要为了重跑而覆盖或重建现有内容。真实全站 HTTP 检查脚本见 `scripts/verify-fullsite-http.ts`；fullsite:test 已由主代理执行；云端 HTTP 检查已确认登记页面与 175 个同源资源，未知路由兼容补丁正在定向验收。后者仅访问 allowlisted localhost 或稳定 Preview，HTTP 只读，不写 CMS、不发送邮件。不要把实际密钥写进文档、客户端代码、报告或提交。

本地旧版静态页面仍可通过 `python -m http.server 8765` 浏览。询价接口回归可运行 `node --test tests/quote.test.js`，该检查不会发送邮件。

## 询价和正式环境

旧目录页面仍使用共享的 `enquiry-state.js` 浏览器存储与既有 quote API。产品 CMS 会保留稳定产品编号和历史尺码，归档产品不会删除已保存询价识别所需的身份。实际邮件投递仍需单独的安全验收；本次没有发送邮件。

Production 仍为旧站。未经明确授权，不合并到 `main`、不更改正式环境、不部署或提升 Production。
