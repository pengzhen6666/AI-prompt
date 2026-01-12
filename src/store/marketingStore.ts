import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getMarketingStrategies, MarketingStrategy } from "@/servers/marketing";

interface MarketingStore {
  strategies: MarketingStrategy[];
  loading: boolean;
  initialized: boolean;
  lastFetched: number | null; // 时间戳

  // Actions
  fetchStrategies: (force?: boolean) => Promise<void>;
  getCostByType: (type: string, membershipCode: string) => number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 分钟缓存

export const useMarketingStore = create<MarketingStore>()(
  persist(
    (set, get) => ({
      strategies: [],
      loading: false,
      initialized: false,
      lastFetched: null,

      fetchStrategies: async (force = false) => {
        const { lastFetched, loading, strategies } = get();

        // 如果正在加载，或者（非强制刷新且数据未过期且已有数据），则跳过
        if (loading) return;
        if (
          !force &&
          lastFetched &&
          Date.now() - lastFetched < CACHE_DURATION &&
          strategies.length > 0
        ) {
          return;
        }

        set({ loading: true });
        try {
          const data = await getMarketingStrategies();
          set({
            strategies: data,
            initialized: true,
            lastFetched: Date.now(),
          });
        } catch (error) {
          console.error("Fetch marketing strategies error:", error);
        } finally {
          set({ loading: false });
        }
      },

      getCostByType: (type: string, membershipCode: string) => {
        const strategy = get().strategies.find((s) => s.type === type);
        if (!strategy || !strategy.config) return 0;

        // 映射会员等级到配置键，默认为 0
        const cost = strategy.config[membershipCode];
        return typeof cost === "number" ? cost : strategy.config["free"] || 0;
      },
    }),
    {
      name: "marketing-strategies-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
