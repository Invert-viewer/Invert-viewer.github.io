import { defineConfig, definePlugin } from "@hyacine/plugin-core";
import siteUptime from "@hyacine/plugin-site-uptime";
import mouseFirework from "@hyacine/plugin-mouse-firework";
import articleAgeWarning from "@hyacine/plugin-article-age-warning";
import vercount from "@hyacine/plugin-vercount";
import analytics from "@hyacine/plugin-analytics";
import aiContent from "@hyacine/plugin-ai-content";
import visibilityTitle from "@hyacine/plugin-visibility-title";
import nyxPlayer from "@hyacine/plugin-nyx-player";
import articleStatistics from "@hyacine/plugin-article-statistics";
import themeConfig from "./src/theme.config.ts";

const walineComments = () => {
  const walineConfig = themeConfig.comments?.waline ?? {};
  return definePlugin({
    name: "@hyacine/plugin-waline-comments",
    version: "0.1.0",
    minRenderCapability: "ssr",
    supportedPlatforms: ["astro"],
    entry: [
      {
        name: "waline-comments-ssr",
        type: "ssr",
        platform: "astro",
        injectPoint: "comment",
        path: new URL("./src/components/WalineComments.astro", import.meta.url).href,
        props: {
          serverURL: walineConfig.serverURL ?? "",
          lang: walineConfig.lang,
          dark: walineConfig.dark,
          path: walineConfig.path,
        },
      },
    ],
  });
};

export default defineConfig({
  injectPoints: {
    "footer-status": {
      selector: "#footer .status",
      position: "append",
    },
    "post-header": {
      selector: "article.post header",
      position: "after",
    },
    "post-footer": {
      selector: "article.post .body",
      position: "after",
    },
  },
  plugins: [
    siteUptime({
      siteCreatedAt: "2021-08-24T09:00:00Z",
      prefixText: "本站已运行",
    }),
    mouseFirework({
      count: 16,
      radius: 80,
    }),
    articleAgeWarning({
      maxAgeDays: 180,
    }),
    vercount(),
    analytics({
      googleAnalytics: {
        measurementId: "",
      },
      umami: {
        websiteId: "",
        scriptUrl: "",
      },
    }),
    walineComments(),
    aiContent({
      enable: false,
      aiSummary: {
        enable: true,
        title: "AI 摘要",
        showModel: true,
      },
      aiRecommend: {
        enable: true,
        limit: 3,
        minSimilarity: 0.4,
      },
    }),
    visibilityTitle({
      enable: true,
      leaveTitle: "👀 你先忙，我等你回来~",
      returnTitle: "🎉 欢迎回来！",
      restoreDelay: 3000,
    }),
    nyxPlayer({
      enable: true,
      urls: [
        {
          name: "留给自己的",
          url: "https://music.163.com/playlist?id=18034007157&uct2=U2FsdGVkX18bFnBR4m+nKQNORdJPXPT1MWdsJLmcBxM=",
        },
      ],
      preset: "shokax",
      darkModeTarget: ":root[data-theme=dark]",
    }),
    articleStatistics(),
  ],
});
