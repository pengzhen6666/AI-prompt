import { useState, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  User,
  AtSign,
  Loader2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/supabase";
import { getDeviceId } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const HAS_SUBMITTED_KEY = "feedback_submitted_anonymous";

export const Feedback = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    // 检查本地存储
    const submitted = localStorage.getItem(HAS_SUBMITTED_KEY);
    if (submitted) {
      setHasSubmitted(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("请输入您的建议内容");
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      const deviceId = getDeviceId();

      const { error } = await supabase.from("feedbacks").insert({
        user_id: user?.id || null,
        device_id: deviceId,
        content: content.trim(),
        contact: contact.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("您已提交过一次建议，感谢您的支持！");
          setHasSubmitted(true);
          localStorage.setItem(HAS_SUBMITTED_KEY, "true");
        } else {
          throw error;
        }
      } else {
        toast.success("感谢您的建议，我们会努力改进！");
        setContent("");
        setContact("");
        setIsOpen(false);
        if (!user) {
          setHasSubmitted(true);
          localStorage.setItem(HAS_SUBMITTED_KEY, "true");
        }
      }
    } catch (err: any) {
      console.error("Feedback submission error:", err);
      toast.error("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 hover:scale-110 active:scale-95 bg-white border border-gray-200 text-gray-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white",
          isOpen && "rotate-90 bg-gray-100"
        )}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageSquare className="w-5 h-5" />
        )}
      </button>

      {/* Modal / Popover */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-black dark:bg-zinc-800 flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-zinc-100">
                  建议与反馈
                </h3>
                <p className="text-xs text-gray-500">
                  您的每一个反馈都非常重要
                </p>
              </div>
            </div>

            {hasSubmitted ? (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 dark:bg-green-500/10 text-green-500 mb-4">
                  <User className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  感谢您的关注！
                </p>
                <p className="text-xs text-gray-500 mt-1 px-4">
                  您当前为匿名状态，已提交过建议。登录后可提交更多反馈。
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    反馈内容
                  </label>
                  <textarea
                    autoFocus
                    placeholder="请描述您的问题或建议..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-32 p-4 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-black outline-none resize-none transition-all placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    联系方式 (可选)
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Email / 微信号"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-black outline-none transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-black dark:bg-zinc-800 text-white rounded-2xl font-bold text-sm shadow-lg shadow-black/10 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>立即提交反馈</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-center">
            <p className="text-[10px] text-gray-400 font-medium">
              Lumina AI Team © 2025
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
