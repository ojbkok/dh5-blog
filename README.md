# 鸿蒙手记 · dh5.de5.net

华为终端全产品分享、鸿蒙（HarmonyOS）使用手册、鸿蒙电脑（HarmonyOS PC）指南。

纯静态站点：HTML + CSS + 原生 JS，**零构建、零依赖**，直接由 GitHub Pages 托管。

## 目录结构

```
index.html              页面骨架（头部、工具条、列表、阅读视图）
assets/style.css        全部样式（主题色在 :root 变量里）
assets/app.js           渲染、路由、搜索、主题、Markdown 解析
posts/posts.js          ★ 唯一的文章数据源
CNAME                   dh5.de5.net
```

## 怎么加 / 改一篇文章

打开 `posts/posts.js`，复制任意一个 `{ ... }` 块，改这几项即可，提交后自动生效：

| 字段 | 说明 |
| --- | --- |
| `slug` | 网址用，唯一，英文短横线 |
| `title` | 标题 |
| `category` | 只能是：鸿蒙手册 / 鸿蒙电脑 / 华为终端 / 生态互联 |
| `date` | `YYYY-MM-DD`，列表按日期倒序 |
| `readTime` | 预计阅读分钟数 |
| `tags` | 标签数组 |
| `summary` | 卡片和文章头部的摘要 |
| `body` | 正文，简化 Markdown（`##` 标题、`-` 列表、`>` 引用、`|` 表格、`**粗体**`） |

新增分类要同时改 `assets/app.js` 顶部的 `CATS` 数组。

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 部署

仓库 `main` 分支根目录即站点根目录，GitHub Pages 设定：

- Source: Deploy from a branch → `main` / `/`
- Custom domain: `dh5.de5.net`（由 `CNAME` 文件指定）
- Enforce HTTPS: 开启

DNS 在 DNSHE 管理：`dh5.de5.net` 的 `@` 与 `www` 均指向 `ojbkok.github.io`。
