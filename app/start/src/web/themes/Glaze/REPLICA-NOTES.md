# Glaze 主题复刻规格（React 侧）

> 本文件是 Glaze 内置主题各页面组件的共同依据。新增/修改页面组件前先读这里。
> 上游是 glaze（WestNote 风格的 WordPress 主题），本主题把它的 DOM 骨架与视觉层
> 搬到 utterlog 的 React 主题槽位上。

## 0. 定位

- 主题 id：`Glaze`，目录 `app/start/src/web/themes/Glaze/`。
- 样式表由 `bun run scripts/sync-glaze-theme-css.mjs` 生成（`styles.css` 是产物，**不要手改**）；
  手写补丁放 `adapter.css`（全局适配）或 `parts/*.css`（分页面补丁）。
- 所有 DOM 必须沿用上游 class 名，样式才能对上。**不要自创 class 名**，
  需要新样式时写进 `parts/<page>.css`，并挂到 `html[data-theme="Glaze"]` 作用域下。

## 1. 硬约束

1. TypeScript strict，不引入任何新依赖。
2. 内部跳转用 `@/components/AppLink`（`import Link from '@/components/AppLink'`），
   文章跳转用 `@/components/blog/PostLink`（`import PostLink from '@/components/blog/PostLink'`）。
3. 站点数据一律从 `useThemeContext()`（`@/lib/theme-context`）取：
   `site / owner / menus / categories / tags / archiveStats / timeZone / options / locale`。
   - `options` 是数据库 `options` 表的扁平字典，主题私有键统一用 `glaze_` 前缀。
   - `menus` 的 key 来自后台「菜单」页的位置 key，主题默认读 `menus.header`。
4. 时间一律带 `timeZone`（用 `utils.ts` 的 `dateLabel / dateTimeLabel / cardDateLabel / shortDateLabel`）。
5. 图标：上游 `menu-icons` 用 `<span className="glaze-icon" data-glaze-icon="talks" />`
   （`data-glaze-icon` 对应的 SVG 由主题样式表按名字挂载，共 78 个，取值见
   `app/start/src/web/themes/Glaze/assets/images/menu-icons/`）。
   通用图标（眼睛、评论、箭头等）用站点的 Font Awesome（`fa-regular fa-eye` 这类）。
6. 不要用 emoji 当功能图标（项目规范）。
7. 需要媒体查询/`:hover`/伪元素的样式一律写进 CSS 文件，不要写内联 `style`。
8. 移动端输入类控件字号 ≥ 16px（iOS Safari 聚焦缩放）。
9. 注释里只提「当前主题」或泛指，不要写「和某主题保持一致」。

## 2. 可用工具（`./utils.ts`）

```ts
dateLabel(value, timeZone)        // YYYY-MM-DD
dateTimeLabel(value, timeZone)    // YYYY-MM-DD HH:mm
cardDateLabel(post, timeZone)     // 30 天内相对时间，更早是日期
shortDateLabel(value, timeZone)   // M/D
relativeTime(value)               // 刚刚 / x 分钟前 / x 小时前 / x 天前
stripHtml(html) / excerptOf(post, len) / coverOf(post)
categoriesOf(post) / tagsOf(post)      // → [{ id, name, slug, icon, count }]
categoryHref(category) / tagHref(tag)
commentCountOf(post) / viewCountOf(post)
externalHost(url)
GLAZE_PALETTES / GLAZE_SCHEMES / GLAZE_BACKGROUNDS / GLAZE_CORNERS
appearanceFromOptions(options)         // → { palette, scheme, background, corners, contentWidth }
normalizeContentWidth(value)           // → '0600' 形式的 4 位字符串
```

## 3. 槽位 props 契约（由 `app/start/src/components/PublicPage.tsx` 传入）

| 组件 | props |
|---|---|
| `Layout` | `{ children: ReactNode }` —— 内部自行渲染 Header/Footer |
| `HomePage` | `{ posts, page, totalPages, categories, archiveStats, latestMoment, recentMoments, latestComments, perPage }` |
| `PostPage` | `{ post, options }` —— 内部自行渲染评论区 |
| `PostCard` | `{ post }` |
| `ArchivePage` | `{ posts, categories, tags, stats, timeZone }` |
| `CategoryPage` | `{ category, posts, timeZone }` |
| `TagPage` | `{ tag, posts, timeZone }` |
| `CategoriesPage` | `{ categories }` |
| `TagsPage` | `{ tags }` |
| `AboutPage` | `{ recentPosts }` |
| `LinksPage` | `{ initialLinks, initialOptions }` |
| `FriendsPage` | `{ friends, total, withPosts }` |
| `FeedsPage` | `{ friends, total, withPosts }` |
| `MomentsPage` | `{ initialMoments }` |
| `GuestbookPage` | `{ postId, commentCount, commentAuthors, lastCommentAt }` |
| `DashboardPage` | `{ posts, hotPosts, moments, momentTotal, comments, momentComments, links, categories, tags, stats, timeZone, siteTitle }` |
| `GoPage` | `{ target, countdown, countdownTotal, confirmed, onConfirm, onBack }` |
| `NotFoundPage` | 无 props |

