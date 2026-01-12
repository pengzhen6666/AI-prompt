import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { XHSResult } from "@/servers/ai";

interface XHSState {
  result: XHSResult[] | null;
  uploadedPaths: string[];
  history: any[] | null;
  setResult: (
    result:
      | XHSResult[]
      | null
      | ((prev: XHSResult[] | null) => XHSResult[] | null)
  ) => void;
  setUploadedPaths: (paths: string[] | ((prev: string[]) => string[])) => void;
  setHistory: (
    history: any[] | null | ((prev: any[] | null) => any[] | null)
  ) => void;
  generating: boolean;
  progress: number;
  setGenerating: (val: boolean) => void;
  setProgress: (val: number | ((prev: number) => number)) => void;
  clearAll: () => void;
}

export const useXHSStore = create<XHSState>()(
  persist(
    (set) => ({
      result: null,
      uploadedPaths: [],
      history: null,
      generating: false,
      progress: 0,
      setResult: (val) =>
        set((state) => ({
          result: typeof val === "function" ? val(state.result) : val,
        })),
      setUploadedPaths: (val) =>
        set((state) => ({
          uploadedPaths:
            typeof val === "function" ? val(state.uploadedPaths) : val,
        })),
      setHistory: (val) =>
        set((state) => ({
          history: typeof val === "function" ? val(state.history) : val,
        })),
      setGenerating: (val) => set({ generating: val }),
      setProgress: (val) =>
        set((state) => ({
          progress: typeof val === "function" ? val(state.progress) : val,
        })),
      clearAll: () => set({ result: null, uploadedPaths: [], history: null }),
    }),
    {
      name: "xhs-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        result: state.result,
        uploadedPaths: state.uploadedPaths,
        history: state.history,
      }),
    }
  )
);
