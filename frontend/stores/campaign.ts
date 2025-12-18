import { create } from "zustand";
import type { Campaign, CampaignCreateInput, CampaignApplication, CampaignContent } from "@/types";
import api from "@/lib/api";

interface CampaignState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  applications: CampaignApplication[];
  contents: CampaignContent[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCampaigns: (params?: { status?: string; page?: number; limit?: number }) => Promise<void>;
  fetchCampaign: (id: string) => Promise<void>;
  createCampaign: (payload: CampaignCreateInput) => Promise<Campaign>;
  updateCampaign: (id: string, payload: Partial<CampaignCreateInput>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;

  // Applications
  fetchApplications: (campaignId: string) => Promise<void>;
  updateApplication: (campaignId: string, applicationId: string, status: "approved" | "rejected") => Promise<void>;

  // Contents
  fetchContents: (campaignId: string) => Promise<void>;
  reviewContent: (
    campaignId: string,
    contentId: string,
    payload: { status: "approved" | "revision_requested" | "rejected"; feedback?: string }
  ) => Promise<void>;

  clearError: () => void;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  currentCampaign: null,
  applications: [],
  contents: [],
  isLoading: false,
  error: null,

  fetchCampaigns: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getCampaigns(params);
      set({ campaigns: data.items, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "캠페인 목록을 불러오는데 실패했습니다";
      set({ error: message, isLoading: false });
    }
  },

  fetchCampaign: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const campaign = await api.getCampaign(id);
      set({ currentCampaign: campaign, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "캠페인을 불러오는데 실패했습니다";
      set({ error: message, isLoading: false });
    }
  },

  createCampaign: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const campaign = await api.createCampaign(payload);
      set((state) => ({
        campaigns: [campaign, ...state.campaigns],
        isLoading: false,
      }));
      return campaign;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "캠페인 생성에 실패했습니다";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateCampaign: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const campaign = await api.updateCampaign(id, payload);
      set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === id ? campaign : c)),
        currentCampaign: state.currentCampaign?.id === id ? campaign : state.currentCampaign,
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "캠페인 수정에 실패했습니다";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteCampaign: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteCampaign(id);
      set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== id),
        currentCampaign: state.currentCampaign?.id === id ? null : state.currentCampaign,
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "캠페인 삭제에 실패했습니다";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchApplications: async (campaignId) => {
    set({ isLoading: true, error: null });
    try {
      const applications = await api.getCampaignApplications(campaignId);
      set({ applications, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "신청 목록을 불러오는데 실패했습니다";
      set({ error: message, isLoading: false });
    }
  },

  updateApplication: async (campaignId, applicationId, status) => {
    set({ isLoading: true, error: null });
    try {
      const application = await api.updateApplication(campaignId, applicationId, status);
      set((state) => ({
        applications: state.applications.map((a) => (a.id === applicationId ? application : a)),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "신청 처리에 실패했습니다";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchContents: async (campaignId) => {
    set({ isLoading: true, error: null });
    try {
      const contents = await api.getCampaignContents(campaignId);
      set({ contents, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "콘텐츠 목록을 불러오는데 실패했습니다";
      set({ error: message, isLoading: false });
    }
  },

  reviewContent: async (campaignId, contentId, payload) => {
    set({ isLoading: true, error: null });
    try {
      const content = await api.reviewContent(campaignId, contentId, payload);
      set((state) => ({
        contents: state.contents.map((c) => (c.id === contentId ? content : c)),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "콘텐츠 검수 처리에 실패했습니다";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