数据结构要点：

- 文章列表项：`{ id, title, slug, excerpt, cover_url, view_count, comment_count, published_at, created_at, categories[], tags[] }`（列表接口不含正文）。
- 文章详情：`post.content` / `post.html` 是正文 HTML。
- 友链项：`{ id, name, url, description?, logo?, avatar?, group_name?, rss_url? }`。
- 朋友圈好友：`{ id, name, url, avatar, desc, group, posts: [{ title, link, description, pubDate }] }`。
- 说说：`{ id, content, images[], location, mood, created_at, like_count, comment_count, liked, is_pinned }`。
- 评论：`{ id, parent_id, author, url, content, avatar_url, avatar_candidates[], geo, is_admin, created_at, children[] }`。

## 4. 共享组件（直接用，别重写）

| 组件 | 路径 | props |
|---|---|---|
| `CommentForm` | `@/components/blog/CommentForm` | `{ postId, parentId?, onSuccess?, onCancel?, compact? }` |
| `PostContent` | `@/components/blog/PostContent` | `{ content }` |
| `TableOfContents` | `@/components/blog/TableOfContents` | `{ content }` |
| `CommentAvatar` | `@/components/CommentAvatar` | 见文件内 `CommentAvatarProps` |
| `PostLink` / `AppLink` | `@/components/blog/PostLink` / `@/components/AppLink` | 见上文 |
| `LazyImage` / `ResilientImage` | `@/components/blog/...` | 图片懒加载 |

评论数据加载用 `loadApprovedComments`（`@/lib/comment-pages`）：
`loadApprovedComments<Comment>(postId, 'asc' | 'desc')` → `Comment[]`。

## 5. 上游 DOM 骨架（必须照抄的 class）

### 5.1 页面标题（归档/分类/标签/搜索/404）

```
header.page-heading.glaze-panel
├─ h1.glaze-page-title
│   ├─ span.glaze-page-title-icon.squircle   ← 里面放 span.glaze-icon[data-glaze-icon=xxx]
│   └─ span  标题文字
└─ div.archive-description                    ← 可选描述
```

### 5.2 文章列表（所有列表页共用）

```
section.post-feed
├─ h1#latest-posts.screen-reader-text        ← 首页用；其它页用 page-heading
├─ div.post-list
│   └─ article#post-{id}.post-card[.post-card-has-image].glaze-panel
│       ├─ div.post-card-cover                ← 有封面时
│       │   └─ a.post-card-image > img
│       └─ div.post-card-copy
│           ├─ div.post-card-heading
│           │   ├─ h2.post-card-title
│           │   │   ├─ span.post-card-title-mark  ← 内容 "#"
│           │   │   └─ a[href]  标题
│           │   └─ span.post-meta-categories > a
│           ├─ div.post-excerpt
│           └─ div.post-card-footer
│               ├─ div.post-meta > time.post-card-date
│               └─ a|span.post-card-comment-group.t-avatar-group
│                   ├─ span.post-card-comment-avatar.t-avatar > img
│                   └─ span.post-card-comment-count.t-avatar
├─ div.post-feed-bottom                      ← 分页 + 标语（可选）
│   ├─ nav.navigation > div.nav-links > a.page-numbers
│   └─ div.post-feed-motto
└─ nav.navigation > div.nav-links > a.page-numbers
   或 div.empty-state.glaze-panel > p（无内容）
```

### 5.3 分页

```
nav.navigation > div.nav-links > a.page-numbers（当前页加 .current，禁用态用 span.page-numbers）
```

### 5.4 归档页（`archives` 集合页）

```
div.archive-view[data-glaze-archive]
├─ section.archive-activity
│   ├─ div.archive-activity-heading
│   │   ├─ h2#archive-activity-title
│   │   ├─ details.archive-years > summary + nav > a[data-archive-year-link]
│   │   └─ span.archive-year-total
│   └─ div.archive-calendar-frame
│       ├─ div.archive-calendar-scroll[role=region][tabindex=0]
│       │   ├─ div.archive-calendar-weekdays[aria-hidden] > span × 4
│       │   └─ div.archive-calendar-weeks > div.archive-calendar-week
│       │       ├─ div.archive-calendar-month[aria-hidden] > span
│       │       └─ a|span.archive-calendar-day[data-level=0..4]
│       └─ span.archive-calendar-loading[role=status]
│       └─ div.archive-calendar-legend > span + span.archive-calendar-day[data-level=0..4] × 5
└─ section.archive-index
    ├─ div.archive-section-heading > h2#archive-index-title
    ├─ p.archive-empty（无文章）
    └─ div.archive-month
        ├─ div.archive-section-heading > h3 + span（篇数）
        └─ ul.archive-posts[role=list] > li[id=archive-day-{Y-m-d}]
            └─ a.archive-post.squircle
                ├─ time[datetime]
                ├─ span.archive-post-title > span.glaze-icon + span（标题）
                └─ span.archive-post-metrics > span（评论数）+ span（浏览数）
```

