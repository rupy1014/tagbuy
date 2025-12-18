import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Advertiser, InfluencerUser } from "@/types";
import api from "@/lib/api";

interface AuthState {
  user: User | Advertiser | InfluencerUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    name: string;
    type: "advertiser" | "influencer";
    companyName?: string;
    businessNumber?: string;
    instagramUsername?: string;
  }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.login(email, password);
          localStorage.setItem("token", data.access_token);
          set({ token: data.access_token, isLoading: false });
          await get().fetchUser();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "로그인에 실패했습니다";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.register(payload);
          localStorage.setItem("token", data.access_token);
          set({ token: data.access_token, isLoading: false });
          await get().fetchUser();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "회원가입에 실패했습니다";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem("token");
        set({ user: null, token: null });
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const user = await api.getMe();
          set({ user, isLoading: false });
        } catch (error) {
          set({ user: null, token: null, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
