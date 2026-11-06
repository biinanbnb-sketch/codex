# 自定义修改指南

## 先分清两个名字

| 名称 | 出现在哪里 | 修改位置 |
| --- | --- | --- |
| 应用名称，默认 `codex` | Finder、启动器菜单、生成的 `.app` 文件名 | `config/app.json` 的 `displayName` |
| 你的名字，默认“开发者” | 验证画面的操作员、欢迎画面、动画日志 | `config/splash.json` 的 `name` |
| 英文名字，默认 `DEVELOPER` | `WELCOME HOME, DEVELOPER` | `nameEn` |
| 终端用户名，默认 `dev` | 动画结尾 `dev@codex ~/project [pro] $` | `user` |
| 中央大字，默认 `CODEX` | 粒子汇聚后的标志 | `brand` |

修改启动器名称不会修改官方应用的名称。

## 推荐：用本地配置保存个人内容

共享默认值放在 `config/splash.json`，你可以直接修改它。若准备提交代码到 GitHub，建议把个人定制放入 **`config/splash.local.json`**。这个文件已被 Git 忽略，不会默认提交。

新建 `config/splash.local.json`，例如：

```json
{
  "name": "啊木",
  "nameEn": "AMU",
  "user": "amu",
  "sound": true,
  "hold": 1800,
  "welcomePrefix": "欢迎回来，",
  "modeText": "开始创造",
  "modeEn": "LET'S BUILD",
  "theme": {
    "accent": "#3fd8ff"
  }
}
```

只写需要覆盖的字段即可。对象字段（如 `theme`）会合并；数组字段（如 `stats`）会整组替换。`config/app.local.json` 同样可用于只在本机修改应用名称。JSON 不能包含注释，最后一个字段后不能加逗号。

本地配置不是加密存储。预览和构建会将合并结果写入生成文件；请不要在配置中填写密码、令牌或其他机密，也不要分发含私人配置的构建产物。

## 文字字段

以下字段都位于 `config/splash.json`，也都能在 `splash.local.json` 中覆盖：

| 字段 | 用途与例子 |
| --- | --- |
| `name` | 中文名或任意显示名，例如 `啊木` |
| `nameEn` | 英文名，显示时转为大写，例如 `AMU` |
| `user` | 动画终端用户名，例如 `amu` |
| `brand` | 中央标志文字；1–16位英文字母、数字、空格或 `._-`，显示时转为大写 |
| `subtitle` | 中央标志下面的小字，默认 `AGENTIC CODING RUNTIME` |
| `welcomePrefix` | 中文欢迎语前半句，默认 `欢迎回家，`；后面自动接 `name` |
| `welcomeEnPrefix` | 英文欢迎语前半句，默认 `WELCOME HOME, `；注意保留末尾空格 |
| `modeText` | “专业工作模式”这段中文 |
| `modeEn` | 上述模式对应的英文 |
| `operatorLabel` | 验证卡片里的“操作员 OPERATOR” |
| `operatorBadge` | 验证卡片右侧徽章，如 `ROOT · L5` |
| `welcomeBadge` | 欢迎标题上方小字；末尾会接本次随机动画会话号 |
| `promptHost` | 终端里 `@` 后面的主机名，默认 `codex` |
| `promptPath` | 终端示意路径，默认 `~/project`；不会访问这个路径 |
| `promptMode` | 终端模式标签，默认 `[pro]` |

一般文字字段最大100字符，但长文字可能影响排版。名字和中文主标题尽量保持简短；想隐藏某段普通文字可尝试空字符串。`brand` 必须保留至少1个字符。

## 验证画面与状态标签

`authTitles` 控制四个阶段的中英文标题，每项是 `[中文, 英文]`：

```json
{
  "authTitles": {
    "request": ["准备连接", "CONNECTING"],
    "verify": ["检查身份", "VERIFYING"],
    "success": ["验证完成", "VERIFIED"],
    "grant": ["工作区就绪", "WORKSPACE READY"]
  }
}
```

`checks` 是身份验证列表，`permissions` 是之后的权限展示列表。每一行都是 `[中文名称, 英文小字]`，**各保留5行**以匹配当前时间轴。

`stats` 是欢迎画面下方的状态展示，最多6组；例如：

```json
{
  "stats": [
    ["状态", "准备就绪"],
    ["今天", "专注创造"],
    ["模式", "个人工作区"]
  ]
}
```

这里的验证、权限和状态全部是动画文字；更改它们不会改变实际审批策略、系统权限、模型配置或智能体数量。

## 底部启动日志

`logMessages` 按原有出现顺序存放 **23条**日志文字。保留数组长度，在原位置修改即可，每条最多240字符。出现时间、来源和 OK/WARN 标签保留原有时间轴。

