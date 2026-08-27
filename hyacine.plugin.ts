import { defineConfig } from "@hyacine/plugin-core";
import siteUptime from "@hyacine/plugin-site-uptime";
import mouseFirework from "@hyacine/plugin-mouse-firework";
import articleAgeWarning from "@hyacine/plugin-article-age-warning";
import vercount from "@hyacine/plugin-vercount";
import analytics from "@hyacine/plugin-analytics";
import walineComments from "@hyacine/plugin-waline-comments";
import aiContent from "@hyacine/plugin-ai-content";
import visibilityTitle from "@hyacine/plugin-visibility-title";
import nyxPlayer from "@hyacine/plugin-nyx-player";
import articleStatistics from "@hyacine/plugin-article-statistics";

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
      siteCreatedAt: "2024-01-01T00:00:00Z",
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
    walineComments({
      serverURL: "",
      lang: "zh-CN",
    }),
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
      enable: false,
      urls: [
        {
          name: "默认歌单",
          url: "https://music.163.com/#/playlist?id=2943811283",
        },
      ],
      preset: "shokax",
      darkModeTarget: ":root[data-theme=dark]",
      metingBaseURL: "https://meting.api.zkz098.cn",
      metingUrlSource: "outer",
    }),
    articleStatistics(),
  ],
});
