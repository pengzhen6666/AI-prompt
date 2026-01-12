import React from "react";
import { Copy, Download, Link2, Zap, FileArchive } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { useUserStore } from "@/store/userStore";

interface ImageActionMenuProps {
  imageUrl: string | null;
  children: React.ReactNode;
  allUrls?: string[];
  className?: string;
  downloadName?: string;
}

export const ImageActionMenu: React.FC<ImageActionMenuProps> = ({
  imageUrl,
  allUrls,
  children,
  className,
  downloadName = "image-download",
}) => {
  const { user, profile } = useUserStore();

  const handleCopyImageUrl = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!imageUrl) return;
    navigator.clipboard.writeText(imageUrl);
    toast.success("图片地址已复制");
  };

  const addWatermarkToBlob = (
    blob: Blob,
    skipWatermark = false,
    quality = 0.9,
    format = "image/png",
    maxWidth?: number // 新增：最大宽度限制
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = "anonymous"; // 确保跨域安全
      img.onload = () => {
        // 计算缩放比例
        let width = img.width;
        let height = img.height;

        if (maxWidth && width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("无法创建 Canvas 上下文"));
          return;
        }

        // 绘制缩放后的原图
        ctx.drawImage(img, 0, 0, width, height);

        if (!skipWatermark) {
          // 设置水印样式
          const fontSize = Math.max(16, Math.floor(width / 40));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          const text = "AI by lumina.cyou";
          const metrics = ctx.measureText(text);
          const x = width - metrics.width - 20;
          const y = height - 20;

          // 绘制水印
          ctx.fillText(text, x, y);
        }

        // 注意：canvas.toBlob 对于 image/png 不支持质量参数
        const finalQuality = format === "image/png" ? undefined : quality;

        canvas.toBlob(
          (resultBlob) => {
            URL.revokeObjectURL(url);
            if (resultBlob) {
              resolve(resultBlob);
            } else {
              reject(new Error("图片转换失败"));
            }
          },
          format,
          finalQuality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片加载失败"));
      };
      img.src = url;
    });
  };

  /**
   * 细化图片处理逻辑
   * skipWatermark: 是否跳过水印 (仅 Ultra)
   * skipCompression: 是否跳原图 (所有已登录用户)
   */
  const processImageEffect = async (
    blob: Blob,
    targetSizeKb: number,
    skipWatermark: boolean,
    skipCompression: boolean,
    format: "image/png" | "image/jpeg" = "image/jpeg"
  ): Promise<Blob> => {
    let currentQuality = skipCompression ? 1.0 : 0.8;
    // 仅针对非登录用户限制最大宽度为 1200px
    const maxWidth = skipCompression ? undefined : 1200;

    let resultBlob = await addWatermarkToBlob(
      blob,
      skipWatermark,
      currentQuality,
      format,
      maxWidth
    );

    // 如果未跳过压缩且超过目标大小，且格式支持压缩（非 png），则进行递归压缩
    if (
      !skipCompression &&
      resultBlob.size > targetSizeKb * 1024 &&
      format !== "image/png"
    ) {
      while (resultBlob.size > targetSizeKb * 1024 && currentQuality > 0.1) {
        currentQuality -= 0.1;
        resultBlob = await addWatermarkToBlob(
          blob,
          skipWatermark,
          currentQuality,
          format,
          maxWidth
        );
      }
    }
    return resultBlob;
  };

  const handleDownloadImage = async (
    urlToDownload?: string,
    index?: number,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    const targetUrl = urlToDownload || imageUrl;
    if (!targetUrl) return;

    // 逻辑判定
    const skipWatermark = profile?.membership_code === "ultra";
    const skipCompression = user !== null;

    try {
      const response = await fetch(targetUrl);
      let blob = await response.blob();

      try {
        // 只有在需要加水印或需要压缩时才进行处理
        // 如果是 Ultra 用户 (skipWatermark) 且已登录 (skipCompression)，则直接使用原图
        if (!(skipWatermark && skipCompression)) {
          blob = await processImageEffect(
            blob,
            200,
            skipWatermark,
            skipCompression,
            "image/jpeg"
          );
        }
      } catch (e) {
        console.warn("图片处理失败，将尝试下载初版", e);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = index !== undefined ? `-${index + 1}` : `-${Date.now()}`;
      a.download = `${downloadName}${suffix}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      if (index === undefined) toast.success("图片下载成功");
    } catch (error) {
      console.error("Download error:", error);
      const a = document.createElement("a");
      a.href = targetUrl;
      a.download = `${downloadName}.png`;
      a.target = "_blank";
      a.click();
      if (index === undefined) toast.success("开始下载图片");
    }
  };

  const handleDownloadAll = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!allUrls || allUrls.length === 0) return;

    toast.loading(`正在准备下载 ${allUrls.length} 张图片并处理...`, {
      id: "batch-download",
    });

    const skipWatermark = profile?.membership_code === "ultra";
    const skipCompression = user !== null;

    try {
      const zip = new JSZip();

      const downloadPromises = allUrls.map(async (url, index) => {
        try {
          const response = await fetch(url);
          let blob = await response.blob();

          try {
            // 如果是 Ultra 用户且已登录，跳过所有处理，直接打包原图
            if (!(skipWatermark && skipCompression)) {
              blob = await processImageEffect(
                blob,
                200,
                skipWatermark,
                skipCompression,
                "image/jpeg"
              );
            }
          } catch (e) {
            console.warn(`第 ${index + 1} 张图片处理失败`, e);
          }

          const filename = `${downloadName}-${index + 1}.png`;
          zip.file(filename, blob);
        } catch (err) {
          console.error(`Failed to fetch image ${index + 1}:`, err);
        }
      });

      await Promise.all(downloadPromises);

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${downloadName}-all.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("全部图片已处理并打包下载", { id: "batch-download" });
    } catch (error) {
      console.error("Batch download error:", error);
      toast.error("批量下载失败，请尝试逐个下载", { id: "batch-download" });
    }
  };

  const handleCopyImage = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!imageUrl) return;

    const toastId = "copy-image-loading";
    toast.loading("正在复制图片，请稍候...", {
      id: toastId,
    });

    const skipWatermark = profile?.membership_code === "ultra";
    const skipCompression = user !== null;

    try {
      const response = await fetch(imageUrl);
      let blob = await response.blob();

      // 注意：Clipboard 只支持 PNG。即使是 Ultra 用户，也必须转换格式。
      // 但对于 Ultra 用户，我们跳过压缩和水印，只做格式转换（quality: 1.0）
      blob = await processImageEffect(
        blob,
        200,
        skipWatermark,
        skipCompression,
        "image/png"
      );

      try {
        // 尝试恢复焦点，防止异步处理后文档丢失焦点导致 NotAllowedError
        window.focus();
        const data = [new ClipboardItem({ [blob.type]: blob })];
        await navigator.clipboard.write(data);
        toast.success("图片已复制到剪贴板", { id: toastId });
      } catch (err) {
        console.error("Clipboard write error:", err);
        if (err instanceof Error && err.name === "NotAllowedError") {
          toast.error("复制失败：请确保页面处于激活状态", { id: toastId });
        } else {
          toast.error("剪贴板写入失败", { id: toastId });
        }
      }
    } catch (error) {
      console.error("Copy image error:", error);
      toast.error("图片复制失败: 请确保浏览器支持且未禁用此功能", {
        id: toastId,
      });
    }
  };

  if (!imageUrl) return <>{children}</>;

  const isUltra = profile?.membership_code === "ultra";

  return (
    <ContextMenu>
      <ContextMenuTrigger className={className}>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={handleCopyImage} className="gap-2">
          <Copy className="w-4 h-4" />
          <span>复制图片</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyImageUrl} className="gap-2">
          <Link2 className="w-4 h-4" />
          <span>复制图片链接</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => handleDownloadImage(undefined, undefined, e)}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          <span>下载此图片</span>
        </ContextMenuItem>
        {allUrls && allUrls.length > 1 && (
          <ContextMenuItem
            onClick={handleDownloadAll}
            className="gap-2 text-blue-600 dark:text-blue-400 font-bold"
          >
            <FileArchive className="w-4 h-4" />
            <span>打包下载全部 ({allUrls.length})</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {!user ? (
          <ContextMenuLabel className="text-[11px] text-gray-400 font-medium px-2 py-2">
            ✨ 登录解锁超清原图
          </ContextMenuLabel>
        ) : !isUltra ? (
          <ContextMenuLabel className="text-[11px] text-indigo-500 font-bold px-2 py-2 flex items-center gap-1">
            <Zap className="w-3 h-3 fill-indigo-500 rotate-12" />
            升级 Ultra 移除水印
          </ContextMenuLabel>
        ) : (
          <ContextMenuLabel className="text-[11px] text-yellow-600 font-bold px-2 py-2 flex items-center gap-1">
            <Zap className="w-3 h-3 fill-yellow-500" />
            已解锁 Ultra 无水印权益
          </ContextMenuLabel>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
