import { createEffect, onCleanup, onMount } from "solid-js";
import type { ECharts, SetOptionOpts } from "echarts/core";

/** setOption 接受的 option 形状（自引用，避免依赖 echarts 内部类型导出名） */
type EChartOption = Parameters<ECharts["setOption"]>[0];

export interface UseEChartsOptions {
  /** 容器元素（Solid ref signal） */
  container: () => HTMLDivElement | null;
  /** 生成当前 option（主题色在调用时解析，保证 data-theme 变化后刷新拿新值） */
  option: () => EChartOption;
  /** echarts 实例化器（组件侧已验证模块注册） */
  init: () => Pick<ECharts, "setOption" | "resize" | "dispose"> | null;
  /** setOption 附加参数（默认 notMerge 全量替换，主题切换不留旧态） */
  setOptionOpts?: SetOptionOpts;
}

/**
 * echarts 实例生命周期 hook（Solid 组合式），统一三图表的样板：
 * - onMount：init + 首次 setOption
 * - ResizeObserver：容器尺寸变化 → resize
 * - MutationObserver：html[data-theme] 变化 → 全量刷新 option（主题色联动）
 * - 数据源变化（props 变化）→ notMerge 刷新
 * - onCleanup：断开观察 + dispose
 */
export function useECharts(options: UseEChartsOptions): void {
  const { container, option, init, setOptionOpts = { notMerge: true } } = options;

  let chart: Pick<ECharts, "setOption" | "resize" | "dispose"> | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let themeObserver: MutationObserver | null = null;

  onMount(() => {
    const element = container();
    if (!element) {
      return;
    }
    const instance = init();
    if (!instance) {
      return;
    }
    chart = instance;
    instance.setOption(option(), setOptionOpts);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => instance.resize());
      resizeObserver.observe(element);
    }

    if (typeof MutationObserver !== "undefined") {
      themeObserver = new MutationObserver((mutations) => {
        const themeChanged = mutations.some((mutation) => mutation.attributeName === "data-theme");
        if (themeChanged) {
          instance.setOption(option(), setOptionOpts);
        }
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }
  });

  // 数据源变化 → 刷新（props 静态时此 effect 仅首次空转；主题切换由 observer 覆盖）
  createEffect(() => {
    const current = option();
    chart?.setOption(current, setOptionOpts);
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
    themeObserver?.disconnect();
    chart?.dispose();
    chart = null;
    resizeObserver = null;
    themeObserver = null;
  });
}
