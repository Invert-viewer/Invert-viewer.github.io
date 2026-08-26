import { HyacineAiClient } from "@hyacine/sdk/ai";
import themeConfig from "@/theme.config";

export interface ResolvedAiSummary {
  content: string;
  model: string | null;
}

export interface ResolvedSimilarPost {
  slug: string;
  title: string;
  score: number;
}

const summaryCache = new Map<string, ResolvedAiSummary | null>();
const similarCache = new Map<string, ResolvedSimilarPost[]>();

let cachedAiClient: HyacineAiClient | null = null;

function getAiClient(): HyacineAiClient | null {
  if (cachedAiClient) return cachedAiClient;
  const apiUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.HYACINE_API_URL) ||
    process.env.HYACINE_API_URL;
  const token =
    (typeof import.meta !== "undefined" && import.meta.env?.HYACINE_READ_TOKEN) ||
    process.env.HYACINE_READ_TOKEN;

  if (!apiUrl) return null;

  cachedAiClient = new HyacineAiClient({
    apiUrl,
    token,
  });
  return cachedAiClient;
}

/**
 * 解析单篇文章的 AI 摘要：
 * 1. 优先读取 SDK D1 Loader 注入的 post.data.ai?.summary
 * 2. 其次读取 Frontmatter 中的物化值（ai_summary / ai_model / summary）
 * 3. 若均无且配置了网关 API，尝试通过 HyacineAiClient 按需获取
 */
export async function resolvePostAiSummary(post: {
  id: string;
  body?: string;
  data: {
    encrypted?: boolean;
    ai_summary?: string;
    aiSummary?: string;
    ai_model?: string;
    summary?: string;
    ai?: {
      summary?: {
        summary?: string | null;
        model?: string | null;
      } | null;
    } | null;
  };
}): Promise<ResolvedAiSummary | null> {
  if (post.data.encrypted) return null;

  const hycConfig = themeConfig.hyc || {};
  if (hycConfig.enable !== true || hycConfig.aiSummary?.enable === false) {
    return null;
  }

  // 1. SDK 注入值
  const sdkSummary = post.data.ai?.summary?.summary?.trim();
  if (sdkSummary) {
    return {
      content: sdkSummary,
      model: post.data.ai?.summary?.model ?? null,
    };
  }

  // 2. Frontmatter 物化值
  const fmSummary =
    post.data.ai_summary?.trim() || post.data.summary?.trim() || post.data.aiSummary?.trim();
  if (fmSummary) {
    return {
      content: fmSummary,
      model: post.data.ai_model?.trim() || null,
    };
  }

  // 3. 按需网关查询（带内存缓存）
  if (summaryCache.has(post.id)) {
    return summaryCache.get(post.id) ?? null;
  }

  const client = getAiClient();
  if (!client || !post.body) {
    summaryCache.set(post.id, null);
    return null;
  }

  try {
    const res = await client.getPostSummary({
      hash: post.id,
      content: post.body,
    });
    if (res?.summary) {
      const resolved: ResolvedAiSummary = {
        content: res.summary.trim(),
        model: res.model ?? null,
      };
      summaryCache.set(post.id, resolved);
      return resolved;
    }
  } catch {
    // 忽略网络或服务异常，安全降级
  }

  summaryCache.set(post.id, null);
  return null;
}

/**
 * 解析单篇文章的 AI 相似推荐：
 * 1. 优先读取 SDK 预计算注入的 similarPosts
 * 2. 其次若配置了网关 API，尝试通过 HyacineAiClient 远程查询
 */
export async function resolvePostSimilar(
  post: {
    id: string;
    data: {
      encrypted?: boolean;
      similarPosts?: Array<{ slug?: string; title?: string; score?: number }>;
      ai?: {
        similarPosts?: Array<{ slug?: string; title?: string; score?: number }>;
      } | null;
    };
  },
  options: { limit?: number; minSimilarity?: number } = {},
): Promise<ResolvedSimilarPost[]> {
  if (post.data.encrypted) return [];

  const hycConfig = themeConfig.hyc || {};
  if (hycConfig.enable !== true || hycConfig.aiRecommend?.enable === false) {
    return [];
  }

  const limit = options.limit ?? Math.max(1, Math.min(10, hycConfig.aiRecommend?.limit ?? 3));
  const rawMin = options.minSimilarity ?? hycConfig.aiRecommend?.minSimilarity ?? 0.4;
  const minSimilarity = Math.min(1, Math.max(0, rawMin > 1 ? rawMin / 100 : rawMin));

  // 1. SDK 预烘焙数据
  const candidates = post.data.similarPosts ?? post.data.ai?.similarPosts ?? [];
  if (candidates.length > 0) {
    return candidates
      .filter((item) => item.slug && item.slug !== post.id)
      .filter(
        (item): item is ResolvedSimilarPost =>
          typeof item.score === "number" &&
          item.score >= minSimilarity &&
          typeof item.title === "string" &&
          typeof item.slug === "string",
      )
      .toSorted((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 2. 按需网关查询（带内存缓存）
  if (similarCache.has(post.id)) {
    return similarCache.get(post.id) ?? [];
  }

  const client = getAiClient();
  if (!client) {
    similarCache.set(post.id, []);
    return [];
  }

  try {
    const items = await client.getSimilarPosts(post.id, {
      limit,
      minSimilarity,
    });
    const mapped: ResolvedSimilarPost[] = items
      .filter((item) => item.slug && item.slug !== post.id)
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        score: item.score,
      }));
    similarCache.set(post.id, mapped);
    return mapped;
  } catch {
    // 忽略异常，降级空列表
  }

  similarCache.set(post.id, []);
  return [];
}
