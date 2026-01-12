import React, { useState, useRef } from "react";
import {
  Plus,
  X,
  Image as ImageIcon,
  Send,
  Sparkles,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";

interface ImageInputProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
  generating: boolean;
  onGenerate: () => void;
  user: User | null;
  onAuthOpen: () => void;
  maxImages?: number;
  placeholder?: string;
  className?: string;
  onNavigateToNano?: () => void;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  canGuestUse?: boolean;
  pointsCost?: number;
}

export const ImageInput: React.FC<ImageInputProps> = ({
  images,
  onImagesChange,
  generating,
  onGenerate,
  user,
  onAuthOpen,
  maxImages = 4,
  placeholder = "粘贴图片地址、上传图片或直接拖拽到这里...",
  className,
  onNavigateToNano,
  headerLeft,
  headerRight,
  canGuestUse = false,
  pointsCost,
}) => {
  const [inputPreviewUrls, setInputPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync internal previews with external images prop
  React.useEffect(() => {
    if (images.length === 0) {
      inputPreviewUrls.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      setInputPreviewUrls([]);
      if (textareaRef.current) textareaRef.current.value = "";
    } else if (images.length < inputPreviewUrls.length) {
      // Handle individual removal synchronization if needed
      // For simplicity, if they don't match, we might need a more complex diff,
      // but the main issue is clearing after generation.
    }
  }, [images.length]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  };

  const processFiles = async (newFiles: File[]) => {
    const totalPossible = maxImages - images.length;
    const filesToAdd = newFiles.slice(0, totalPossible);

    if (filesToAdd.length === 0) return;

    const validFiles: File[] = [];
    const newUrls: string[] = [];

    filesToAdd.forEach((file) => {
      const isDuplicate = images.some(
        (img) =>
          img.name === file.name &&
          img.size === file.size &&
          img.lastModified === file.lastModified
      );
      if (!isDuplicate) {
        validFiles.push(file);
        newUrls.push(URL.createObjectURL(file));
      }
    });

    if (validFiles.length > 0) {
      setInputPreviewUrls((prev) => [...prev, ...newUrls]);
      onImagesChange([...images, ...validFiles]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let fileFound = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFiles([file]);
          e.preventDefault();
          fileFound = true;
          return;
        }
      }
    }

    if (fileFound) return;

    const pastedText = e.clipboardData.getData("text");
    if (
      pastedText &&
      (pastedText.startsWith("http://") || pastedText.startsWith("https://"))
    ) {
      e.preventDefault();
      try {
        const res = await fetch(pastedText);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.startsWith("image/")) {
          const blob = await res.blob();
          const ext = contentType.split("/")[1] || "jpg";
          const filename = `pasted-image.${ext}`;
          const file = new File([blob], filename, { type: contentType });
          processFiles([file]);
        }
      } catch (err) {
        console.error("Paste image url error:", err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const urlToRevoke = inputPreviewUrls[index];
    if (urlToRevoke && urlToRevoke.startsWith("blob:")) {
      URL.revokeObjectURL(urlToRevoke);
    }
    setInputPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    onImagesChange(newImages);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl p-0 shadow-xl border mt-auto transition-all relative",
        isDragging
          ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30"
          : "border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-blue-100",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-2xl p-3">
        {/* Auth Guard Overlay */}
        {!user && !canGuestUse && (
          <div className="absolute inset-0 z-30 bg-white/5 dark:bg-zinc-950/50 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-2 bg-white/95 dark:bg-zinc-900/95 p-5 rounded-2xl shadow-2xl border border-blue-100 dark:border-blue-900/50 scale-95 sm:scale-100">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                <ImageIcon className="w-4.5 h-4.5 text-blue-500" />
              </div>
              <div className="text-center">
                <h3 className="text-[15px] font-bold text-gray-900">
                  开启创作之旅
                </h3>
                <p className="text-[11px] text-gray-500">
                  登录解锁全功能，体验 AI 灵感瞬间
                </p>
              </div>
              <Button
                onClick={onAuthOpen}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 h-8 text-[12px] font-bold shadow-md hover:shadow-lg transition-all"
              >
                立即登录
              </Button>
            </div>
          </div>
        )}

        {/* Top Controls */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 text-gray-400">
            {headerLeft || (
              <div className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors px-2.5 py-1 rounded-full flex items-center gap-2 cursor-pointer text-[10px] font-medium text-gray-600 dark:text-zinc-400">
                <span>图生文案</span>
              </div>
            )}
            {onNavigateToNano && (
              <div
                onClick={onNavigateToNano}
                className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors px-2.5 py-1 rounded-full flex items-center gap-2 cursor-pointer text-[10px] font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-200"
              >
                <Sparkles className="w-3 h-3 text-yellow-500" />
                <span>Nano Banana</span>
              </div>
            )}
          </div>
          {headerRight && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide max-w-[60%] sm:max-w-[70%]">
              {headerRight}
            </div>
          )}
        </div>

        {/* Middle: Textarea & Preview */}
        <div className="relative min-h-[40px] flex flex-col justify-center">
          {inputPreviewUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {inputPreviewUrls.map((url, index) => (
                <div key={url} className="relative group">
                  <img
                    src={url}
                    alt={`Upload preview ${index + 1}`}
                    className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-zinc-700"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-white dark:border-zinc-800"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none resize-none py-1 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 text-sm font-medium"
            rows={1}
            onInput={adjustHeight}
            onPaste={(e) => {
              handlePaste(e);
              setTimeout(adjustHeight, 0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (images.length > 0 && !generating) {
                  onGenerate();
                }
              }
            }}
          />
        </div>

        {/* Bottom Controls */}
        <div className="flex items-end justify-between mt-2">
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center justify-center transition-colors"
            >
              <Plus
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isMenuOpen ? "rotate-45" : ""
                )}
              />
            </button>

            {isMenuOpen && (
              <div className="absolute bottom-10 left-0 w-40 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-800 py-1 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                <button
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-300 transition-colors"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsMenuOpen(false);
                  }}
                >
                  <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <ImageIcon className="w-3 h-3" />
                  </div>
                  <span className="font-medium">上传图片</span>
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {isMenuOpen && (
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {!generating && pointsCost !== undefined && pointsCost > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-full shadow-xs animate-in fade-in slide-in-from-right-1 duration-300">
                <Coins size={10} className="text-amber-500 fill-amber-500/10" />
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 tracking-tight whitespace-nowrap">
                  {pointsCost} 积分
                </span>
              </div>
            )}

            <Button
              onClick={onGenerate}
              disabled={images.length === 0 || generating}
              className={cn(
                "rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all shrink-0",
                images.length > 0
                  ? "bg-black dark:bg-zinc-100 hover:bg-gray-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
              )}
            >
              {generating ? (
                <div className="w-3 h-3 border-2 border-gray-500 dark:border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
