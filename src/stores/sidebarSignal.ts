import { createSignal } from "solid-js";

/**
 * Sidebar 可见状态（SolidJS 版，P3 迁移用）
 * 对应原 svelte store（src/stores/sidebarStore.ts），迁移完成后移除 svelte 版
 */
export const [sidebarOpen, setSidebarOpen] = createSignal(false);

/**
 * 切换 sidebar 可见性
 */
export function toggleSidebar() {
  setSidebarOpen((open) => !open);
}