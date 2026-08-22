import solid from "@astrojs/solid-js";
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import esToolkitPlugin from "vite-plugin-es-toolkit";
import { transformerColorizedBrackets } from "@shikijs/colorized-brackets";
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
} from "@shikijs/transformers";

import UnoCSS from "@unocss/astro";

import mdx from "@astrojs/mdx";

import spoiler from "./src/satteri-plugins/spoiler.ts";
import noteDirective from "./src/satteri-plugins/note-directive.ts";
import spanDirective from "./src/satteri-plugins/span-directive.ts";
import satteriBreaks from "./src/satteri-plugins/breaks.ts";
import satteriIns from "./src/satteri-plugins/ins.ts";
import satteriKatex from "./src/satteri-plugins/katex.ts";
import satteriAutolinkHeadings from "./src/satteri-plugins/autolink-headings.ts";
import satteriAutoImport from "./src/satteri-plugins/auto-import.ts";
import satteriEmoji from "./src/satteri-plugins/emoji.ts";
import satteriRubyDirective from "./src/satteri-plugins/ruby-directive.ts";
import codeGroup from "./src/satteri-plugins/code-group.ts";

const mdxAutoImports = [
  "@/components/mdx/Spoiler.astro",
  "@/components/mdx/Note.astro",
  "@/components/mdx/Label.astro",
  "@/components/mdx/Underline.astro",
  "@/components/mdx/Strike.astro",
  "@/components/mdx/Highlight.astro",
  "@/components/mdx/Text.astro",
  "@/components/mdx/Kbd.astro",
  "@/components/mdx/Sup.astro",
  "@/components/mdx/Sub.astro",
  "@/components/mdx/Collapse.astro",
  "@/components/mdx/QuizGroup.astro",
  "@/components/mdx/Quiz.astro",
  "@/components/mdx/QuizOptions.astro",
  "@/components/mdx/QuizOption.astro",
  "@/components/mdx/QuizAnswer.astro",
  "@/components/mdx/QuizGap.astro",
  "@/components/mdx/QuizMistake.astro",
  "@/components/mdx/Tabs.astro",
  "@/components/mdx/Tab.astro",
];

import Font from "vite-plugin-font";

import PlayformInline from "@playform/inline";
import { installProcessWarningFilter } from "./src/toolkit/suppressWatcherWarning";
import themeConfig from "./src/theme.config.ts";

if (themeConfig.diagnostics?.suppressFsWatcherMaxListenersWarning !== false) {
  installProcessWarningFilter();
}

// https://astro.build/config
export default defineConfig({
  site: "https://preview.astro.kaitaku.xyz",
  trailingSlash: "always",
  build: {
    format: "directory",
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },

  integrations: [
    UnoCSS({
      injectReset: true,
    }),
    // P3 完成：全部组件已迁移至 SolidJS
    solid(),
    sitemap(),
    // NOTE: @hyacine/astro@0.0.3 与 Astro 7.0.6 不兼容（config:setup 阶段
    // vite module runner 已关闭 → 插件配置加载失败 → virtual:hyacine/runtime
    // 无 loader → 构建 UNLOADABLE，CI 从 P2 起全红）。临时停用以解锁构建；
    // 待上游修复或自研兼容后恢复（内容端 @hyacine/cli/api 不受影响）。
    // hyacinePlugin(),
    mdx(),
    PlayformInline({
      Logger: 0,
    }),
  ],

  vite: {
    ssr: {
      // AstroContainer 场景：阻止 astro/container 与 @astrojs/mdx 被打入 client bundle。
      // 否则构建期会求值 CLIENT_ENTRY（require.resolve('vite/dist/client/client.mjs')），
      // 在 pnpm 严格隔离布局下解析失败 → "cannot test case insensitive FS, CLIENT_ENTRY ..."
      // （bun 扁平 node_modules 下可解析，故 bun 时代 CI 正常）
      external: [
        "astro/container",
        "@astrojs/mdx",
        // css-tree（@unocss/transformer-directives 链）：其 lib/data-patch.js 用
        // createRequire(import.meta.url)("../data/patch.json") 动态加载相对 JSON，
        // 打包进 prerender chunk 后相对路径失效（Cannot find module '../data/patch.json'）；
        // external 后回落包内路径解析（css-tree 已 root hoist 保证可见）
        "css-tree",
        // svgo（astro 图片/HTML 优化链）：plugins 内 createRequire(import.meta.url)("../package.json")
        // 读取自身版本；打包后相对路径失效
        "svgo",
        "csso",
        // jiti：lib/jiti.mjs 动态 require "../dist/babel.cjs"
        "jiti",
      ],
    },
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).toString(),
      },
    },
    plugins: [
      Font.vite({
        scanFiles: ["src/**/*.{tsx,ts,js,jsx,md,mdx,json,astro}"],
        css: {
          fontDisplay: "optional",
        },
      }),
      esToolkitPlugin(),
    ],
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      transformers: [
        transformerNotationDiff(),
        transformerNotationHighlight(),
        transformerNotationFocus(),
        transformerNotationErrorLevel(),
        transformerMetaHighlight(),
        transformerColorizedBrackets(),
      ],
    },
    processor: satteri({
      features: {
        gfm: true,
        math: true,
        directive: true,
        headingAttributes: true,
      },
      mdastPlugins: [
        satteriAutoImport(mdxAutoImports),
        satteriBreaks(),
        satteriIns(),
        satteriKatex(),
        satteriEmoji(),
        satteriRubyDirective(),
        noteDirective(),
        spanDirective(),
        codeGroup(),
        [spoiler, { title: "..." }],
      ],
      hastPlugins: [satteriAutolinkHeadings()],
    }),
  },
});
