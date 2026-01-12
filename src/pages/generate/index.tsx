import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import {
  generateImage,
  saveGeneratedImage,
  getGeneratedHistory,
  deleteGeneratedImage,
  toggleLikeGeneratedImage,
} from "@/servers/ai";
import { FloatingGenBar } from "@/components/FloatingGenBar";
import { GenerationImageCard } from "@/components/GenerationImageCard";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import {
  Sparkles,
  Loader2,
  Image as ImageIcon,
  LayoutGrid,
  Grid2X2,
  Heart,
} from "lucide-react";
import { useGenerateStore } from "@/store/generateStore";
import { useUserStore } from "@/store/userStore";
import { useMarketingStore } from "@/store/marketingStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function GeneratePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    resultImages,
    setResultImages,
    layout,
    setLayout,
    clearImages,
    isGenerating,
    setIsGenerating,
    progress,
    setProgress,
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
    model,
    setModel,
  } = useGenerateStore();
  const { user, profile } = useUserStore();
  const getCostByType = useMarketingStore((state) => state.getCostByType);

  // Check if user is logged in
  const isLoggedIn = !!user;

  // Stable date key (YYYY-MM-DD) for grouping and skeleton matching
  const todayKey = useMemo(() => {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    console.log("[DEBUG] todayKey initialized:", key);
    return key;
  }, []);

  const cost = getCostByType(
    "points_consumption",
    profile?.membership_code || "free"
  );

  // Sync initial prompt from location state if provided
  useEffect(() => {
    if (location.state?.prompt) {
      setPrompt(location.state.prompt);
    }
  }, [location.state?.prompt, setPrompt]);

  const [previewImage, setPreviewImage] = useState<{
    url: string;
    prompt: string;
  } | null>(null);

  const isRequesting = useRef(false);

  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageSize = 20;

  const fetchHistory = useCallback(
    async (pageNum: number, isInitial: boolean = false) => {
      if (!user || isLoadingHistory || (!hasMore && !isInitial)) return;

      setIsLoadingHistory(true);
      try {
        const history = await getGeneratedHistory(user.id, pageNum, pageSize);
        if (history && history.length > 0) {
          const newImages = history.map((item: any) => ({
            ...item,
            url: item.image_url,
            prompt: item.prompt || "",
          }));

          setResultImages((prev) => {
            if (isInitial) return newImages;
            // Avoid duplicates if any
            const existingIds = new Set(prev.map((img) => img.id));
            const filteredNew = newImages.filter(
              (img) => !existingIds.has(img.id)
            );
            return [...prev, ...filteredNew];
          });

          if (history.length < pageSize) {
            setHasMore(false);
          }
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
        toast.error("加载历史记录失败");
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [user, isLoadingHistory, hasMore]
  );

  // Initial load
  useEffect(() => {
    if (user) {
      setPage(0);
      setHasMore(true);
      fetchHistory(0, true);
    } else {
      setResultImages([]);
      setHasMore(false);
    }
  }, [user?.id]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingHistory || !user) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log("[DEBUG] Sentinel intersected, loading more...");
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchHistory(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingHistory, user, fetchHistory]);

  const handleGenerate = async () => {
    if (isGenerating || isRequesting.current) {
      console.log("Generate request ignored: already in progress");
      return;
    }

    // Check login
    if (!isLoggedIn) {
      toast.error("请先登录以使用生图功能");
      useUserStore.getState().openAuthModal("login");
      return;
    }

    if (!prompt.trim()) {
      toast.error("请输入提示词");
      return;
    }

    // Optional: Check login if required (commented out in original logic)
    // if (!user) { ... }

    console.log("Starting generation for prompt:", prompt);
    isRequesting.current = true;
    setIsGenerating(true);
    setProgress(0);
    setPrompt(""); // Clear input immediately after starting
    // setResultImages([]); // Keep previous images or clear? Reference image shows grid, usually accumulates or replaces. Let's replace for now as per prior logic.

    const INTERVAL_MS = 100; // 每 100ms 更新一次，更加平滑
    const TOTAL_DURATION_MS = 28000; // 目标 28 秒达到 98% (留一点余地)
    const MAX_FAKE_PROGRESS = 98;

    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= MAX_FAKE_PROGRESS) return prev;

        // 简单的线性增长带有一点随机波动
        // 每 100ms 增加约 (98/28000)*100 = 0.35%
        const increment =
          MAX_FAKE_PROGRESS / (TOTAL_DURATION_MS / INTERVAL_MS) +
          Math.random() * 0.1;
        const next = prev + increment;

        return next > MAX_FAKE_PROGRESS
          ? MAX_FAKE_PROGRESS
          : Number(next.toFixed(1));
      });
    }, INTERVAL_MS);

    try {
      const response = await generateImage({
        prompt,
        ratio: aspectRatio,
        resolution: resolution,
        model: "nanobananapro",
      });
      console.log("Received AI response:", response);

      let imageUrls: string[] = [];

      if (response?.data?.data && Array.isArray(response.data.data)) {
        imageUrls = response.data.data
          .map((item: any) => item.url)
          .filter((url: string) => url);
      } else if (response?.data && Array.isArray(response.data)) {
        imageUrls = response.data
          .map((item: any) =>
            item.url || item.b64Json
              ? item.url || `data:image/png;base64,${item.b64Json}`
              : null
          )
          .filter((url: string | null) => url) as string[];
      }

      if (imageUrls.length > 0) {
        // 将新生成的图片添加到现有图片数组的开头(替换骨架屏位置)
        // Store full object for new images
        const newImages = imageUrls.map((url) => ({
          url: url, // UI often uses 'url'
          image_url: url, // Store consistent with DB
          prompt: prompt,
          model: "nanobananapro",
          aspect_ratio: aspectRatio,
          created_at: new Date().toISOString(),
          user_id: user?.id,
        }));
        setResultImages((prev) => [...newImages, ...prev]);
        setProgress(100);
        toast.success(`成功生成 ${imageUrls.length} 张图片！`);

        // Save to database and get IDs
        if (user) {
          const imagesToSave = imageUrls.map((url) => ({
            user_id: user.id,
            prompt,
            model: "nanobananapro",
            aspect_ratio: aspectRatio,
            image_url: url,
            history_id: response.data?.historyId,
          }));

          try {
            // 等待保存完成，获取包含 ID 的完整记录
            const savedData = await saveGeneratedImage(imagesToSave);

            if (savedData && Array.isArray(savedData)) {
              // 用数据库返回的完整数据（包含 ID）更新前端状态
              setResultImages((prev) => {
                const savedMap = new Map(
                  savedData.map((img) => [img.image_url, img])
                );

                return prev.map((img) => {
                  const saved = savedMap.get(img.url || img.image_url);
                  if (saved) {
                    // 合并数据，确保包含数据库的 ID
                    return { ...img, ...saved, url: saved.image_url };
                  }
                  return img;
                });
              });

              // 刷新用户 profile 以更新余额
              useUserStore.getState().fetchProfile(user);
            }
          } catch (err) {
            console.error("Failed to save image history:", err);
          }
        }
      } else {
        console.error("Unknown response format:", response);
        throw new Error("接口返回数据格式无法解析");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(
        "生成失败: " + (error instanceof Error ? error.message : "未知错误")
      );
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
      isRequesting.current = false;
    }
  };

  const handleDownload = useCallback(
    async (url: string, index: number, resolution: "1k" | "4k" = "1k") => {
      if (resolution === "4k") {
        toast.info("4K 超清下载功能即将上线，正在为您下载标准版...");
      }

      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `generated-image-${index + 1}-${resolution}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Download failed:", error);
        toast.error("下载失败，请重试");
      }
    },
    []
  );

  const handleDelete = useCallback(async (id?: string) => {
    if (!id) return;
    const confirmDelete = window.confirm("确定要删除这张图片吗？");
    if (!confirmDelete) return;

    try {
      useGenerateStore.getState().removeImage(id);
      toast.success("图片已删除");
      await deleteGeneratedImage(id);
    } catch (error) {
      console.error("Failed to delete image:", error);
      toast.error("删除失败，请重试");
    }
  }, []);

  const handleLike = useCallback(
    async (id?: string, currentLikeStatus?: boolean) => {
      if (!id) return;
      const newStatus = !currentLikeStatus;

      useGenerateStore.getState().toggleLike(id);

      try {
        await toggleLikeGeneratedImage(id, newStatus);
        if (newStatus) {
          toast.success("已添加到喜欢");
        }
      } catch (error) {
        console.error("Failed to toggle like:", error);
        useGenerateStore.getState().toggleLike(id); // Revert
        toast.error("操作失败，请重试");
      }
    },
    []
  );

  const groupedImages = useMemo(() => {
    const filtered = resultImages.filter((img: any) =>
      layout === "liked" ? img.is_liked : true
    );

    const groups = filtered.reduce((acc: any, item: any) => {
      const dateKey = item.created_at ? item.created_at.split("T")[0] : "以前";
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    }, {});

    // If generating and no images for today yet, ensure today group exists for skeletons
    if (isGenerating && !groups[todayKey]) {
      console.log("[DEBUG] Injecting empty todayKey group for skeletons");
      groups[todayKey] = [];
    }

    return Object.entries(groups).sort((a, b) => {
      if (a[0] === "以前") return 1;
      if (b[0] === "以前") return -1;
      return b[0].localeCompare(a[0]);
    });
  }, [resultImages, layout, isGenerating, todayKey]);

  // Helper to format YYYY-MM-DD for display
  const formatDateForDisplay = useCallback((dateKey: string) => {
    if (dateKey === "以前") return "以前";
    try {
      return new Date(dateKey).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return dateKey;
    }
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Background Ambience (Optional) */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(0,0,0,0.03)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.03)_0%,transparent_50%)] pointer-events-none" />

      {/* Main Content Area - Grid */}
      <main className="w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-48">
          {/* Header Actions */}
          <div className="flex justify-end mb-8 animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
            <div className="flex items-center gap-0.5 p-0.5 bg-white/80 dark:bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl h-[36px]">
              {/* Layout Toggle Buttons */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-10 h-7 rounded-lg transition-all duration-300",
                  layout === "standard"
                    ? "bg-zinc-900 dark:bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                )}
                onClick={() => setLayout("standard")}
              >
                <Grid2X2 className="w-[18px] h-[18px]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-10 h-7 rounded-lg transition-all duration-300",
                  layout === "compact"
                    ? "bg-zinc-900 dark:bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                )}
                onClick={() => setLayout("compact")}
              >
                <LayoutGrid className="w-[18px] h-[18px]" />
              </Button>

              {/* Like Button - Joined and equal width */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-10 h-7 rounded-lg transition-all duration-300",
                  layout === "liked"
                    ? "bg-rose-50 dark:bg-zinc-800 text-rose-500 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-500/10"
                )}
                onClick={() => setLayout("liked")}
              >
                <Heart
                  className={cn(
                    "w-[18px] h-[18px] transition-all",
                    layout === "liked" ? "fill-rose-500" : ""
                  )}
                />
              </Button>
            </div>
          </div>

          {isGenerating || resultImages.length > 0 ? (
            <div className="flex flex-col gap-12">
              {groupedImages.map(([dateKey, images]: [string, any]) => (
                <div key={dateKey} className="flex flex-col gap-6">
                  {/* Date Header */}
                  <div className="flex items-center gap-4">
                    <h2 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                      {formatDateForDisplay(dateKey)}
                    </h2>
                    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {/* Loading Skeleton */}
                    {isGenerating && dateKey === todayKey && (
                      <>
                        {[0, 1, 2, 3].map((index) => (
                          <div
                            key={`skeleton-${index}`}
                            className={`relative ${
                              aspectRatio === "16:9"
                                ? "aspect-video"
                                : aspectRatio === "9:16"
                                ? "aspect-9/16"
                                : aspectRatio === "3:2"
                                ? "aspect-3/2"
                                : aspectRatio === "2:3"
                                ? "aspect-2/3"
                                : aspectRatio === "4:3"
                                ? "aspect-4/3"
                                : aspectRatio === "3:4"
                                ? "aspect-3/4"
                                : "aspect-square"
                            } rounded-2xl bg-linear-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 overflow-hidden`}
                          >
                            <div className="absolute inset-0 animate-pulse" />
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px] transition-all">
                              <div className="relative flex items-center justify-center">
                                <span className="text-6xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
                                  {Math.floor(progress)}%
                                </span>
                                <div className="absolute -inset-8 border-4 border-white/20 rounded-full animate-[spin_3s_linear_infinite]" />
                                <div className="absolute -inset-8 border-t-4 border-white rounded-full animate-[spin_1.5s_linear_infinite]" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Result Images */}
                    {images.map((item: any, index: number) => {
                      const image =
                        typeof item === "string"
                          ? { url: item, image_url: item, prompt: "" }
                          : { ...item, url: item.url || item.image_url };

                      return (
                        <GenerationImageCard
                          key={`${image.url}-${index}`}
                          id={image.id}
                          imageUrl={image.url}
                          prompt={image.prompt}
                          index={index}
                          total={images.length}
                          onDownload={(resolution) =>
                            handleDownload(image.url, index, resolution)
                          }
                          onDelete={() => handleDelete(image.id)}
                          onLike={() => handleLike(image.id, image.is_liked)}
                          isLiked={image.is_liked}
                          aspectRatio={image.aspect_ratio}
                          onPreview={() =>
                            setPreviewImage({
                              url: image.url,
                              prompt: image.prompt,
                            })
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Infinite Scroll Sentinel & Loader */}
              <div
                ref={sentinelRef}
                className="w-full py-8 flex flex-col items-center justify-center gap-4"
              >
                {isLoadingHistory ? (
                  <div className="flex items-center gap-2 text-zinc-500 animate-in fade-in duration-300">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">正在加载更多历史...</span>
                  </div>
                ) : !hasMore && resultImages.length > 0 ? (
                  <div className="flex flex-col items-center gap-2 text-zinc-400 dark:text-zinc-600 animate-in fade-in duration-500">
                    <div className="h-px w-12 bg-zinc-200 dark:bg-zinc-800" />
                    <span className="text-xs font-medium tracking-wider uppercase">
                      已加载全部历史记录
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            // Empty State
            <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-500 gap-6">
              <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-400 dark:text-zinc-600 animate-in fade-in duration-500">
                <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">开始创作</p>
                <p className="text-sm opacity-60">您生成的图片将出现在这里</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Interaction Bar */}
      <FloatingGenBar
        prompt={prompt}
        setPrompt={setPrompt}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
        progress={progress}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        resolution={resolution}
        setResolution={setResolution}
        disabled={!isLoggedIn}
        pointsCost={cost}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ""}
      />
    </div>
  );
}
