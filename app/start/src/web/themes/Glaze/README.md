# Glaze 主题

> 一套「釉色」质感的博客主题。上游是 [glaze](https://github.com/gentpan/Glaze)（WestNote 风格的
> WordPress 主题），本仓库把它的 DOM 骨架与视觉层整体搬进 Utterlog，做成**可在后台一键切换的内置独立主题**。

- **主题 id**：`Glaze`
- **版本**：1.0.0
- **形态**：内置主题（后台「主题」页直接切换）+ 可分发的 `Utterlog-Glaze-1.0.0.zip`
- **风格**：顶栏 + 底部图标 dock + 居中窄栏 + 首页双侧轨；浅/深双形态；14 套釉色配色

---

## 一、特色总览

### 1. 釉色配色系统（14 套）

整套视觉围绕「釉色」展开。每套配色定义 5 个 CSS 变量（`--glaze-accent` 主色、`--glaze-accent-middle`
中间色、`--glaze-accent-light` 浅色、`--glaze-accent-ink` 文字墨色、`--glaze-button-text` 按钮文字色），
由 `--glaze-accent` 派生出面板色、悬停色、边框色、链接色与强调填充色，因此换配色时整套界面统一变色，
不需要逐处调色。

| key | 名称 | 主色 | key | 名称 | 主色 |
|---|---|---|---|---|---|
| `green` | 青绿（Lime） | `#09c849` | `coral` | 珊瑚（Coral） | `#e45f4a` |
| `mint` | 薄荷（Mint） | `#089f83` | `amber` | 琥珀（Amber） | `#c68a13` |
| `teal` | 青碧（Celadon） | `#0896ac` | `slate` | 石板（Graphite） | `#526174` |
| `blue` | 靛蓝（Sky blue） | `#2456e8` | `cinnabar` | 朱砂（Cinnabar） | `#b7352d` |
| `indigo` | 蓝紫（Indigo） | `#5546d7` | `bamboo` | 竹青（Bamboo） | `#4c8c4a` |
| `violet` | 紫罗兰（Wisteria） | `#933fdb` | `ochre` | 赭石（Autumn ochre） | `#9a6b2f` |
| `pink` | 桃粉（Blossom） | `#d64087` | `lotus` | 莲华（Lotus mauve） | `#a34f8c` |

### 2. 浅色 / 深色双形态

深色不是简单反色：深色下背景压到纯黑 `#000`、面板降到 `#181818`、文字提到 `#f2f2f2`，
并把配色变量切换到 `--glaze-accent-light` 一侧，保证强调色在黑底上依然可读。

### 3. 圆角三档

- `squircle`（默认）：`@supports (corner-shape: squircle)` 时使用系统级超椭圆，浏览器不支持时退化为普通圆角
- `square`：直角
- `round`：控件整体正圆（头像、按钮、标签）

圆角档位通过 `--glaze-radius-factor` 与 `--glaze-corner-shape` 一组变量统管，`.squircle` 类只负责声明
「我参与圆角体系」，具体半径由各元素的 `--sq-r` 分档决定。

### 4. 极简顶栏 + 底部图标 dock

顶栏只放品牌（可换 logo）、站点描述、搜索与账户入口；主菜单做成**固定在视口底部的图标 dock**，
菜单项名字会拆成两行竖排显示（4 个汉字自动断行），屏幕窄时也不挤。宽屏下 dock 移到侧边、
首页侧轨变成贴边浮层。

### 5. 居中窄栏 + 首页双侧轨

内容栏宽度由「页面宽度」统一控制（顶栏、内容、页脚共用同一条宽度约束），默认 600px。
首页在内容两侧各挂一条侧轨，卡片式排布，可分别配置为：订阅更新 / 最近评论 / 最新短笔记 / 随机友链 / 隐藏。

### 6. 卡片化文章流

文章卡片为「有封面 / 无封面」两套结构：有封面时封面图与标题同处卡片上半区，下半区是摘要与元信息；
无封面时标题、摘要、元信息依次排列。分类、标签以小胶囊贴在标题下方，右下角是评论数。

### 7. 阅读体验

- **文章目录**：抽取正文 h2/h3 生成锚点目录，浮层弹窗展示，点击定位
- **正文字号**：文章页右上角 A− / A+ 实时缩放正文
- **阅读专注**：遮罩式专注模式，收起正文以外的干扰元素
- **图片灯箱**：正文图片点击放大、左右切换
- **代码高亮**：内置 highlight.js，正文含 `<pre>` 时按需加载

### 8. 评论区

表情（`[:slug:]` 语法）、裸链自动转外链确认页、@提及、楼层号与「#」水印、回复嵌套、
IP 属地、设备/浏览器徽章、博主徽章、待审核标记、评论顺序切换（最早/最新）、楼层分页。

### 9. 说说（短笔记）

按月分组的时间线：月份变化时插入月份标题，每条笔记带日期锚点、关键词标签、图片、外链。
笔记可发布 / 编辑 / 删除，支持图片上传与关键词。

### 10. 归档

- **热力日历**：按年展示每天的发文密度（0–4 级色阶），点击定位当天文章
- **年份切换**：多年度份快速跳转
- **月索引**：按月分组、每天一条，右侧带评论数与浏览数
- **分类 / 标签折叠面板**：放在归档页底部

### 11. 集合页

- **友链**：站点图标 + 名称 + 描述的清单
- **订阅**：订阅源卡片，含源站名、时间、标题与摘要

### 12. 站点级页面

关于页、留言板、仪表盘（站点数据总览）、外链跳转确认页（倒计时 + 目标域名核对）、
404 页（内置搜索框 + 回首页）。

### 13. 细节

分页标语手写 SVG、RSS 链接一键复制、在线人数、最近来访者归属地旗帜、Toast 提示条、
页面加载态、跳转到内容的 skip link。

---

## 二、参数与配置

所有外观参数写在站点 `options` 表的 `glaze_*` 键上，后台「主题 → Glaze 设置」面板可视化调整。

| option 键 | 取值 | 默认 | 作用 |
|---|---|---|---|
| `glaze_palette` | 上表 14 个 key | `green` | 主题配色（釉色） |
| `glaze_scheme` | `light` / `dark` | `light` | 默认深浅色形态 |
| `glaze_background` | `none` / `blue-preview` / `ripples` | `blue-preview` | 背景光斑效果 |
| `glaze_corners` | `squircle` / `square` / `round` | `squircle` | 圆角模式 |
| `glaze_content_width` | 360–1600（px） | `600` | 内容栏宽度（顶栏/内容/页脚共用） |

优先级：**访客在前台配色器的选择 > 后台设置**。访客的选择记在浏览器 `localStorage`
（`glaze-palette` / `glaze-scheme`），首帧内联脚本读取后立刻写到根元素的 `data-glaze-*` 属性上，
避免先亮一下再变暗。

根元素承载的属性：

| 属性 | 含义 |
|---|---|
| `data-glaze-palette` | 当前配色 key |
| `data-glaze-palettes` | 全部可用配色 key（空格分隔） |
| `data-glaze-scheme` | `light` / `dark` |
| `data-glaze-background` | 背景效果类型 |
| `data-glaze-corners` | 圆角模式 |
| `data-glaze-content-width` | 4 位零填充的宽度（`0600` = 600px；前两位百位、后两位余量） |

---

## 三、与上游 WordPress 主题的对应关系

### 完整保留

- **DOM 结构**：所有页面沿用上游 class 名（`post-card` / `entry-hero` / `home-rail-card` /
  `comment-thread` / `archive-calendar` / `talk-card` / `friend-link` / `subscription-link` …），
  CSS 直接套用，无损还原观感。
- **CSS 变量体系**：`--glaze-*` 全套语义变量与派生关系。
- **图标集**：上游 78 枚 `menu-icons` 矢量图标（`data-glaze-icon="talks"` 形式遮罩渲染）。
- **字体资源**：Paper Mono（代码块）、toast-icons。
- **配色 / 圆角 / 宽度语义**：取值范围与默认值与上游对齐。

### 按站点能力替换

| 上游（WordPress） | 本主题（Utterlog） |
|---|---|
| `get_the_excerpt()` / `the_content()` | 文章载荷的 `excerpt` / `content` |
| `wp_nav_menu()` | 后台「菜单」页维护的 `menu_header` / `menu_footer` |
| `get_avatar()` / 邮件头像 | 站点头像 + `avatar_candidates` |
| `the_posts_pagination()` | 手写 `nav.navigation > div.nav-links > a.page-numbers` |
| `comment_form()` | 共享评论表单组件 `@/components/blog/CommentForm` |
| 自定义器（Customizer） | 后台「主题 → Glaze 设置」面板 + `options` 表 |
| 主题模版（`page-memos.php` 等） | 固定路由：`/moments`、`/archives`、`/links`、`/feeds` |

### 未移植（依赖 WordPress 侧能力）

- 随机友链刷新（上游走 `wp-json` 的 blogroll 接口）
- 在线人数 presence、最近来访者旗帜（上游依赖自己的访问统计表）
- 说说发布编辑器（上游是前台编辑；本仓库的写入端在后台）
- 分页标语的手写 SVG 生成（上游用字体轮廓实时绘制）
- IP 属地国旗与设备/浏览器徽章的具体素材

---

## 四、目录结构

```text
app/start/src/web/themes/Glaze/
├─ *.tsx                  主题组件（23 个槽位）
├─ utils.ts               时间、摘要、分类标签、配色与外观参数的公共工具
├─ nav.ts                 路由 → 图标名映射、菜单兜底项
├─ theme.json             主题清单（id / 版本 / 特性 / adminPanels）
├─ screenshot.svg         后台主题卡片预览图
├─ styles.css             ← 生成物，勿手改
├─ adapter.css            手写：与站点骨架（滚动容器、应用层 globals）的对接
├─ parts/                 手写：分页面样式补丁（post / comments / archive / about / links / moments / dashboard / go）
├─ upstream/              vendor 的上游 CSS 源文件（main / wide-dock / wide-rails）
└─ assets/                图标（menu-icons）与字体（woff2）
```

对应产物：`app/start/src/web/public/themes/Glaze/`（`styles.css` / `theme.json` / `screenshot.svg`
的真实副本，由 `sync-theme-styles.mjs` 同步，不能用软链）。

---

## 五、使用

1. 后台 → **主题**，在列表里选 **Glaze** → 切换 → 刷新前台生效。
2. 外观微调在同页的 **Glaze 设置** tab：配色、深浅色、背景、圆角、内容宽度。
3. 菜单在 **菜单** tab 配置，主题取 `menu_header`（底部 dock）与 `menu_footer`（页脚）；
   未配置 `menu_header` 时回退到「首页 / 归档 / 说说 / 友链 / 关于」。

---

## 六、开发

样式表是**生成物**，改样式请改 `adapter.css` / `parts/*.css` 或 `upstream/` 下的源文件，
然后重新生成：

```bash
bun run scripts/sync-glaze-theme-css.mjs   # 重新生成 themes/Glaze/styles.css
bun run build:web                          # 同步到 public/themes/Glaze/
bun run check                              # 类型检查
```

生成脚本做三件事：

1. **资源路径改写**：`../fonts/`、`../images/` → `assets/fonts/`、`assets/images/`
   （样式表发布在 `/themes/Glaze/styles.css`，资源在同目录 `assets/` 下）。
2. **作用域化**：每条规则加 `html[data-theme="Glaze"]` 前缀。线上加载顺序是
   「主题 styles.css → 应用层 globals.css」，同优先级下后加载的 globals 会盖掉主题，
   必须靠作用域抬优先级；`:root` / `html` 规则改为作用域本身，使根变量只在 Glaze 生效。
3. **拼补丁**：末尾依次拼 `adapter.css` 与 `parts/*.css`（按文件名排序）。

新增主题组件时先读 `REPLICA-NOTES.md`（槽位 props 契约、上游 DOM 骨架、工具函数、硬约束）。

---

## 七、当前状态

- 类型检查、`bun run build`、主题白名单测试均通过。
- 核心组件做了 SSR 冒烟渲染校验（布局 / 顶栏 / 页脚 / 首页 / 卡片 / 文章页 / 侧轨 / 目录 / 评论区）。
- 已完成浏览器端视觉回归（本地 PostgreSQL + 内置浏览器），覆盖首页、文章页、归档、
  分类 / 标签（列表页与详情页）、说说、友链、关于、留言板、订阅、搜索、外链确认页、
  仪表盘与 404，并分别核验了浅色 / 深色两套配色。回归中修掉的问题：
  - 卡片评论数圆圈多余图标挤掉数字；
  - 阅读控件的定位覆盖了上游样式（改为沿用上游 sticky 左栏）；
  - 评论区 DOM 与上游 `comment-row.php` 不匹配（重排 `.comment-meta` 层级，补楼层号与回复提及）；
  - 留言板复用了共享评论组件，表单仍是应用层蓝色（改用主题私有评论区）；
  - 共享页面（搜索等）仍读应用层 `--color-*` 令牌（映射到当前主题令牌）。
- 尚未逐项比对上游线上演示站的多分辨率表现；窄屏（≤640px）只做了样式检查，未做真机回归。

---

## 八、出处与许可

- 上游主题：[glaze](https://github.com/gentpan/Glaze)（WestNote 风格的 WordPress 主题）。
- 第三方资源随上游一并 vendor：Font Awesome Free 图标（CC BY 4.0）、Paper Mono 与 toast-icons
  （SIL OFL 1.1）、Simple Icons 归属、旗标素材 —— 详见上游 `THIRD_PARTY_NOTICES.md`
  与 `assets/fonts/*.txt`、`assets/images/menu-icons/NOTICE.txt`。
- 本移植版仅在 DOM 承载与数据来源上做了适配，视觉层保持上游原样。
