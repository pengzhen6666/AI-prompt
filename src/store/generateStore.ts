import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GeneratedImage {
  id?: string;
  user_id?: string;
  image_url: string;
  prompt: string;
  model?: string;
  aspect_ratio?: string;
  resolution?: string;
  created_at?: string;
  is_liked?: boolean;
  [key: string]: any;
}

interface GenerateState {
  resultImages: GeneratedImage[];
  layout: "standard" | "compact" | "liked";
  isGenerating: boolean;
  progress: number;

  // Input Parameters
  prompt: string;
  aspectRatio: string;
  resolution: string;
  model: string;

  setResultImages: (
    images: GeneratedImage[] | ((prev: GeneratedImage[]) => GeneratedImage[])
  ) => void;
  removeImage: (id: string) => void;
  toggleLike: (id: string) => void;
  clearImages: () => void;
  setLayout: (layout: "standard" | "compact" | "liked") => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setProgress: (progress: number | ((prev: number) => number)) => void;

  // Setters for Input Parameters
  setPrompt: (prompt: string) => void;
  setAspectRatio: (aspectRatio: string) => void;
  setResolution: (resolution: string) => void;
  setModel: (model: string) => void;
  resetInputParameters: () => void;
}

export const useGenerateStore = create<GenerateState>()(
  persist(
    (set) => ({
      resultImages: [],
      layout: "standard",
      isGenerating: false,
      progress: 0,

      // Default Input Parameters
      prompt: "",
      aspectRatio: "9:16",
      resolution: "1k",
      model: "Nano Banana v2.0",

      setResultImages: (images) =>
        set((state) => ({
          resultImages:
            typeof images === "function" ? images(state.resultImages) : images,
        })),
      removeImage: (id) =>
        set((state) => ({
          resultImages: state.resultImages.filter((img) => img.id !== id),
        })),
      toggleLike: (id) =>
        set((state) => ({
          resultImages: state.resultImages.map((img) =>
            img.id === id ? { ...img, is_liked: !img.is_liked } : img
          ),
        })),
      clearImages: () => set({ resultImages: [] }),
      setLayout: (layout) => set({ layout }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setProgress: (progress) =>
        set((state) => ({
          progress:
            typeof progress === "function"
              ? progress(state.progress)
              : progress,
        })),

      // Setters for Input Parameters
      setPrompt: (prompt) => set({ prompt }),
      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      setResolution: (resolution) => set({ resolution }),
      setModel: (model) => set({ model }),
      resetInputParameters: () =>
        set({
          prompt: "",
          aspectRatio: "9:16",
          resolution: "1k",
          model: "Nano Banana v2.0",
        }),
    }),
    {
      name: "generate-storage",
      partialize: (state) => ({
        resultImages: state.resultImages,
        layout: state.layout,
        // Persist Input Parameters
        prompt: state.prompt,
        aspectRatio: state.aspectRatio,
        resolution: state.resolution,
        model: state.model,
      }),
    }
  )
);
