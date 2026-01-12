import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { VideoPromptResult } from "@/servers/ai";

export interface VideoResult {
  id: string;
  image_url: string;
  results: VideoPromptResult[];
  created_at: string;
  is_optimistic?: boolean;
}

interface PromptState {
  response: string;
  videoResults: VideoPromptResult[];
  currentImageUrl: string | null;
  imageHistory: any[] | null;
  videoHistory: VideoResult[] | null;
  generating: boolean;
  progress: number;

  // Input Parameters
  selectedStyle: string | null;
  personStyle: string;
  analyzeFace: boolean;
  selectedFaceId: string;
  selectedActionId: string;
  isRefined: boolean;
  customStyleText: string;

  setResponse: (val: string | ((prev: string) => string)) => void;
  setVideoResults: (
    val:
      | VideoPromptResult[]
      | ((prev: VideoPromptResult[]) => VideoPromptResult[])
  ) => void;
  setCurrentImageUrl: (
    val: string | null | ((prev: string | null) => string | null)
  ) => void;
  setImageHistory: (
    val: any[] | null | ((prev: any[] | null) => any[] | null)
  ) => void;
  setVideoHistory: (
    val:
      | VideoResult[]
      | null
      | ((prev: VideoResult[] | null) => VideoResult[] | null)
  ) => void;
  setGenerating: (val: boolean) => void;
  setProgress: (val: number | ((prev: number) => number)) => void;

  // Setters for Input Parameters
  setSelectedStyle: (val: string | null) => void;
  setPersonStyle: (val: string) => void;
  setAnalyzeFace: (val: boolean) => void;
  setSelectedFaceId: (val: string) => void;
  setSelectedActionId: (val: string) => void;
  setIsRefined: (val: boolean) => void;
  setCustomStyleText: (val: string) => void;
  resetInputParameters: () => void;
  clearAll: () => void;
}

export const usePromptStore = create<PromptState>()(
  persist(
    (set) => ({
      response: "",
      videoResults: [],
      currentImageUrl: null,
      imageHistory: null,
      videoHistory: null,
      generating: false,
      progress: 0,

      // Default Input Parameters
      selectedStyle: "default",
      personStyle: "lumina4", // Note: will be synced in component if needed
      analyzeFace: false,
      selectedFaceId: "default",
      selectedActionId: "default",
      isRefined: true,
      customStyleText: "",

      setResponse: (val) =>
        set((state) => ({
          response: typeof val === "function" ? val(state.response) : val,
        })),
      setVideoResults: (val) =>
        set((state) => ({
          videoResults:
            typeof val === "function" ? val(state.videoResults) : val,
        })),
      setCurrentImageUrl: (val) =>
        set((state) => ({
          currentImageUrl:
            typeof val === "function" ? val(state.currentImageUrl) : val,
        })),
      setImageHistory: (val) =>
        set((state) => ({
          imageHistory:
            typeof val === "function" ? val(state.imageHistory) : val,
        })),
      setVideoHistory: (val) =>
        set((state) => ({
          videoHistory:
            typeof val === "function" ? val(state.videoHistory) : val,
        })),
      setGenerating: (val) => set({ generating: val }),
      setProgress: (val) =>
        set((state) => ({
          progress: typeof val === "function" ? val(state.progress) : val,
        })),

      // Setters for Input Parameters
      setSelectedStyle: (selectedStyle) => set({ selectedStyle }),
      setPersonStyle: (personStyle) => set({ personStyle }),
      setAnalyzeFace: (analyzeFace) => set({ analyzeFace }),
      setSelectedFaceId: (selectedFaceId) => set({ selectedFaceId }),
      setSelectedActionId: (selectedActionId) => set({ selectedActionId }),
      setIsRefined: (isRefined) => set({ isRefined }),
      setCustomStyleText: (customStyleText) => set({ customStyleText }),

      resetInputParameters: () =>
        set({
          selectedStyle: "default",
          personStyle: "lumina4",
          analyzeFace: false,
          selectedFaceId: "default",
          selectedActionId: "default",
          isRefined: true,
          customStyleText: "",
        }),

      clearAll: () =>
        set({
          response: "",
          videoResults: [],
          currentImageUrl: null,
          imageHistory: null,
          videoHistory: null,
        }),
    }),
    {
      name: "prompt-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        response: state.response,
        videoResults: state.videoResults,
        currentImageUrl: state.currentImageUrl,
        imageHistory: state.imageHistory,
        videoHistory: state.videoHistory,
        // Persist Input Parameters
        selectedStyle: state.selectedStyle,
        personStyle: state.personStyle,
        analyzeFace: state.analyzeFace,
        selectedFaceId: state.selectedFaceId,
        selectedActionId: state.selectedActionId,
        isRefined: state.isRefined,
        customStyleText: state.customStyleText,
      }),
    }
  )
);
