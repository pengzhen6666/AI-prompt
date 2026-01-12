import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Autoplay from "embla-carousel-autoplay";
import { User } from "@supabase/supabase-js";
import { AuthModal } from "@/components/AuthModal";
import {
  Plus,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  Heart,
  Copy as CopyIcon,
  Check,
  Trash2,
  Sparkles,
  History,
  Loader2,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateXHSCopywriting, XHSResult } from "@/servers/ai";
import { compressImage } from "@/lib/imageCompression";
import { defaultBucket, uploadFileServerAPI } from "@/servers/upload";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { analytics } from "@/lib/analytics";
import { CopyButton } from "@/components/CopyButton";
import { ImageInput } from "@/components/ImageInput";
import { ImageActionMenu } from "@/components/ImageActionMenu";
import {
  canGuestUseAI,
  incrementGuestUsage,
  getRemainingGuestUsage,
} from "@/lib/guestLimit";
import { useXHSStore } from "@/store/xhsStore";
import { useMarketingStore } from "@/store/marketingStore";
import { useUserStore } from "@/store/userStore";

const STYLE_LABELS: Record<string, string> = {
  sporty: "运动少女",
  campus: "清纯校园",
  sunny: "元气阳光",
  daily: "生活碎片",
  healing: "治愈邻家",
  street: "个性街头",
  // 以前的标签（兼容历史记录）
  nature: "森系自然",
  charm: "魅惑",
  pure: "纯欲",
  innocent: "清纯",
  education: "教学",
};

