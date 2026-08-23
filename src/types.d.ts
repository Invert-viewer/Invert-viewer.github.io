// 临时移除 @hyacine/* 与 nyx-player 依赖（重构中）时的类型存根：
// 恢复依赖后应从下方移除对应声明，让真实类型生效。
// 签名对齐 @hyacine/cli@0.0.3 的 api 实际形状（勿随意改动，避免恢复时漂移）。
declare module "@hyacine/cli/api" {
  export interface HyacinePostSummary {
    summary?: {
      content?: string | null;
      model?: string | null;
    };
  }
  export interface HyacineSimilarPost {
    slug: string;
    title: string;
    score: number;
  }
  export function getPostSummary(slug: string): Promise<HyacinePostSummary | null>;
  export function findSimilarPosts(options: {
    query: string;
    limit?: number;
  }): Promise<{ items: HyacineSimilarPost[] }>;
}
declare module "nyx-player";
declare module "nyx-player/style";
declare module "@waline/client/style";
declare module "@pagefind/component-ui";
declare module "@pagefind/component-ui/css";
