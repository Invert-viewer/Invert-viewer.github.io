import { toggleSidebar } from "@/stores/sidebarSignal";

function SidebarOverlay() {
  return (
    <div
      class="fixed inset-0 bg-black/50 z-7 cursor-pointer lg:hidden [animation:fadeIn_0.3s_ease]"
      onclick={toggleSidebar}
      role="button"
      tabindex="0"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") toggleSidebar();
      }}
      aria-label="Close sidebar"
    ></div>
  );
}

export default SidebarOverlay;
