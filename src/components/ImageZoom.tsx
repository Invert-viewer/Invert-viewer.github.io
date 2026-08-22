import { onMount } from "solid-js";

import { registerImageZoom } from "./image-zoom-element";

/**
 * image-zoom 自定义元素注册器（P3 迁移自 ImageZoom.svelte）
 *
 * 在 Layout 中以 <ImageZoom client:idle /> 挂载以触发注册；
 * Markdown 内容中的 <image-zoom> 元素由 image-zoom-element.ts 接管
 * （open shadow DOM + <slot> 分发 + <dialog> 预览）。
 */
function ImageZoom() {
  onMount(() => {
    registerImageZoom();
  });

  return null;
}

export default ImageZoom;
