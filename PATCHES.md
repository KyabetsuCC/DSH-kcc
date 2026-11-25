# 补丁清单（迁移用）

本仓库的定制全部以 `patch_fix*.js` 脚本的形式叠在上游代码上：workflow 先 checkout 上游树，再按序号依次 `node patch_fixNN.js`。
每个脚本都是**幂等**的（已打过会打印 SKIP），脚本里用 `// 标记名:` 作为幂等标记。

## 迁移到上游新版怎么做

1. 把整棵源码树换成上游新的 tag/commit（`patch_fix*.js`、`wf*.yml` 之外的无关目录不动）。
2. 按序号重跑全部补丁：`for f in $(ls patch_fix*.js | sort -V); do node $f . ; done`。
3. 日志里出现 `ANCHOR0` / `NOCHANGE` / `MISSING` 的脚本 = 上游这段代码变了，需要按当前上游代码手改锚点后重跑（这是唯一需要人力的部分）。
4. 引擎不随源码走：`.github/workflows/build-apk.yml` 里 `unzip -j official.apk "assets/engine*" -d toolchains/out/engine`，即**引擎二进制取自官方 APK**；上游发新版时把 `official.apk` 换掉即可同步引擎。
5. 装完跑一遍自检段（workflow 里那一串 `grep -c`），每个标记都应命中预期次数。

## 已知与上游冲突的高风险点

- 设置页（`feature/settings/SettingsScreen.kt`）被十几个补丁反复改，上游一改这块几乎必然撞锚点。
- `core/session/SessionStore.kt` / `core/engine/EngineManager.kt`（新增的 `session/cancel`、stop-hard 都在这）。
- 浏览器栈：`core/capability/BrowserTools.kt`、`core/capability/BrowserSession.kt`、`feature/browser/*`（我们把它从一个隐藏 WebView 改成了完整页面）。

## 补丁一览

