# 工商自委网站系统（第二版）

辽宁工程技术大学工商管理学院大学生自律委员会官网与内部资料库。

## 这个站点解决什么

1. **对外展示**：首页、通知公告、活动照片面向访客，讲清工商自委是什么、做过什么。
2. **内部归档**：成员用邮箱账号登录后，把制度文件、模板、纪要、照片按「学年 — 部门 — 类型」上传，一届届沉淀。
3. **手册降级**：履职手册不再是站点中心，只作为资料库中的一份普通资料，保留在线阅读入口。

## 技术结构

- 前端：纯静态 HTML + CSS + 原生 JS，`assets/js/config.js` 集中配置。
- 后端：Supabase（Postgres + Storage + Auth）。
- 部署：GitHub Pages（`shrcyy/gswz-site`，分支 `main`）。

## 目录

```
index.html        首页（组织展示）
login.html        登录 / 注册
archive.html      资料库（三级筛选 + 公开/内部区分）
news.html         通知公告
gallery.html      活动照片
studio.html       成员工作台（上传资料 / 发通知 / 传照片 / 我的上传）
admin.html        管理后台（成员审核 + 内容管理）
manual.html       履职手册在线阅读
assets/css/style.css
assets/js/config.js     Supabase 地址、密钥、部门/类型/学年常量
assets/js/app.js        登录态、资料下载、格式化与提示
assets/js/manual-data.js 手册正文数据
assets/files/          手册 PDF / Word
supabase/setup.sql     数据库初始化脚本（可重复执行）
```

## 数据库

`supabase/setup.sql` 建四张表、两个存储桶、RLS 策略、触发器：

| 对象 | 用途 |
|---|---|
| `profiles` | 成员档案，含 `role`（member/admin）与 `status`（pending/approved/rejected） |
| `materials` | 资料，`academic_year` / `department` / `category` / `visibility` |
| `notices` | 通知，支持置顶与公开/内部 |
| `photos` | 活动照片，按 `activity` 分组 |
| `gswz-public` | 公开存储桶，匿名可读 |
| `gswz-internal` | 私有存储桶，仅成员可读（签名链接） |

规则：

- 首个注册的账号自动成为管理员并直接通过审核；之后注册的人都是成员、待审核。
- 上传即生效，没有审核队列；管理员只负责账号准入与内容清理。
- 成员不能用 API 把自己改成管理员（`protect_profile_fields` 触发器拦截）。

## 开通步骤

1. 打开 Supabase 项目 SQL Editor，整段执行 `supabase/setup.sql`。
2. 在 Authentication → Providers 确认 Email 已启用；如需注册后直接可用，可关闭「Confirm email」。
3. 打开网站，注册第一个账号 —— 它就是管理员。
4. 之后辅导员/部长注册，由管理员在 `admin.html` 里点「通过」。

## 维护要点

- 新增学年：改 `assets/js/config.js` 里 `SITE.years`，或在 `currentAcademicYear()` 中让它按 9 月自动切换。
- 新增部门或资料类型：改 `SITE.departments` / `SITE.categories`，无需动数据库。
- 换 Supabase 项目：只改 `config.js` 里的 `SUPABASE_URL` 与 `SUPABASE_ANON_KEY`，再执行一次 `setup.sql`。
- `anon` key 是公开密钥，可以出现在前端；`service_role` key 绝不能写进前端。

## 成员权限

- 管理员：审核入会、设为 / 取消管理员、移除成员（连同登录账号一起删除，其上传的资料保留）。
- 成员：上传资料、通知、照片；删除自己上传的内容。
- 访客：只看公开内容。

## 免费额度与能存多少

Supabase Free 计划（本项目当前）：

| 项目 | 免费额度 |
|---|---|
| 数据库 | 500 MB / 项目 |
| 文件存储 | 1 GB |
| 出站流量 | 5 GB + 缓存 5 GB，合计约 10 GB / 月 |
| 月活用户 | 50,000 |
| 计算资源 | 共享 CPU · 500 MB 内存 |
| 闲置暂停 | 连续 7 天无请求自动暂停 |

换算到实际使用：

- 数据库只存目录信息（标题、学年、部门、类型、文件路径），一条约 1KB，50 万条量级，正常用不到上限。
- 1 GB 文件：纯文档（100KB–2MB）约 500–10000 份；照片经前端自动压缩到 200–400KB，约 2500–5000 张。
- 10 GB / 月流量：按 300KB 一张算，约 3 万次图片浏览，组织内部完全够用。

注意：免费项目连续 7 天没有任何请求会被暂停，需到控制台手动恢复。寒暑假长期无人访问会触发，建议每周打开一次网站；如需长期稳定，升级 Pro（$25/月起，8GB 数据库 + 100GB 文件存储，且不暂停）。

## 已知边界

- 单文件上限 50MB，超出需先压缩。
- 照片上传自动压到长边 1600px、JPEG 质量 0.82，原图不会入库。
- 照片墙的签名链接有效期 1 小时，过期刷新页面即可重新签发。
- 站点是静态托管 + 云端数据库，不涉及服务器运维；如后续要自定义域名，在仓库 Settings → Pages 里绑定。