- `{name}`：替换为你的 `name`。
- `{n}`：仅第4条带动态文件计数。
- `{r}`：替换为动画中的就绪时间。

这些日志是演出内容，不是应用的真实诊断输出。若要改每条日志的时刻、来源、OK/WARN 或动态计数规则，查看 `src/codex-splash.js` 的 **`LOG`** 常量。

## 音效、停留与颜色

| 字段 | 允许值与说明 |
| --- | --- |
| `sound` | `true` / `false`；合成音效开关，动画右上角也能临时切换 |
| `hold` | 300–10000的整数，单位毫秒；只控制最后欢迎画面的停留时间，默认1400 |
| `theme.accent` | 主强调色，如 `#3fd8ff` |
| `theme.background` | 背景色，如 `#04070b` |
| `theme.foreground` | 主文字色，如 `#e6f8ff` |
| `theme.success` | 验证成功颜色，如 `#5cf2b0` |
| `theme.warning` | 警告颜色，如 `#ffb547` |

颜色使用完整的六位 `#RRGGBB`。整体布局以深色主题设计；复杂背景渐变、字体、扫描线和边框样式在源码的 **`CSS`** 常量中。

音效由 Web Audio 实时合成，没有 MP3 文件。若要更换音色或节奏，修改源码的 **`SFX`** 模块。浏览器预览可能需要点击后才允许出声，静音或系统音量设置也会影响实际播放。

`hold` 不是总时长；默认序列约12秒，再加欢迎停留和退场。系统启用“减少动态效果”时，会使用静态欢迎画面和较短的结束流程。

## 应用名称、版本与图标

`config/app.json`：

```json
{
  "displayName": "codex",
  "bundleIdentifier": "local.codex.splash-launcher",
  "version": "1.0.0"
}
```

- `displayName` 决定启动器在 Finder 的名称和 `dist/名称.app`。不要填斜线或路径。
- `bundleIdentifier` 是启动器自己的唯一标识；不要填写官方的 `com.openai.codex`。一般保持默认即可。
- `version` 是启动器版本，不是官方应用版本。
- `tools/make-icon.swift` 生成实际 `.icns`；修改它可更改应用图标。
- `assets/icon.svg` 是对应的矢量参考图。**只修改 SVG 不会自动改变 `.icns`**，需要同步修改图标生成代码，或自行替换构建流程。

## 修改后怎样生效

1. 编辑 `config/splash.json` 或个人的 `config/splash.local.json`。
2. 运行 `npm run check` 检查拼写、JSON 和字段范围。
3. 运行 `npm run preview`，打开终端显示的本机地址查看效果；修改配置后需要停止并重新启动预览命令。
4. 运行 `npm run build` 重新生成 `.app`。
5. 如果使用安装版，运行 `npm run install:app` 更新启动器。
6. 保存工作，⌘Q 完全退出官方应用，再从新启动器进入。

源码里的配置不会自动同步到已经生成或安装的 `.app`。不要直接修改 `.app/Contents/Resources` 中的文件，这会破坏它的签名；应修改仓库配置后重新构建。

## 进阶修改位置

| 想修改什么 | 源文件与搜索关键词 |
| --- | --- |
| 页面布局、字体、边框、扫描线 | `src/codex-splash.js` → `const CSS` |
| 代码图标的形状 | `src/codex-splash.js` → `drawLogoShape` |
| 粒子数量和球形运动 | `build`、`drawField`、`render` |
| 各阶段时间点 | `const T`、`const A`、`buildEvents` |
| 音效合成 | `const SFX` |
| 启动日志时刻和类型 | `const LOG` |
| 加载进度中的状态语 | `updateLoad` |
| CPU、内存、线程示意数字 | `updateHud`、`onFinal` |
| 顶部 BOOT / AUTHENTICATING / PRO MODE 文案 | 搜索 `htEl.textContent` 及 `BOOT SEQUENCE` |
| “扫描中 / 通过 / 已开放”等行状态文案 | `buildEvents` 与 `setRows` |
| 音效按钮、跳过按钮文字 | 搜索 `音效开关`、`跳过启动动画`、`setSnd` |
| 接入目标、签名、等待时限 | `launcher/run.mjs` |
| 窗口筛选和页面协议连接 | `launcher/cdp.mjs` |
| 覆盖层生命周期与清理 | `launcher/payload.mjs` |
| macOS 启动和预览窗口 | `native/Launcher.swift` |

修改时间轴时，应同时检查验证列表、欢迎画面、音效、退场时间和超时保护。不要只移动一个阶段而让其余事件重叠。