| # | 脚本 | 做了什么 | 幂等标记 |
| --- | --- | --- | --- |
| 1 | `patch_fix.js` | 上游缺陷第一批：气泡间距 6dp→2dp 等 | — |
| 2 | `patch_fix2.js` | patch_fix2.js —— 上游缺陷第二批（#76-3 状态行 / #76-5 技能导入弹窗不能滚动） | — |
| 3 | `patch_fix3.js` | #76-2: never pin the tail while a finger is on the list (it cancelled the drag -> "UI frozen"). | — |
| 4 | `patch_fix4.js` | Pin more than once: the list re-applies its saved position after the first frame and the | — |
| 5 | `patch_fix5.js` | opens, so keep pinning on a widening schedule and stop the moment the user touches it. | — |
| 6 | `patch_fix6.js` | visible (and never yank a reader who scrolled somewhere else up to the bottom). | — |
| 7 | `patch_fix7.js` | 修上游缺陷：pin/滚动相关（无头注释） | — |
| 8 | `patch_fix8.js` | visible (and never yank a reader who scrolled somewhere else up to the bottom). | — |
| 9 | `patch_fix9.js` | Pin more than once: the list re-applies its saved position after the first frame and the blocks above finish laying out later (code, tables, images), which left | — |
| 10 | `patch_fix10.js` | finger is on the list - pinning during an overscroll pull froze the whole conversation (#76-2). streamed events settles and only if no finger is on the list - p | — |
| 11 | `patch_fix11.js` | 修上游缺陷（无头注释） | — |
| 12 | `patch_fix12.js` | 修上游缺陷（无头注释） | — |
| 13 | `patch_fix13.js` | 修上游缺陷（无头注释） | — |
| 14 | `patch_fix14.js` | 用量页 v2：把设置里原有「用量」section 的旧实现替换成新的两页式页面（UsageSection.kt 里的 UsagePage）。 旧的 private fun UsageSection(vm: SettingsViewModel) 只保留签名，函数体改为调用 UsagePage()。 | — |
| 15 | `patch_fix15.js` | 用量页 v3 的字符串（三套语言）。插在 </resources> 之前，幂等。 | — |
| 16 | `patch_fix16.js` | 用量页 v4：设置section里 UsageSection 已指向 UsagePage（patch_fix14）；这里只做自检。 若 workflow 复制了 usage_section.kt，则 SettingsScreen 的 UsageSection 必须调用 UsagePage。 | — |
| 17 | `patch_fix17.js` | 修上游缺陷批次 2：图片消息只看得到「图片 ×N」→ 可点击看大图；单次图片上限 4 → 9。 | — |
| 18 | `patch_fix18.js` | Sidebar <-> keyboard: opening the drawer always drops keyboard focus, so the IME never rides along with the sidebar and Back closes the drawer instead of a ling | — |
| 19 | `patch_fix19.js` | Keyboard: when the IME opens it shrinks this pane. If the reader was following the tail, keep the newest message visible instead of parking it behind the keyboa | — |
| 20 | `patch_fix20.js` | The bottom stretch that froze the conversation (#76-2): pinning while the list is ALREADY at its end scrolls into the overscroll region, and repeating that duri | — |
| 22 | `patch_fix22.js` | 设置页分组（无头注释，见 touches） | — |
| 23 | `patch_fix23.js` | 设置里加「备份/恢复」子页（BackupPage） | — |
| 24 | `patch_fix24.js` | 设置项（无头注释，见 touches） | — |
| 25 | `patch_fix25.js` | 设置项（无头注释，见 touches） | — |
| 26 | `patch_fix26.js` | 设置项（无头注释，见 touches） | — |
| 27 | `patch_fix27.js` | 补 import / 设计系统组件（无头注释） | — |
| 28 | `patch_fix28.js` | Composables 增补（无头注释） | — |
| 29 | `patch_fix29.js` | 0.0.37: price table + per-turn cost + caret-at-end for the composer text. | — |
| 30 | `patch_fix30.js` | 0.0.38: cost currency setting ("$" default, "¥" at the current rate). | — |
| 31 | `patch_fix31.js` | 0.0.39: warn before "stop" also kills the other running sessions (the SDK has no per-session cancel). imports | — |
| 32 | `patch_fix32.js` | 0.0.39: stop asks first when other sessions are running (the SDK stops the whole engine). --- 1. HomeViewModel: requestStop / confirmStop / dismissStop | — |
| 33 | `patch_fix33.js` | 0.0.39: backup page strings (localised). | — |
| 34 | `patch_fix34.js` | 0.0.40: money on the usage page (per-day chip, month total, CSV column). imports | — |
| 35 | `patch_fix35.js` | 0.0.40: context ring shows the cache hit rate beside it and the session's usage in its menu. 1. param on Composer + pass through | — |
| 36 | `patch_fix36.js` | 0.0.41: token usage per day and model (usage_model, DB v6), so money keeps the price of the model that spent it; the chat bubbles price each turn with its own m | — |
| 37 | `patch_fix37.js` | 0.0.41: the usage page prices every day with the model(s) that actually spent it. | — |
| 38 | `patch_fix38.js` | 0.0.44: usage_model keeps the bare model name (no provider prefix) + a "模型" string set. | — |
| 39 | `patch_fix39.js` | 0.0.45: usage_model v7 (total input, not just the uncached part). | — |
| 40 | `patch_fix40.js` | 0.0.46: stop only the current session (engine `session/cancel`). | — |
| 41 | `patch_fix41.js` | 0.0.47: usage page strings for the chart toggle and the "other" model row. | — |
| 42 | `patch_fix42.js` | 0.0.48: heatmap caption + strings. | — |
| 43 | `patch_fix43.js` | 关掉全 App 的过度滚动（回弹）动画：Compose 对望远镜/拉伸效果的 CompositionLocal 置 null。 | — |
| 44 | `patch_fix44.js` | 侧栏紧凑模式（设置开关）+ 新建文件夹图标挪到「会话」标题行右侧。 | — |
| 45 | `patch_fix45.js` | 会话内搜索：标题栏放大镜 → 全屏搜索层（匹配用户与 AI 文本，点结果跳到那一轮）。 | — |
| 46 | `patch_fix46.js` | 首页仪表盘：空会话首页在标题下方显示今日/近 30 天的 Token、花费与缓存命中。 | — |
| 47 | `patch_fix47.js` | 侧栏：把「权限与无障碍」换成「扩展」（插件/技能/MCP），可用性更高。 | — |
| 48 | `patch_fix48.js` | 侧栏底部卡片：今日花费 / 今日 Token / DeepSeek 峰谷时段进度。 | — |
| 49 | `patch_fix49.js` | 1) markdown 代码块右上角加「复制」按钮；2) 会话内搜索跳转后高亮目标轮次。 ---------- 1. code block copy button ---------- | — |
| 50 | `patch_fix50.js` | 会话内搜索结果计数的文案。 | — |
| 51 | `patch_fix51.js` | 阅读设置：字号缩放 + 对话区宽度（设置→通用 里的「阅读」组）。 | — |
| 52 | `patch_fix52.js` | drag sessions into folders | — |
| 53 | `patch_fix53.js` | cost block = title + 5 lines (SettingsCard {, two SettingsRow lines, closing }, closing }) | — |
| 54 | `patch_fix54.js` | snippets (quick notes): sidebar header icon + overlay | — |
| 55 | `patch_fix55.js` | （无头注释） | — |
| 56 | `patch_fix56.js` | 点输入框下方那排元素时不再收起输入法：把这些菜单改成非聚焦弹窗（不抢窗口焦点）。 | — |
| 57 | `patch_fix57.js` | 换行插在光标处（而不是永远追加到末尾）。 1) ComposerState: add insertNewline() | — |
| 58 | `patch_fix58.js` | 沉浸模式：隐藏状态栏（可从顶部下滑临时拉出），设置→外观 可开关。 | — |
| 59 | `patch_fix59.js` | 把自加的 5 个设置组（输入/侧栏/费用/外观/阅读）合并成一张卡，薄的行在前、厚的行在后。 | — |
| 60 | `patch_fix60.js` | 「界面」卡重排：有开关的行在上面，纯选项的行在下面；字号与宽度并成一横排。 | — |
| 61 | `patch_fix61.js` | 启动画面配色：蓝色底 -> 官方 dsh 的黑白（纯黑底 + 白色鲸鱼）。 1) 启动图标底色（splash 背景 + 自适应图标底色） | — |
| 62 | `patch_fix62.js` | 去掉俄语：删除 values-ru/ 与 locales_config 里的 ru（保留中英）。 1) 删掉整个 values-ru 目录 | — |
| 63 | `patch_fix63.js` | 复制页入口放会话右上角（标题栏，搜索键旁边），不放输入栏；点开是全屏浮层。 1) 状态：跟着 termOpen 一起声明 | — |
| 64 | `patch_fix64.js` | 启动画面：不要停留，内容一就绪立刻放行（能进多快就多快）； 但条件必须在第一帧之前设好，否则会先闪一下空窗口（黑屏）。 | — |
| 65 | `patch_fix65.js` | 代码块右上角的复制键太小不好按：放大到 34dp 并加一层底色，整块可点。 | — |
| 66 | `patch_fix66.js` | 屏幕工具语义化：screen_query（按文字/特征找元素，只回匹配项）+ screen_collect（翻页收集去重）。 1) 两个工具：插在 hand_to_user 之前 | — |
| 67 | `patch_fix67.js` | 0.1.8: the browser becomes a real, visible page. The WebView moves into a shared BrowserSession so the tools drive the very page the user is looking at, and coo | — |
| 68 | `patch_fix68.js` | 0.1.9: the browser is the user's too - the globe is always in the title bar, the sidebar gets a browser entry, and a blank page offers a few quick links so the  | `browser-globe-always` |
| 69 | `patch_fix69.js` | 0.1.10: a home button - back to the blank start page (address bar + quick links) at any time. | — |
| 70 | `patch_fix70.js` | 0.1.11: tabs + editable shortcuts on the browser start page. | — |
| 71 | `patch_fix71.js` | 0.1.12: the bottom-right globe opens a small menu instead of silently reloading. | — |
| 72 | `patch_fix72.js` | 导入后提示需要重启（配合 backup_page.kt 的原子改名 + 自动重启） | — |
| 73 | `patch_fix73.js` | 0.1.18: long-press the "new folder" icon to reorder folders (up / down), order persisted. | `folder-order-dialog` |
| 74 | `patch_fix74.js` | 0.1.19: show that the agent is driving the browser — breathing dot on the globe (conversation bar + sidebar entry) and an "AI is working" pill in the middle of  | `browser-live-dot` `browser-globe-always` `browser-live-dot-turn` |
| 75 | `patch_fix75.js` | 0.1.20: browser tools answer faster — the fixed waits between steps were tuned for headless use and dominated the wall time of a multi-step browsing turn. | `browser-speed` |
| 76 | `patch_fix76.js` | 0.1.21: stable element references in the agent browser. - read keeps the data-dsh-id it already gave an element, so ids survive re-reads and scrolling | `browser-stable-ref` |
| 77 | `patch_fix77.js` | 0.1.22: browser home tweaks - the X in the address bar really clears the field (it used to drop the draft and fall back to the url) | `bookmark-reorder` `bookmark-reorder-ui` |
| 78 | `patch_fix78.js` | 0.1.23: browser ergonomics - the address-bar clear button is a chevron-down ("put it down"), not a second X next to the close X | `browser-ergonomics` |
| 79 | `patch_fix79.js` | 0.1.24: swap the two symbols in the browser top bar - the address-bar clear button goes back to X (it clears the field) | `browser-ergonomics` `browser-close-chevron` |
| 80 | `patch_fix80.js` | 0.1.25: browser_home 工具 + browser_open 接受首页收藏名 | — |
| 81 | `patch_fix81.js` | 0.1.26: 浏览器深色（Theme.Dsh.WebLight/WebDark + 反射 setAlgorithmicDarkeningAllowed + ContextThemeWrapper） | — |
| 82 | `patch_fix82.js` | 0.1.27: 停止真停（stop-hard）+ 插件一键恢复（resume-all）+ 用量页 Cost 列（usage-cost-cell） | `stop-hard` `resume-all` `usage-cost-cell` |
| 83 | `patch_fix83.js` | ball-look: size + opacity for the floating ball and its bubble, in a sub-page of 设置. | `ball-look` `ball-look-ui` |
