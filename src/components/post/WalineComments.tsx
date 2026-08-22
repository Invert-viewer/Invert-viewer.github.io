import { onCleanup, onMount } from "solid-js";

import { init, type WalineInstance } from "@waline/client";
import "@waline/client/style";
import { currentLocale, t } from "@/i18n";

interface WalineCommentsProps {
  serverURL?: string;
  lang?: string;
  dark?: boolean | string;
  path?: string;
  pagePath?: string;
}

function WalineComments(props: WalineCommentsProps) {
  let walineEl: HTMLDivElement | null = null;

  onMount(() => {
    if (!props.serverURL || !walineEl) {
      return;
    }

    const finalPath =
      props.path ||
      props.pagePath ||
      (typeof window !== "undefined" ? window.location.pathname : "/");

    const waline: WalineInstance | null = init({
      el: walineEl,
      serverURL: props.serverURL,
      path: finalPath,
      lang: props.lang ?? currentLocale,
      dark: props.dark ?? false,
    });

    onCleanup(() => {
      waline?.destroy();
    });
  });

  return (
    <>
      {props.serverURL ? (
        <div ref={(el) => (walineEl = el)}></div>
      ) : (
        <div class="waline-disabled">{t("footer.walineNotConfigured")}</div>
      )}
    </>
  );
}

export default WalineComments;
