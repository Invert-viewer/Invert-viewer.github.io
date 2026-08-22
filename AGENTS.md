# AGENTS.md — astro-blog-shokax

本文件定义你在此仓库工作的最小安全边界与执行流程。

## 运行环境与总原则

- 运行时与包管理器：**Node.js ≥ 22.12 + pnpm**（`packageManager: pnpm@11.22.0`）
- 默认沟通语言：**中文**（输出与代码注释优先中文）
- 优先使用仓库脚本，不要自创命令
- 路由要求：`trailingSlash: "always"`（内部链接保留尾 `/`）
- 不要随意偏离现有架构（Astro + SolidJS + UnoCSS + Pagefind）
- SolidJS 交互代码遵循现有风格（createSignal/createEffect/createMemo + JSX）
- 有代码改动后至少执行：
  1. `pnpm run format`
  2. `pnpm run lint`
  3. `pnpm run check`

## 注释

- 默认中文输出与中文注释
- 不要新增“工作总结 Markdown 报告”文件

## 代码标准

- 可复用独立 helper 优先放置到`/src/toolkit/`中，并编写独立单元测试
- 较为复杂的 UI 组件或页面需编写对应 E2E 测试
- 如果需要添加测试用或展示效果的 Markdown/MDX 页面，优先复用现有文件
