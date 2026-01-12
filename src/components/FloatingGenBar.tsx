import React, { useRef, useState, useEffect } from "react";
import { Zap, BoxSelect, ArrowUp, Sparkles, Focus, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthModal } from "@/components/AuthModal";
import { useUserStore } from "@/store/userStore";

interface FloatingGenBarProps {
  prompt: string;
  setPrompt: (val: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  progress: number;
  aspectRatio: string;
  setAspectRatio: (val: string) => void;
  resolution: string;
  setResolution: (val: string) => void;
  disabled?: boolean;
  pointsCost?: number;
}

export function FloatingGenBar({
  prompt,
  setPrompt,
  isGenerating,
  onGenerate,
  progress,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  disabled = false,
  pointsCost,
}: FloatingGenBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { openAuthModal } = useUserStore();
  const [isFocused, setIsFocused] = useState(false);
  const [isRatioOpen, setIsRatioOpen] = useState(false);
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [prompt]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-50">
      <div className="relative w-full flex flex-col">
        {/* Visual Background Layer - Handles decoration and clipping */}
        <div
          className={cn(
            "absolute inset-0 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-4xl shadow-2xl transition-all duration-300 overflow-hidden",
            isFocused
              ? "ring-1 ring-zinc-900/5 dark:ring-zinc-100/10 border-zinc-300 dark:border-zinc-700"
              : "hover:border-zinc-300 dark:hover:border-zinc-700"
          )}
        ></div>

        {/* Content Layer - Allows overflow for dropdowns */}
        <div className="relative z-10 flex flex-col">
          {/* Auth Guard Overlay */}
          {disabled && (
            <div className="absolute inset-x-0 -inset-y-px z-30 bg-white/5 dark:bg-zinc-950/50 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300 rounded-4xl">
              <div className="flex items-center gap-4 bg-white/95 dark:bg-zinc-900/95 px-6 py-3 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 scale-95 sm:scale-100">
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4.5 h-4.5 text-yellow-500" />
                </div>
                <div className="flex flex-col text-left">
                  <h3 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
                    开启创作之旅
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    登录解锁全功能，体验 AI 灵感瞬间
                  </p>
                </div>
                <Button
                  onClick={() => openAuthModal("login")}
                  className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-full px-5 h-8 text-[11px] font-bold shadow-md hover:shadow-lg transition-all ml-2"
                >
                  立即登录
                </Button>
              </div>
            </div>
          )}
          {/* Top Bar: Controls */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg gap-1.5 text-[11px] font-semibold tracking-wide transition-all"
              >
                <Sparkles className="w-3 h-3 text-yellow-500" />
                Nano Banana Pro
                {/* <ChevronUp className="w-3 h-3 opacity-50" /> */}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {/* Aspect Ratio Selector */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRatioOpen(!isRatioOpen)}
                  className="h-7 px-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg gap-1.5 text-[11px] font-semibold transition-all"
                >
                  <BoxSelect className="w-3.5 h-3.5" />
                  {aspectRatio}
                </Button>

                {isRatioOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsRatioOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 mb-3 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200 slide-in-from-bottom-2">
                      {["16:9", "9:16"].map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => {
                            setAspectRatio(ratio);
                            setIsRatioOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors flex items-center justify-between",
                            aspectRatio === ratio
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 dark:text-zinc-400 dark:hover:text-zinc-200"
                          )}
                        >
                          {ratio}
                          {aspectRatio === ratio && (
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Resolution Selector */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsResolutionOpen(!isResolutionOpen)}
                  className="h-7 px-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg gap-1.5 text-[11px] font-semibold transition-all"
                >
                  <Focus className="w-3 h-3" />
                  {resolution.toUpperCase()}
                </Button>

                {isResolutionOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsResolutionOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 mb-3 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200 slide-in-from-bottom-2">
                      {["1k", "4k"].map((res) => (
                        <button
                          key={res}
                          onClick={() => {
                            setResolution(res);
                            setIsResolutionOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors flex items-center justify-between",
                            resolution === res
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                              : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 dark:text-zinc-400 dark:hover:text-zinc-200"
                          )}
                        >
                          {res.toUpperCase()}
                          {resolution === res && (
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Middle: Input Area */}
          <div className="relative px-3 pb-3">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                disabled ? "请登录以描述您的创意..." : "请描述您的创意..."
              }
              disabled={disabled}
              className={cn(
                "w-full bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-[15px] leading-relaxed resize-none focus:ring-0 px-3 py-3 min-h-[56px] max-h-[240px] scrollbar-hide font-medium",
                disabled && "cursor-not-allowed opacity-50"
              )}
              maxLength={800}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !disabled) {
                  e.preventDefault();
                  onGenerate();
                }
              }}
            />

            {/* Bottom Right Action Button and Character Count */}
            <div className="absolute bottom-4 right-4 flex items-center gap-3">
              {!isGenerating && pointsCost !== undefined && pointsCost > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg shadow-xs animate-in fade-in slide-in-from-right-2 duration-500">
                  <Coins
                    size={10}
                    className="text-amber-500 fill-amber-500/10"
                  />
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 tracking-tight whitespace-nowrap">
                    {pointsCost} 积分
                  </span>
                </div>
              )}
              {!disabled && !isGenerating && prompt.length > 0 && (
                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">
                  {prompt.length}/800
                </span>
              )}
              <Button
                size="icon"
                onClick={onGenerate}
                disabled={disabled || isGenerating || !prompt.trim()}
                className={cn(
                  "w-9 h-9 rounded-xl transition-all duration-300 shadow-sm",
                  disabled
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 opacity-50 cursor-not-allowed"
                    : isGenerating
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-500 cursor-not-allowed"
                    : prompt.trim()
                    ? "bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 opacity-50"
                )}
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="flex items-center gap-1.5 px-0.5">
                    <ArrowUp className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Optional: Attachment Bar (Hidden for now to match minimal reference, can be added later) */}
          {/* <div className="px-3 pb-3 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-white/5">
                <ImageIcon className="w-5 h-5" />
            </Button>
        </div> */}
        </div>
      </div>
    </div>
  );
}
