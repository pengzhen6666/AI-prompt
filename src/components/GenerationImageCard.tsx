import React, { useState, memo } from "react";
import {
  Download,
  MoreHorizontal,
  Zap,
  Copy,
  Check,
  Heart,
  Trash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useGenerateStore } from "@/store/generateStore";

interface GenerationImageCardProps {
  id?: string;
  imageUrl: string;
  prompt: string;
  index: number;
  total: number;
  onDownload?: (resolution: "1k" | "4k") => void;
  onDelete?: () => void;
  aspectRatio?: string;
  onLike?: () => void;
  isLiked?: boolean;
  onPreview?: () => void;
}

export const GenerationImageCard = memo(function GenerationImageCard({
  imageUrl,
  prompt,
  index,
  total,
  onDownload,
  aspectRatio = "3:4", // Default fallback if undefined
  onLike,
  isLiked,
  onDelete,
  onPreview,
}: GenerationImageCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { layout } = useGenerateStore();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const aspectRatioClass =
    aspectRatio === "16:9"
      ? "aspect-video"
      : aspectRatio === "9:16"
      ? "aspect-[9/16]"
      : aspectRatio === "3:2"
      ? "aspect-[3/2]"
      : aspectRatio === "2:3"
      ? "aspect-[2/3]"
      : aspectRatio === "4:3"
      ? "aspect-[4/3]"
      : aspectRatio === "3:4"
      ? "aspect-[3/4]"
      : "aspect-square";

  // 横图（16:9, 3:2, 4:3）占 2 列，竖图占 1 列
  // 只有标准布局下宽图才占 2 列，紧凑和喜欢模式下都占 1 列
  const isWideImage =
    ["16:9", "3:2", "4:3"].includes(aspectRatio) && layout === "standard";
  const gridColumnClass = isWideImage ? "col-span-2" : "col-span-1";

  return (
    <div
      className={cn(
        "group relative w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all hover:border-zinc-300 dark:hover:border-zinc-700",
        aspectRatioClass,
        gridColumnClass
      )}
    >
      {/* Image */}
      <img
        src={imageUrl}
        alt={`生成图片 ${index + 1}`}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-zoom-in"
        onClick={onPreview}
      />

      {/* Liked Heart - Only visible when liked AND not hovering */}
      {isLiked && (
        <div className="absolute top-3 right-3 z-10 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
          <Heart className="w-5 h-5 fill-rose-500 text-rose-500 drop-shadow-lg" />
        </div>
      )}

      {/* Top Actions Overlay - visible on hover OR when liked */}
      <div
        className={cn(
          "absolute top-3 right-3 flex items-center gap-2 z-10",
          "opacity-0 group-hover:opacity-100"
        )}
      >
        <Button
          size="icon"
          className="w-8 h-8 rounded-full bg-transparent hover:bg-black/40 backdrop-blur-md text-white border border-transparent hover:border-white/10 shadow-none p-0 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onLike?.();
          }}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isLiked ? "fill-rose-500 text-rose-500" : "text-white"
            )}
          />
        </Button>
        <Button
          size="icon"
          className="w-8 h-8 rounded-full bg-transparent hover:bg-black/40 backdrop-blur-md text-white border border-transparent hover:border-white/10 shadow-none p-0 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onDownload?.("1k");
          }}
        >
          <Download className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="w-8 h-8 rounded-full bg-transparent hover:bg-black/40 backdrop-blur-md text-white border border-transparent hover:border-white/10 shadow-none p-0 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-32 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          >
            <DropdownMenuItem
              className="text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
            >
              <Trash className="w-4 h-4" />
              <span>删除</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-3 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        {/* JSON-like Prompt Snippet */}
        <div className="relative">
          <div className="font-mono text-[10px] text-zinc-400 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity delay-100 line-clamp-3 pr-6">
            {(prompt || "").slice(0, 100)}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="absolute -top-1 right-0 w-6 h-6 hover:bg-white/10 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity delay-100"
            onClick={handleCopy}
          >
            {isCopied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>

        {/* Footer Info - Empty for now */}
        <div className="flex items-center justify-between">
          {/* Removed Nano Banana Pro tag */}
        </div>
      </div>

      {/* Index Badge */}
      {/* <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-white/90 text-[10px] font-medium">
        {index + 1} / {total}
      </div> */}
    </div>
  );
});