export default function ImageToTextPage({
  userFromApp,
}: {
  userFromApp: User | null;
}) {
  const navigate = useNavigate();
  const {
    result,
    setResult,
    uploadedPaths,
    setUploadedPaths,
    history,
    setHistory,
    clearAll: clearStore,
    generating,
    setGenerating,
    progress,
    setProgress,
  } = useXHSStore();

  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState<number>(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const { user, profile, openAuthModal } = useUserStore();
  const getCostByType = useMarketingStore((state) => state.getCostByType);
  const cost = getCostByType(
    "points_consumption",
    profile?.membership_code || "free"
  );

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [searchParams] = useSearchParams();

  // Handle direct navigation from history
  useEffect(() => {
    const id = searchParams.get("id");
    if (id && user) {
      const fetchAndLoadItem = async () => {
        const { data, error } = await supabase
          .from("generated_copywriting")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching record by id:", error);
          return;
        }

        if (data) {
          loadHistoryItem(data);
          setIsHistoryOpen(true);
        }
      };
      fetchAndLoadItem();
    }
  }, [searchParams, user?.id]);

  // Sync previewUrls if uploadedPaths exists (on refresh)
  useEffect(() => {
    if (uploadedPaths.length > 0 && previewUrls.length === 0) {
      setPreviewUrls(uploadedPaths);
    }
  }, [uploadedPaths]);

  // Copy helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    } catch (err) {
      toast.error("复制失败");
    }
  };

  const clearFiles = () => {
    setImages([]);
    setUploadedPaths([]);
  };

  // Calculate SHA-256 hash of file
  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleGenerate = async () => {
    if (!user) {
      if (!canGuestUseAI()) {
        openAuthModal("login");
        toast.error("今日游客试用次数已达上限，请登录后继续使用");
        return;
      }
    }

    // Capture current images reference
    const currentImages = [...images];
    if (currentImages.length === 0) return;

    // Clear input UI immediately
    setGenerating(true);
    analytics.trackClick("copywriting_generate_btn", {
      image_count: images.length,
    });
    setResult(null);
    setSelectedStyleIndex(0);
    setProgress(0);
    // Move the input previews to the result area preview before clearing them
    const localUrls = currentImages.map((img) => URL.createObjectURL(img));
    const optimisticId = `optimistic-${Date.now()}`;
    setPreviewUrls(localUrls);
    setImages([]);

    // Add optimistic entry to history for logged in users
    if (user) {
      const optimisticItem = {
        id: optimisticId,
        user_id: user.id,
        image_url: localUrls[0],
        image_urls: localUrls,
        title: "生成中...",
        description: "正在努力创作中...",
        tags: [],
        results: [],
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };
      setHistory([optimisticItem, ...(history || [])]);
    }

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 90) return prev;
        const increment = prev < 50 ? 5 : prev < 80 ? 2 : 1;
        return prev + increment;
      });
    }, 200);

    try {
      const allUploadedPaths: string[] = [];

      // Process each image
      for (const imgFile of currentImages) {
        // 1. Compress Image
        const compressedFile = await compressImage(imgFile);

        // 2. Check deduplication
        const fileHash = await calculateFileHash(compressedFile);
        const fileExt = compressedFile.name.split(".").pop() || "jpg";
        const fileName = `${fileHash}.${fileExt}`;
        const filePath = `public/${fileName}`;

        let currentUploadedPath = null;

        // Check if file exists in 'public' folder
        const { data: existingFiles } = await supabase.storage
          .from(defaultBucket)
          .list("public", {
            search: fileName,
          });

        if (existingFiles && existingFiles.length > 0) {
          console.log("Image already exists, skipping upload.");
          const { data: publicUrlData } = supabase.storage
            .from(defaultBucket)
            .getPublicUrl(filePath);
          currentUploadedPath = publicUrlData.publicUrl;
        } else {
          // Upload unique file
          const { data: uploadData, error: uploadError } =
            await uploadFileServerAPI({
              file: compressedFile,
              name: filePath,
            });

          if (uploadError) {
            throw new Error("图片上传失败: " + uploadError.message);
          }

          if (uploadData?.path) {
            const { data: publicUrlData } = supabase.storage
              .from(defaultBucket)
              .getPublicUrl(uploadData.path);
            currentUploadedPath = publicUrlData.publicUrl;
          }
        }

        if (currentUploadedPath) {
          allUploadedPaths.push(currentUploadedPath);
        }
      }

      setUploadedPaths(allUploadedPaths);

      // 4. Generate text
      const data = await generateXHSCopywriting(currentImages);

      // Complete progress
      clearInterval(interval);
      setProgress(100);

      // Small delay to show 100%
      await new Promise((resolve) => setTimeout(resolve, 300));

      setGenerating(false);
      setResult(data);
      setCurrentSlide(0);
      setPreviewUrls(allUploadedPaths);

      if (!user) {
        incrementGuestUsage();
        toast.info(`今日剩余试用次数: ${getRemainingGuestUsage()}`);
        // Save for persistence on refresh
        localStorage.setItem(
          "last_guest_xhs_result",
          JSON.stringify({
            results: data,
            paths: allUploadedPaths,
          })
        );
      }

      // 3. Save to Database
      const currentUser = user;

      const insertData = {
        user_id: currentUser?.id || null,
        title: data[0]?.title || "未命名文案",
        description: data[0]?.description || "",
        tags: data[0]?.tags || [],
        results: data,
        image_url: allUploadedPaths[0] || null,
        image_urls: allUploadedPaths, // Extra field for multi-image support
      };

      const { error } = await supabase
        .from("generated_copywriting")
        .insert(insertData);

      if (error) {
        console.error("DB Insert Error:", error);
        if (user) {
          setHistory((prev) =>
            (prev || []).filter(
              (h) => !h.is_optimistic || h.id !== optimisticId
            )
          );
        }
        toast.warning("生成成功，但保存历史记录失败");
      } else {
        analytics.trackClick("copywriting_generate_success");
        if (user) {
          // Replace optimistic item with actual data
          setHistory((prev) =>
            (prev || []).map((h) =>
              h.id === optimisticId ||
              (h.is_optimistic && h.image_url === allUploadedPaths[0])
                ? { ...insertData, id: `real-${Date.now()}` }
                : h
            )
          );
          fetchInitialHistory(); // Still fetch for absolute correctness

          // 刷新用户 profile 以更新余额
          useUserStore.getState().fetchProfile(user);
        }
      }
    } catch (error) {
      clearInterval(interval);
      setProgress(0);
      console.error("Operation failed:", error);
      if (user) {
        setHistory((prev) =>
          (prev || []).filter((h) => !h.is_optimistic || h.id !== optimisticId)
        );
      }
      toast.error(error instanceof Error ? error.message : "操作失败，请重试");
    } finally {
      clearInterval(interval);
      setGenerating(false);
      localUrls.forEach(
        (url) => url.startsWith("blob:") && URL.revokeObjectURL(url)
      );
    }
  };

  // Sync Carousel API
  useEffect(() => {
    if (!api) return;

    setCurrentSlide(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  // History State
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 15;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Fetch History when user changes
  useEffect(() => {
    if (user?.id) {
      if (history === null && !isFetchingRef.current) {
        setResult(null); // Reset current result to allow history fetcher to load latest
        fetchInitialHistory();
      }
    } else if (!user) {
      // If not logged in, try to load from localStorage for guest persistence
      const saved = localStorage.getItem("last_guest_xhs_result");
      if (saved) {
        try {
          const { results, paths } = JSON.parse(saved);
          setResult(results);
          setUploadedPaths(paths);
          setPreviewUrls(paths);
          setSelectedStyleIndex(0);
          setCurrentSlide(0);
        } catch (e) {
          console.error("Failed to load guest result", e);
        }
      }
      clearStore();
    }
  }, [user?.id]);

  const fetchHistory = async (pageToFetch: number) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (pageToFetch > 0) {
      setLoadingMore(true);
    } else {
      setLoadingHistory(true);
    }

    try {
      if (!user?.id) {
        setHasMore(false);
        return;
      }

      const from = pageToFetch * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("generated_copywriting")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        if (pageToFetch === 0) {
          setHistory(data);
          // 默认展示第一条数据
          if (data.length > 0 && !result) {
            loadHistoryItem(data[0]);
          }
        } else {
          setHistory((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === pageSize);
        setPage(pageToFetch);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      setHasMore(false);
    } finally {
      setLoadingHistory(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  const fetchInitialHistory = () => {
    setPage(0);
    setHasMore(true);
    fetchHistory(0);
  };

  const loadHistoryItem = (item: any) => {
    if (
      item.results &&
      Array.isArray(item.results) &&
      item.results.length > 0
    ) {
      setResult(item.results);
    } else {
      // 兼容旧数据
      setResult([
        {
          type: item.type || "pure",
          title: item.title,
          description: item.description,
          tags: item.tags || [],
        },
      ]);
    }
    setSelectedStyleIndex(0);

    // Handle multiple images if available, otherwise fallback to single image_url
    const urls =
      item.image_urls && Array.isArray(item.image_urls)
        ? item.image_urls
        : item.image_url
        ? [item.image_url]
        : [];

    setUploadedPaths(urls);
    setPreviewUrls(urls);
    setCurrentSlide(0);
    // Note: We can't easily reconstruct the File object, but we have the URL and result.
    setImages([]);
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // 防止触发加载历史记录
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    const idToDelete = deleteId;
    if (!idToDelete) return;

    try {
      // Use existing user from store

      const { data, error } = await supabase
        .from("generated_copywriting")
        .delete()
        .eq("id", idToDelete)
        .eq("user_id", user?.id) // Add user_id filter for explicit RLS check
        .select();

      if (error) {
        console.error("Supabase Delete Error:", error);
        throw error;
      }

      if (data && data.length > 0) {
        toast.success("删除成功");
        setHistory((prev) =>
          (prev || []).filter((item) => item.id !== idToDelete)
        );
      } else {
        toast.error("删除失败：权限不足或记录已不存在");
      }
    } catch (error) {
      console.error("Error deleting history item:", error);
      toast.error("删除失败，请重试");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-transparent flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 pt-20">
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-8 flex flex-col md:flex-row gap-8 overflow-hidden">
        {/* Left Sidebar: History (Hidden on mobile) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 gap-4 h-full overflow-y-auto pr-2 scrollbar-hide">
          {(loadingHistory || (history || []).length > 0) && (
            <>
              <div className="flex flex-col gap-3">
                {(history || []).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => !item.is_optimistic && loadHistoryItem(item)}
                    className={cn(
                      "bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all group flex gap-3 items-start relative overflow-hidden",
                      !item.is_optimistic &&
                        "cursor-pointer hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-md",
                      item.is_optimistic &&
                        "animate-pulse cursor-wait opacity-70"
                    )}
                  >
                    <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-zinc-100 leading-tight transition-colors">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-400">
                        {item.is_optimistic ? (
                          <span className="text-blue-500 font-bold">
                            生成中...
                          </span>
                        ) : (
                          new Date(item.created_at).toLocaleString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        )}
                      </p>
                    </div>
                    {!item.is_optimistic && (
                      <button
                        onClick={(e) => deleteHistoryItem(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="删除记录"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <div
                  ref={(el) => {
                    if (el) {
                      const observer = new IntersectionObserver(
                        (entries) => {
                          if (
                            entries[0].isIntersecting &&
                            hasMore &&
                            !isFetchingRef.current &&
                            !loadingHistory &&
                            (history || []).length > 0
                          ) {
                            fetchHistory(page + 1);
                          }
                        },
                        { threshold: 0.1, rootMargin: "200px" }
                      );
                      observer.observe(el);
                    }
                  }}
                  className="h-10 flex items-center justify-center py-4"
                >
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      <span>正在加载更多...</span>
                    </div>
                  )}
                  {!hasMore && (history || []).length > 0 && (
                    <span className="text-[10px] text-gray-300">
                      已经到底部了
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto w-full relative">
          {/* Header Section - Fixed on PC */}
          <div className="hidden md:block text-center shrink-0 mb-8 space-y-3 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wider uppercase">
              <FileText className="w-3 h-3" />
              Copywriting Lab
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
              灵感创作文案
            </h1>
            {!user && (
              <div className="flex justify-center mt-2">
                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  今日游客试用剩余: {getRemainingGuestUsage()} 次
                </span>
              </div>
            )}
            <p className="text-gray-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed text-sm">
              AI 深度洞察视觉意境，为你定制适配{" "}
              <span className="text-gray-900 dark:text-zinc-100 font-semibold border-b-2 border-blue-500/30">
                小红书
              </span>{" "}
              与{" "}
              <span className="text-gray-900 dark:text-zinc-100 font-semibold border-b-2 border-zinc-500/30">
                抖音
              </span>{" "}
              等全平台的爆款社交文案
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-6 md:gap-8 scrollbar-hide">
            {/* Header Section for H5 - Scrolling */}
            <div className="md:hidden text-center shrink-0 mb-4 space-y-2 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wider uppercase">
                <FileText className="w-3 h-3" />
                Copywriting Lab
              </div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                灵感创作文案
              </h1>
              {!user && (
                <div className="flex justify-center mt-1">
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    今日游客试用剩余: {getRemainingGuestUsage()} 次
                  </span>
                </div>
              )}
              <p className="text-gray-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed text-xs">
                AI 深度洞察视觉意境，为你定制适配{" "}
                <span className="text-gray-900 dark:text-zinc-100 font-semibold border-b-2 border-blue-500/30">
                  小红书
                </span>{" "}
                与{" "}
                <span className="text-gray-900 dark:text-zinc-100 font-semibold border-b-2 border-zinc-500/30">
                  抖音
                </span>{" "}
                文案
              </p>
            </div>
            {generating || (result && result.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-500">
                {/* Left: Image Feed Card Preview */}
                <div className="md:col-span-4 flex justify-center md:justify-start">
                  <div className="w-full max-w-[280px] mx-auto md:mx-0 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-gray-100 dark:border-zinc-800 flex flex-col transition-transform hover:-translate-y-1 duration-300 h-full min-h-[350px] cursor-context-menu">
                    <div className="relative flex-1 bg-gray-100 overflow-hidden group">
                      {previewUrls.length > 0 ? (
                        <div className="relative w-full h-full">
                          <Carousel
                            setApi={setApi}
                            plugins={[Autoplay({ delay: 4000 })]}
                            className="w-full h-full"
                            opts={{ loop: true }}
                          >
                            <CarouselContent className="h-full">
                              {previewUrls.map((url, i) => (
                                <CarouselItem key={url} className="h-full">
                                  <ImageActionMenu
                                    imageUrl={url}
                                    downloadName="copywriting-image"
                                    className="w-full h-full"
                                  >
                                    <div className="relative w-full h-full">
                                      <img
                                        src={url}
                                        className="w-full h-full object-cover cursor-context-menu"
                                        alt={`Preview ${i + 1}`}
                                      />
                                      {generating && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px] transition-all">
                                          <div className="relative flex items-center justify-center">
                                            <span className="text-6xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
                                              {progress}%
                                            </span>
                                            <div className="absolute -inset-8 border-4 border-white/20 rounded-full animate-[spin_3s_linear_infinite]" />
                                            <div
                                              className="absolute -inset-8 border-t-4 border-white rounded-full animate-[spin_1.5s_linear_infinite]"
                                              style={{
                                                clipPath: `conic-gradient(white ${progress}%, transparent 0)`,
                                              }}
                                            />
                                          </div>
                                          <p className="mt-6 text-[10px] font-bold text-white/90 uppercase tracking-[0.3em] bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                                            Generating Copy...
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </ImageActionMenu>
                                </CarouselItem>
                              ))}
                            </CarouselContent>

                            {/* Navigation Arrows */}
                            {previewUrls.length > 1 && !generating && (
                              <>
                                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 border-none text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20" />
                                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 border-none text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20" />
                              </>
                            )}
                          </Carousel>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-3">
                          <span className="text-5xl font-bold text-blue-600">
                            {progress}%
                          </span>
                          <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
                            正在生成文案...
                          </p>
                        </div>
                      )}

                      {/* Iconic Interaction Cluster */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider border border-white/10">
                          {generating ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              <span className="animate-pulse">Analyzing</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-2.5 h-2.5" />
                              <span>Reference</span>
                            </>
                          )}
                        </div>
                        {generating && (
                          <div className="flex items-center gap-1">
                            <div className="p-1 rounded-full bg-blue-500/80 backdrop-blur-md shadow-lg border border-white/20 animate-bounce">
                              <Sparkles className="w-2.5 h-2.5 text-white" />
                            </div>
                            <div
                              className="p-1 rounded-full bg-zinc-800/80 backdrop-blur-md shadow-lg border border-white/10 animate-spin"
                              style={{ animationDuration: "3s" }}
                            >
                              <ScanSearch className="w-2.5 h-2.5 text-zinc-400" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {!generating && result && result.length > 0 && (
                      <div className="p-3 bg-white dark:bg-zinc-900 flex flex-col gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-[15px] leading-snug line-clamp-2">
                          {result[selectedStyleIndex]?.title}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-800 border border-white dark:border-zinc-700 shadow-sm overflow-hidden">
                              <img src="/copywriting_avatar.webp" alt="" />
                            </div>
                            <span className="text-[11px] text-gray-500 font-medium">
                              不吃香菜
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <Heart className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium">
                              1.2w
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Area: Results or Skeleton */}
                <div className="md:col-span-8 flex flex-col gap-4">
                  {generating ? (
                    <div className="flex flex-col gap-4">
                      {/* Style Tabs Placeholder */}
                      <div className="flex flex-wrap items-center gap-1 md:gap-1.5 bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-xl w-full md:w-auto self-start border border-gray-100 dark:border-zinc-800/30">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            className="flex-1 md:flex-none w-16 h-7 bg-white dark:bg-zinc-800 rounded-lg animate-pulse"
                          />
                        ))}
                      </div>

                      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col gap-6">
                        <div className="space-y-6">
                          {/* Title Skeleton */}
                          <div className="space-y-3">
                            <div className="h-3 w-20 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse" />
                            <div className="h-12 w-3/4 bg-gray-50 dark:bg-zinc-950/50 rounded-xl animate-pulse" />
                          </div>

                          {/* Description Skeleton */}
                          <div className="space-y-3">
                            <div className="h-3 w-24 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse" />
                            <div className="space-y-2 p-4 bg-gray-50 dark:bg-zinc-950/50 rounded-xl border border-gray-100 dark:border-zinc-800/30">
                              <div className="h-4 w-full bg-gray-200/50 dark:bg-zinc-800/50 rounded animate-pulse" />
                              <div className="h-4 w-full bg-gray-200/50 dark:bg-zinc-800/50 rounded animate-pulse" />
                              <div className="h-4 w-2/3 bg-gray-200/50 dark:bg-zinc-800/50 rounded animate-pulse" />
                            </div>
                          </div>

                          {/* Tags Skeleton */}
                          <div className="space-y-3">
                            <div className="h-3 w-16 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse" />
                            <div className="flex flex-wrap gap-2">
                              {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div
                                  key={i}
                                  className="h-8 w-16 bg-gray-50 dark:bg-zinc-800 rounded-lg animate-pulse"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col gap-6">
                      {/* Style Tabs */}
                      <div className="flex flex-wrap items-center gap-1 md:gap-1.5 bg-gray-50 dark:bg-zinc-800 p-1 rounded-xl w-full md:w-auto self-start">
                        {result &&
                          result.map((item, index) => {
                            return (
                              <button
                                key={item.type}
                                type="button"
                                onClick={() => setSelectedStyleIndex(index)}
                                className={cn(
                                  "flex-1 md:flex-none px-2 md:px-4 py-1.5 rounded-lg text-[11px] md:text-xs font-semibold transition-all duration-200 focus:outline-none whitespace-nowrap text-center",
                                  selectedStyleIndex === index
                                    ? "bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                                )}
                              >
                                {STYLE_LABELS[item.type] || item.type}
                              </button>
                            );
                          })}
                      </div>

                      {/* Content Section */}
                      <div className="flex flex-col gap-4">
                        {/* Title Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              标题 Title
                            </span>
                            <CopyButton
                              text={result?.[selectedStyleIndex]?.title || ""}
                              className="h-6 px-2"
                              label="复制"
                              theme="blue"
                              onCopy={() =>
                                analytics.trackClick("copywriting_copy_title", {
                                  source: "copywriting",
                                  content_type: "title",
                                  item_title:
                                    result?.[selectedStyleIndex]?.title,
                                  selected_tab:
                                    STYLE_LABELS[
                                      result?.[selectedStyleIndex]?.type
                                    ] || result?.[selectedStyleIndex]?.type,
                                })
                              }
                            />
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg text-gray-900 dark:text-zinc-100 font-medium text-lg leading-relaxed border border-gray-100 dark:border-zinc-700">
                            {result?.[selectedStyleIndex]?.title}
                          </div>
                        </div>

                        {/* Description Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              正文 Description
                            </span>
                            <CopyButton
                              text={
                                result?.[selectedStyleIndex]?.description || ""
                              }
                              className="h-6 px-2"
                              label="复制"
                              theme="blue"
                              onCopy={() =>
                                analytics.trackClick("copywriting_copy_desc", {
                                  source: "copywriting",
                                  content_type: "description",
                                  item_title:
                                    result?.[selectedStyleIndex]?.title,
                                  selected_tab:
                                    STYLE_LABELS[
                                      result?.[selectedStyleIndex]?.type
                                    ] || result?.[selectedStyleIndex]?.type,
                                })
                              }
                            />
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg text-gray-700 dark:text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap border border-gray-100 dark:border-zinc-700 min-h-[100px]">
                            {result?.[selectedStyleIndex]?.description}
                          </div>
                        </div>

                        {/* Tags Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              标签 Tags
                            </span>
                            <CopyButton
                              text={(result?.[selectedStyleIndex]?.tags || [])
                                .map((t) => `#${t}`)
                                .join(" ")}
                              className="h-6 px-2"
                              label="复制全部"
                              theme="blue"
                              onCopy={() =>
                                analytics.trackClick(
                                  "copywriting_copy_tags_all",
                                  {
                                    source: "copywriting",
                                    content_type: "tags",
                                    item_title:
                                      result?.[selectedStyleIndex]?.title,
                                    selected_tab:
                                      STYLE_LABELS[
                                        result?.[selectedStyleIndex]?.type
                                      ] || result?.[selectedStyleIndex]?.type,
                                  }
                                )
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(result?.[selectedStyleIndex]?.tags || []).map(
                              (tag, i) => (
                                <button
                                  key={i}
                                  className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-md text-sm font-medium transition-colors cursor-pointer"
                                  onClick={() => copyToClipboard(`#${tag}`)}
                                >
                                  #{tag}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <ImageInput
            images={images}
            onImagesChange={(newFiles) => {
              setImages(newFiles);
              setUploadedPaths([]);
            }}
            generating={generating}
            onGenerate={handleGenerate}
            pointsCost={cost}
            user={user}
            canGuestUse={canGuestUseAI()}
            onAuthOpen={() => openAuthModal("login")}
            onNavigateToNano={() => navigate("/generate")}
          />
        </div>
        {/* Right Sidebar Spacer for Balance */}
        <div className="hidden md:block w-64 shrink-0" />
      </main>

      {/* Mobile History Button */}
      <button
        onClick={() => setIsHistoryOpen(true)}
        className="md:hidden fixed top-24 right-4 z-40 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-95 text-gray-700 dark:text-zinc-300 p-3 rounded-lg shadow-sm transition-all"
      >
        <History className="w-5 h-5" />
      </button>

      {/* Mobile History Overlay */}
      {isHistoryOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsHistoryOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                历史记录
              </h3>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : (history || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <ImageIcon className="w-12 h-12 mb-3" />
                  <p className="text-sm">暂无历史记录</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(history || []).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.is_optimistic) return;
                        loadHistoryItem(item);
                        setIsHistoryOpen(false);
                      }}
                      className={cn(
                        "bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl transition-all flex gap-3 items-start relative overflow-hidden",
                        item.is_optimistic &&
                          "animate-pulse cursor-wait opacity-70"
                      )}
                    >
                      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-zinc-100 leading-tight mb-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {item.is_optimistic ? (
                            <span className="text-blue-500 font-bold">
                              生成中...
                            </span>
                          ) : (
                            new Date(item.created_at).toLocaleString("zh-CN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          )}
                        </p>
                      </div>
                      {!item.is_optimistic && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(item.id);
                            setIsHistoryOpen(false);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 active:scale-90 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，该历史记录将从数据库中永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
