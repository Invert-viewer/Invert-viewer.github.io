import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // 对齐 tsconfig 的 @/ 路径别名
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // 仅收集 src 下的单元测试；Playwright E2E（tests/e2e/*.spec.ts）由 playwright 独立运行
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
