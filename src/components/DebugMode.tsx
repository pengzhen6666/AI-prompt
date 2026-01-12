import { useState } from "react";
import { Bug, Sparkles, FileText, Plus, Loader2, Layout } from "lucide-react";
import { supabase } from "@/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGenerateStore } from "@/store/generateStore";

export const DebugMode = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { isGenerating, setIsGenerating, setProgress } = useGenerateStore();

  const toggleSkeleton = () => {
    const nextState = !isGenerating;
    setIsGenerating(nextState);
    if (nextState) {
      setProgress(45); // Set a mock progress for preview
      toast.info("已开启骨架屏预览模式");
    } else {
      setProgress(0);
      toast.info("已关闭骨架屏预览模式");
    }
  };

  // 仅在开发模式下显示
  if (import.meta.env.PROD) return null;

  const addMockPrompt = async () => {
    setIsAdding(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      const mockUrl =
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800";

      const { error } = await supabase.from("generated_prompts").insert({
        user_id: user?.id || null,
        image_url: mockUrl,
        prompt_result:
          "A stunning abstract digital artwork with flowing lavender and soft pink shapes, elegant curves, minimal composition, high resolution, soft lighting.",
        title: "调试-模拟提示词",
      });

      if (error) throw error;
      toast.success("成功添加模拟提示词记录");
      // 触发页面刷新或通过事件通知组件更新 (此处简单处理，用户可手动刷新或等待状态同步)
    } catch (err: any) {
      console.error("Debug add error:", err);
      toast.error("添加失败");
    } finally {
      setIsAdding(false);
    }
  };

  const addMockCopywriting = async () => {
    setIsAdding(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      const mockUrl =
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800";

      const mockResults = [
        {
          type: "pure",
          title: "冬日里的那一抹温柔 ✨",
          description:
            "今天的阳光刚刚好，穿上最喜欢的毛衣，感觉整个人都被治愈了。#冬日穿搭 #心情语录",
          tag: ["冬日", "温柔", "穿搭"],
        },
        {
          type: "daily",
          title: "日常随手拍 📸",
          description:
            "生活虽然平凡，但不代表不精彩。捕捉生活中的小确幸。#生活碎片 #记录美好",
          tag: ["日常", "记录", "生活"],
        },
      ];

      const { error } = await supabase.from("generated_copywriting").insert({
        user_id: user?.id || null,
        title: mockResults[0].title,
        description: mockResults[0].description,
        tags: mockResults[0].tag,
        results: mockResults,
        image_url: mockUrl,
        image_urls: [mockUrl],
      });

      if (error) throw error;
      toast.success("成功添加模拟文案记录");
    } catch (err: any) {
      console.error("Debug add error:", err);
      toast.error("添加失败");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      {/* Menu */}
      {isOpen && (
        <div className="mb-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          <div className="p-2 flex flex-col gap-1">
            <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-zinc-800 mb-1">
              Debug Menu
            </div>
            <button
              onClick={addMockPrompt}
              disabled={isAdding}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>一键添加提示词</span>
              {isAdding && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
            </button>
            <button
              onClick={addMockCopywriting}
              disabled={isAdding}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span>一键添加文案</span>
              {isAdding && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
            </button>
            <button
              onClick={toggleSkeleton}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors text-left",
                isGenerating
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold"
                  : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
              )}
            >
              <Layout
                className={cn(
                  "w-4 h-4",
                  isGenerating ? "text-amber-500" : "text-zinc-400"
                )}
              />
              <span>{isGenerating ? "关闭骨架屏预览" : "开启骨架屏预览"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Debug Mode"
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border",
          isOpen
            ? "bg-rose-50 border-rose-200 text-rose-600 rotate-90"
            : "bg-white border-gray-200 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
        )}
      >
        <Bug className="w-5 h-5" />
      </button>
    </div>
  );
};
