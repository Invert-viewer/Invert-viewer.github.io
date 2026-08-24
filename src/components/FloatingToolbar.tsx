import { createSignal, onCleanup, onMount } from "solid-js";
import { createModernMetingProvider, NyxPlayer } from "nyx-player-solid";
import "nyx-player-solid/style";

import { sidebarOpen, toggleSidebar } from "@/stores/sidebarSignal";
import type { ShokaXThemeConfig } from "@/toolkit/themeConfig";

interface FloatingToolbarProps {
  nyxPlayer?: ShokaXThemeConfig["nyxPlayer"];
}

const scrollToComments = () => {
  const target = document.querySelector("#comments");
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
};

function FloatingToolbar(props: FloatingToolbarProps) {
  const [scrollPercent, setScrollPercent] = createSignal(0);
  const [hasComments, setHasComments] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(false);
  const [isVisible, setIsVisible] = createSignal(true);

  const percentLabel = () => `${Math.max(0, Math.round(scrollPercent()))}%`;
  const nyxEnabled = () =>
    Boolean(props.nyxPlayer?.enable && props.nyxPlayer.urls && props.nyxPlayer.urls.length > 0);

  const updateScrollPercent = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    setScrollPercent(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
  };

  const updateHasComments = () => {
    setHasComments(Boolean(document.querySelector("#comments")));
  };

  const updateIsMobile = () => {
    setIsMobile(window.innerWidth <= 1023);
  };

  const toggleSidebarOnMobile = () => {
    if (!isMobile()) {
      return;
    }
    toggleSidebar();
  };

  // 元数据 provider：modern meting（meting-api-rs /v1 资源式），指向主题配置的自有端点。
  // 组件函数体仅执行一次（Solid 语义），provider 实例稳定；未启用/未配置时不构造。
  const metingProvider =
    props.nyxPlayer?.enable && props.nyxPlayer?.metingBaseURL
      ? createModernMetingProvider({
          baseURL: props.nyxPlayer.metingBaseURL,
          urlSource: props.nyxPlayer.metingUrlSource ?? "outer",
        })
      : undefined;

  onMount(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    updateScrollPercent();
    updateHasComments();
    updateIsMobile();

    let lastScrollY = window.scrollY;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const updateVisibility = () => {
      const currentScrollY = window.scrollY;
      const isScrollingUp = currentScrollY < lastScrollY;

      if (currentScrollY <= 8) {
        setIsVisible(true);
      } else if (isScrollingUp) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      lastScrollY = currentScrollY;

      if (idleTimer) {
        clearTimeout(idleTimer);
      }

      idleTimer = setTimeout(() => {
        setIsVisible(true);
      }, 180);
    };

    window.addEventListener("scroll", updateScrollPercent, { passive: true });
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateIsMobile, { passive: true });

    let observer: MutationObserver | null = null;

    if (!hasComments()) {
      observer = new MutationObserver(() => {
        if (hasComments()) {
          observer?.disconnect();
          return;
        }

        updateHasComments();
        if (hasComments()) {
          observer?.disconnect();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    onCleanup(() => {
      window.removeEventListener("scroll", updateScrollPercent);
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateIsMobile);
      observer?.disconnect();
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    });
  });

  return (
    <>
      <ul class={`floating-toolbar ${isVisible() ? "" : "is-hidden"}`}>
        <li class="tool top">
          <button
            type="button"
            onclick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="返回顶部"
          >
            <i class="i-ri-arrow-up-line"></i>
          </button>
          <span class="percent">{percentLabel()}</span>
        </li>
        {hasComments() && (
          <li class="tool">
            <button type="button" onclick={scrollToComments} aria-label="前往评论区">
              <i class="i-ri-chat-1-line"></i>
            </button>
          </li>
        )}
        {nyxEnabled() && (
          <>
            <li class="tool">
              <button id="nyx-show-btn" type="button" aria-label="显示或隐藏播放器">
                <i class="i-ri-music-2-line"></i>
              </button>
            </li>
            <li class="tool">
              <button id="nyx-play-btn" type="button" aria-label="播放或暂停">
                <i class="i-ri-play-circle-line"></i>
              </button>
            </li>
          </>
        )}
        <li class="tool mobile-only">
          <button
            type="button"
            onclick={toggleSidebarOnMobile}
            aria-label="切换侧栏"
            aria-pressed={sidebarOpen()}
            class={sidebarOpen() ? "active" : ""}
          >
            <i class="i-ri-layout-right-2-line"></i>
          </button>
        </li>
      </ul>

      {nyxEnabled() && (
        <NyxPlayer
          urls={props.nyxPlayer?.urls ?? []}
          showBtn="#nyx-show-btn"
          playBtn="#nyx-play-btn"
          darkModeTarget={props.nyxPlayer?.darkModeTarget ?? ':root[data-theme="dark"]'}
          preset={props.nyxPlayer?.preset ?? "shokax"}
          provider={metingProvider}
        />
      )}
    </>
  );
}

export default FloatingToolbar;
