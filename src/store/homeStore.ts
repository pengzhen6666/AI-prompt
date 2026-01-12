import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PromptDisplay } from "@/types/prompt";

interface HomeState {
  prompts: PromptDisplay[] | null;
  categories: string[] | null;
  activeCategory: string;
  searchQuery: string;
  hasMore: boolean;

  // Actions
  setPrompts: (
    prompts:
      | PromptDisplay[]
      | ((prev: PromptDisplay[] | null) => PromptDisplay[])
  ) => void;
  setCategories: (categories: string[]) => void;
  setActiveCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setHasMore: (hasMore: boolean) => void;
  clearAll: () => void;
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set) => ({
      prompts: null,
      categories: null,
      activeCategory: "全部",
      searchQuery: "",
      hasMore: true,

      setPrompts: (updater) =>
        set((state) => ({
          prompts:
            typeof updater === "function" ? updater(state.prompts) : updater,
        })),
      setCategories: (categories) => set({ categories }),
      setActiveCategory: (activeCategory) => set({ activeCategory }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setHasMore: (hasMore) => set({ hasMore }),
      clearAll: () =>
        set({
          prompts: null,
          hasMore: true,
          activeCategory: "全部",
          searchQuery: "",
        }),
    }),
    {
      name: "home-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
