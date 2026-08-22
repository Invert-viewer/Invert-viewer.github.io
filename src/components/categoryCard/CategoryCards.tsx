import { createSignal, For, onCleanup, onMount } from "solid-js";

import CategoryCard from "./CategoryCard.tsx";

interface PostInfo {
  title: string;
  url: string;
}

interface CategoryItem {
  name: string;
  url: string;
  cover?: string;
  topCategory?: {
    name: string;
    url: string;
  };
  postCount: number;
  childCount?: number;
  posts: PostInfo[];
}

interface CategoryCardsProps {
  categories?: CategoryItem[];
}

function CategoryCards(props: CategoryCardsProps) {
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);
  let container: HTMLDivElement | null = null;

  const handleMouseEnter = (index: number) => {
    if (activeIndex() !== null && activeIndex() !== index) {
      setActiveIndex(null);
    }
    setActiveIndex(index);
  };

  const handleMouseLeave = (index: number) => {
    if (activeIndex() === index) {
      setActiveIndex(null);
    }
  };

  onMount(() => {
    if (!container) return;

    const items = Array.from(container.querySelectorAll(".item"));
    if (items.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.classList.contains("show")) {
            io.unobserve(entry.target);
          } else if (entry.isIntersecting || entry.intersectionRatio > 0) {
            entry.target.classList.add("show");
            io.unobserve(entry.target);
          }
        });
      },
      { root: null, threshold: [0.3] },
    );

    items.forEach((item) => io.observe(item));
    items.slice(0, 2).forEach((item) => item.classList.add("show"));
  });

  onCleanup(() => {
    if (!container) return;
    const items = Array.from(container.querySelectorAll(".item"));
    items.forEach((item) => item.classList.remove("show"));
  });

  return (
    <div ref={(el) => (container = el)} class="cards w-full">
      <For each={props.categories ?? []}>
        {(category, i) => (
          <CategoryCard
            name={category.name}
            url={category.url}
            cover={category.cover}
            topCategory={category.topCategory}
            postCount={category.postCount}
            childCount={category.childCount}
            posts={category.posts}
            isActive={activeIndex() === i()}
            onMouseEnter={() => handleMouseEnter(i())}
            onMouseLeave={() => handleMouseLeave(i())}
          />
        )}
      </For>
    </div>
  );
}

export default CategoryCards;
