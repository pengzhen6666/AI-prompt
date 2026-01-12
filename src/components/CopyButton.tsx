import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
  onCopy?: () => void;
  label?: string;
  successLabel?: string;
  iconSize?: number;
  theme?: "yellow" | "blue" | "purple" | "indigo";
}

export const CopyButton = ({
  text,
  className,
  onCopy,
  label = "复制",
  successLabel = "已复制",
  iconSize = 12,
  theme = "yellow",
}: CopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const themeClasses = {
    yellow:
      "text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10",
    blue: "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10",
    purple:
      "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10",
    indigo:
      "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10",
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      if (onCopy) {
        onCopy();
      }
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "text-xs font-bold transition-all duration-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:scale-105 active:scale-95",
        themeClasses[theme],
        className
      )}
    >
      {isCopied ? (
        <Check style={{ width: iconSize, height: iconSize }} />
      ) : (
        <Copy style={{ width: iconSize, height: iconSize }} />
      )}
      {isCopied ? successLabel : label}
    </button>
  );
};