热力日历数据来源：`ctx.archiveStats.heatmap`（`{ date: 'YYYY-MM-DD', count: number }[]`），
`data-level` 取 0–4（按当年文章数的分位）。

### 5.5 归档统计（页头下方）

```
ul.archive-stats[role=list] > li × 5：<strong>数值</strong> + 标签（文章 / 分类 / 字数 / 浏览 / 写作天数）
```

### 5.6 分类 / 标签

```
分类归档：header.page-heading.glaze-panel + div.post-list（同 5.2）
分类总览（CategoriesPage）：
div.category-grid
└─ a.category-card.glaze-panel > span.glaze-icon + span（名称）+ span（数量）
标签总览（TagsPage）：
div.tag-cloud
└─ a.tag-chip.glaze-panel > span.post-tag-hash + span（名称）+ sup.post-tag-count
```

### 5.7 友链（`links` 集合页）

```
ul.friend-list[role=list]
└─ li
    └─ a.friend-link[rel=external]
        ├─ span.collection-site-icon.squircle
        │   ├─ span.glaze-icon
        │   └─ img.collection-site-image
        ├─ span.friend-name
        └─ span.friend-description
```

### 5.8 订阅（`subscriptions` 集合页）

```
div.subscription-list
└─ article.subscription-item
    └─ a.subscription-link.squircle[rel=external]
        ├─ span.collection-site-icon.squircle
        ├─ div.subscription-copy
        │   ├─ div.subscription-meta > span（源站名）+ time
        │   ├─ h2
        │   └─ p（摘要）
        └─ span.collection-external-arrow
```

### 5.9 说说时间线（`talks` 集合页）

```
div.talk-timeline
├─ h2.talk-month                      ← 月份变化时插入（"F Y"）
└─ article#note-{id}.talk-item
    ├─ a.talk-date.squircle > time
    └─ div.talk-card.squircle
        ├─ ul.talk-tags[role=list] > li（有关键词时）
        ├─ h3（标题与正文不同时）
        ├─ 正文
        ├─ div.talk-images > a.squircle > img
        └─ a.talk-external.squircle[rel=external] > span.glaze-icon + span（域名）
```

### 5.10 404

```
section.page-heading.glaze-panel.error-page
├─ h1.glaze-page-title > span.glaze-page-title-icon.squircle + span
├─ p
├─ form[role=search].search-form
│   ├─ label.screen-reader-text
│   ├─ input.search-field[type=search][name=s]
│   └─ button.search-submit.control-button
└─ a.control-button[href=/] 回到首页
```

### 5.11 搜索表单（页头/404 用）

```
form[role=search].search-form
├─ label.screen-reader-text
├─ input.search-field[type=search][name=s][placeholder]
└─ button.search-submit.control-button（type=submit）
```

## 6. 关键 CSS 类速查

- 面板：`glaze-panel`；按钮：`control-button`；圆角：`squircle`；下拉：`t-dropdown`；
  隐藏文案：`screen-reader-text`；跳转链接：`skip-link`。
- 图标：`glaze-icon` + `data-glaze-icon=<名字>`。
- 头像组：`t-avatar-group` > `t-avatar`。
- 页面标题：`glaze-page-title` + `glaze-page-title-icon`。
- 文章卡片：`post-card` / `post-card-has-image` / `post-card-cover` / `post-card-copy` /
  `post-card-image` / `post-card-heading` / `post-card-title` / `post-card-title-mark` /
  `post-excerpt` / `post-card-footer` / `post-meta` / `post-card-date` /
  `post-meta-categories` / `post-card-comment-group` / `post-card-comment-avatar` / `post-card-comment-count`。
- 标签：`post-tags` > `a[rel=tag]` > `span.post-tag-hash` + 名称 + `sup.post-tag-count`。
- 空态：`empty-state`；搜索框：`search-form` / `search-field` / `search-submit`。

## 7. 验收

1. `cd app/start && bun run check`（tsc）通过。
2. 组件 DOM 的 class 与本文件一致（样式才对得上）。
3. 无 JSX 里写死的中文文案之外的多余噪音；文案用中文。
4. 不新增依赖、不改 `app/start/src/components/blog/*`（共享层是全站共用的）。
