/**
 * dom project 共享测试环境补齐（jsdom 已知缺口）。
 *
 * jsdom 30 的 HTMLDialogElement 为空实现（无 showModal/close）：
 * 组件只依赖 open 反射属性 + showModal()/close()，这里用 defineProperty
 * 补最小语义实现（避免类型断言，保持与 lint 规则兼容）。
 */
if (
  typeof HTMLDialogElement !== "undefined" &&
  HTMLDialogElement.prototype.showModal === undefined
) {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = true;
    },
  });

  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = false;
    },
  });
}
