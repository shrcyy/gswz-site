# 工商管理学院大学生自律委员会 官方网站

辽宁工程技术大学工商管理学院大学生自律委员会（工商自委）官方网站，托管于 GitHub Pages，零服务器成本，面向全网公开（内容已按脱敏要求处理）。

## 站点地址

- 网站：https://shrcyy.github.io/gswz-site/
- 代码仓库：https://github.com/shrcyy/gswz-site

## 栏目结构

| 页面 | 说明 |
| --- | --- |
| index.html | 组织介绍：组织简介、四部门架构、干部配置、改革发展历程 |
| manual.html | 履职手册在线阅读（12 章导航 + 全文搜索）+ PDF/Word 下载 |
| news.html | 通知动态：公告、工作简报留档 |
| gallery.html | 活动相册：按品牌活动分类，照片陆续补充中 |

## 目录结构

```
gswz-website/
├── index.html          组织介绍
├── manual.html         履职手册在线阅读
├── news.html           通知动态
├── gallery.html        活动相册
└── assets/
    ├── css/style.css   全局样式（正式庄重风设计体系）
    ├── js/main.js      交互脚本（导航、手册渲染、搜索、分页）
    ├── js/manual-data.js  手册全文数据（由 docx 生成，勿手改）
    └── files/          手册 PDF / Word 下载文件
```

## 更新指南（由办公室维护）

### 1. 更新通知动态

编辑 `news.html`，在 `.news-list` 中按现有 `<article class="news-item">` 结构新增条目即可。发布时间与落款按公文格式填写。

### 2. 补充活动照片

1. 照片统一命名：`日期-活动名-序号.jpg`（如 `20260910-安全知识竞赛-01.jpg`）；
2. 将照片放入 `assets/img/` 目录（新照片可先建子目录，如 `assets/img/安全知识竞赛/`）；
3. 在 `gallery.html` 对应相册卡片中，将占位图替换为 `<img src="assets/img/...">` 图片墙，并移除"待补充"角标；
4. 遵守发布纪律：人物出镜需征得同意，不打码的丑照不用，不披露同学姓名、学号、寝室号等个人信息。

### 3. 更新履职手册（新学年修订时）

手册正文由 docx 生成 `manual-data.js`，步骤：

1. 用新 docx 替换 `assets/files/学生干部履职指导手册（正式版）.docx`，并另存/转换为同名 PDF；
2. 用 Word 打开 docx → 另存为 PDF，替换 `assets/files/` 下的 PDF；
3. 重新生成 `manual-data.js`：将 docx 导出为 Markdown（章节标题用 `#`/`##`/`###`，表格用管道格式），放入站点仓库根目录 `_manual_source.md`，然后按 `build_manual_data.py` 的逻辑重新生成数据文件（脚本存于交接材料中，或联系网站维护负责人）；
4. 同步更新 `news.html` 发布新版施行公告。

### 4. 部署方式

修改本地文件后：

```bash
git add -A
git commit -m "更新说明"
git push origin main
```

推送后 GitHub Actions 自动构建部署，约 1 分钟内生效。

## 维护约定

- 网站由工商自委办公室归口维护，主席团把关重要内容；
- 内容一律脱敏：不发布同学姓名、学号、联系方式、寝室号等个人信息；
- 对外发布口径以学院文件为准；
- 换届时移交仓库管理权限与本地工作目录，保证组织记忆延续。
