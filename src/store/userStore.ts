import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/types";
import { supabase } from "@/supabase";
import { getUserInfoServerAPI } from "@/servers/user";
import { useMarketingStore } from "./marketingStore";

interface UserState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  fetchProfile: (user?: User) => Promise<void>;
  initAuth: () => () => void; // Returns unsubscribe function
  logout: () => Promise<void>;

  // Auth Modal Global State
  isAuthModalOpen: boolean;
  authModalMode: "login" | "signup";
  redeemCode: string;
  openAuthModal: (mode?: "login" | "signup", code?: string) => void;
  closeAuthModal: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      loading: true,
      initialized: false,

      // Modal State
      isAuthModalOpen: false,
      authModalMode: "login",
      redeemCode: "",

      openAuthModal: (mode = "login", code = "") =>
        set({
          isAuthModalOpen: true,
          authModalMode: mode,
          redeemCode: code,
        }),
      closeAuthModal: () => set({ isAuthModalOpen: false, redeemCode: "" }),

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),

      fetchProfile: async (user) => {
        try {
          const { data } = await getUserInfoServerAPI(user);
          set({ profile: data.profile });
        } catch (err) {
          console.error("Fetch profile error in store:", err);
        }
      },

      initAuth: () => {
        if (get().initialized) return () => {};

        // Listen for auth changes (this will also catch the initial session event)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          const user = session?.user ?? null;
          const currentProfile = get().profile;

          set({ user, loading: false, initialized: true });

          // Refresh profile only if user changed or profile is missing
          if (user) {
            if (!currentProfile || currentProfile.id !== user.id) {
              await get().fetchProfile(user);
            }
            // 每次登录都强制刷新营销策略
            useMarketingStore.getState().fetchStrategies(true);
          } else {
            set({ profile: null });
          }
        });

        return () => subscription.unsubscribe();
      },

      logout: async () => {
        await supabase.auth.signOut();
        // 重置并清空所有持久化状态
        const { usePromptStore } = await import("./promptStore");
        const { useGenerateStore } = await import("./generateStore");

        // 重置输入参数
        usePromptStore.getState().resetInputParameters();
        useGenerateStore.getState().resetInputParameters();

        // 清空生成历史
        usePromptStore.getState().clearAll();
        useGenerateStore.getState().clearImages();

        set({ user: null, profile: null });
      },
    }),
    {
      name: "user-profile-storage",
      storage: createJSONStorage(() => localStorage),
      // 仅持久化 user 和 profile，不持久化 loading 和 initialized
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
      }),
    }
  )
);
