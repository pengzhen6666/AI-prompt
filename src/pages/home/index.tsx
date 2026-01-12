import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search,
  Copy,
  Check,
  X,
  Filter,
  Heart,
  Share2,
  Download,
  Zap,
  ChevronDown,
  Command,
  Globe,
  Loader2,
} from "lucide-react";
import {
  getAllPrompts,
  searchPrompts,
  getPromptsByCategory,
  updatePromptLikes,
  getAllTags,
} from "@/servers/prompts";
import type { PromptDisplay } from "@/types/prompt";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { XHSResult } from "@/servers/ai";
import { CopyButton } from "@/components/CopyButton";
import { ImageActionMenu } from "@/components/ImageActionMenu";
import { cn } from "@/lib/utils";
import { useHomeStore } from "@/store/homeStore";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { getMasonryOptimizedUrl } from "@/lib/supabaseThumbnailLoader";
import { Logo } from "@/components/Logo";

// 默认分类
const DEFAULT_CATEGORIES = ["全部"];

const CHRISTMAS_KEYWORDS =
  "**important**：Christmas theme, festive atmosphere, snow, holiday lights,Wearing a Christmas hat on the head";

const STYLE_LABELS: Record<string, string> = {
  charm: "魅惑",
  pure: "纯欲",
  innocent: "清纯",
  daily: "日常",
  education: "教学",
};

// Banana Icon Component - Clean Version
const BananaIcon = ({ className }: { className: string }) => (
  <img src="/favicon.svg" className={className} />
);

// Shuffle array utility
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- 性能优化：隔离搜索组件 ---
// 将搜索输入状态局部化，避免打字时重新渲染整个 Home 页面
const SearchInput = React.memo(
  ({
    value,
    onDebouncedChange,
  }: {
    value: string;
    onDebouncedChange: (val: string) => void;
  }) => {
    const [localVal, setLocalVal] = useState(value);
    const debouncedVal = useDebounce(localVal, 400);

    useEffect(() => {
      if (value !== localVal) setLocalVal(value);
    }, [value]);

    useEffect(() => {
      if (debouncedVal !== value) {
        onDebouncedChange(debouncedVal);
      }
    }, [debouncedVal]);

    return (
      <div className="relative max-w-2xl mx-auto group">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-14 pr-4 py-4 rounded-full border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:ring-4 focus:ring-gray-100 dark:focus:ring-zinc-800 focus:border-gray-900 dark:focus:border-zinc-700 shadow-[0_4px_20px_rgba(0,0,0,0.1) dark:shadow-none] hover:shadow-[0_6px_30px_rgba(0,0,0,0.15)] transition-all text-base h-14"
          placeholder="搜索角色风格、发型、服装..."
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
        />
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";

const App = () => {
  const navigate = useNavigate();
  const {
    prompts: filteredData,
    setPrompts: setFilteredData,
    categories,
    setCategories,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    hasMore,
    setHasMore,
  } = useHomeStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PromptDisplay | null>(
    null
  );
  const [isChristmasMode, setIsChristmasMode] = useState(false);

  const displayedPrompt = useMemo(() => {
    if (!selectedImage) return "";
    return isChristmasMode
      ? `${selectedImage.prompt}${CHRISTMAS_KEYWORDS}`
      : selectedImage.prompt;
  }, [selectedImage, isChristmasMode]);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State for multi-image and copywriting
  const [selectedStyleIndex, setSelectedStyleIndex] = useState<number>(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Sync Carousel API
  useEffect(() => {
    if (!api) return;

    setCurrentSlide(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  // Pagination Logic
  const ITEMS_PER_PAGE = 20;
  const isFetchingRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Masonry Layout Logic
  const [numColumns, setNumColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1280) setNumColumns(4); // xl
      else if (width >= 1024) setNumColumns(3); // lg
      else if (width >= 640) setNumColumns(2); // sm
      else setNumColumns(1); // default
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const masonryColumns = useMemo(() => {
    const cols: PromptDisplay[][] = Array.from(
      { length: numColumns },
      () => []
    );
    (filteredData || []).forEach((item, index) => {
      // 仅对前 50 项在 "全部" 标签下进行 URL 优化，存储在 thumbnailUrl 中
      const optimizedItem = {
        ...item,
        thumbnailUrl: getMasonryOptimizedUrl(item.url, index, activeCategory),
      };
      cols[index % numColumns].push(optimizedItem);
    });
    return cols;
  }, [filteredData, numColumns, activeCategory]);
  // 初始加载标签
  useEffect(() => {
    if (categories && categories.length > 1) return; // Already loaded

    const initTags = async () => {
      try {
        const tagsData = await getAllTags({
          author: "Nano Banana",
          minCount: 3,
        });
        setCategories(["全部", ...tagsData]);
      } catch (err) {
        console.error("加载标签失败:", err);
      }
    };
    initTags();
  }, [categories]);

  const loadData = async (isLoadMore = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isLoadMore) {
        setLoading(false); // Silent load for infinite scroll
      } else {
        setLoading(true);
      }
      setError(null);

      const currentPrompts = filteredData || [];
      const offset = isLoadMore ? currentPrompts.length : 0;
      let results: PromptDisplay[] = [];

      if (searchQuery.trim()) {
        results = await searchPrompts(
          searchQuery,
          activeCategory === "全部" ? undefined : activeCategory
        );
        setHasMore(false);
      } else {
        results = await getAllPrompts({
          author: "Nano Banana",
          offset,
          limit: ITEMS_PER_PAGE,
        });

        if (activeCategory !== "全部") {
          results = await getPromptsByCategory(activeCategory, {
            limit: ITEMS_PER_PAGE,
            offset,
          });
        }
        setHasMore(results.length === ITEMS_PER_PAGE);
      }

      if (isLoadMore) {
        setFilteredData((prev) => [...(prev || []), ...results]);
      } else {
        setFilteredData(results);
      }
    } catch (err) {
      console.error("加载数据失败:", err);
      setError("加载数据失败,请刷新页面重试");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Only fetch if prompts are null (initial load) or search/category changed
    // If prompts exist but mismatch search/category, results will eventually refresh
    if (!filteredData) {
      loadData();
    }
  }, []);

  // Use a ref to track previous category and search to trigger refresh
  const prevCategoryRef = useRef(activeCategory);
  const prevSearchRef = useRef(searchQuery);

  useEffect(() => {
    if (
      prevCategoryRef.current !== activeCategory ||
      prevSearchRef.current !== searchQuery
    ) {
      prevCategoryRef.current = activeCategory;
      prevSearchRef.current = searchQuery;
      loadData();
    }
  }, [activeCategory, searchQuery]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isFetchingRef.current &&
          !loading
        ) {
          loadData(true);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, filteredData?.length, loading]);

  const handleCopy = (text: string, item?: PromptDisplay) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    if (item) {
      handleLike(null, item);
    }
  };

  const handleManualCopy = (item: PromptDisplay) => {
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    handleLike(null, item);
    analytics.trackClick("home_copy_btn", {
      source: "home_modal",
      content_id: item.id,
      content_type: "prompt",
      item_title: item.title,
    });
  };

  const lastLikeTimeRef = React.useRef<{ [key: string]: number }>({});

  const handleLike = async (
    e: React.MouseEvent | null,
    item: PromptDisplay
  ) => {
    e?.stopPropagation();

    // Throttle: prevent likes within 1 second for the same item
    const now = Date.now();
    const lastLikeTime = lastLikeTimeRef.current[item.id] || 0;
    if (now - lastLikeTime < 1000) {
      return;
    }
    lastLikeTimeRef.current[item.id] = now;

    const newLikes = item.likes + 1;
    const updateState = (prev: PromptDisplay[]) =>
      prev.map((p) => (p.id === item.id ? { ...p, likes: newLikes } : p));

    setFilteredData(updateState);

    // Call API
    const success = await updatePromptLikes(String(item.id));
    if (!success) {
      // Revert if failed
      const revertState = (prev: PromptDisplay[]) =>
        prev.map((p) => (p.id === item.id ? { ...p, likes: item.likes } : p));
      setFilteredData(revertState);
    }
  };

  const openModal = (img: PromptDisplay) => {
    setSelectedImage(img);
    setSelectedStyleIndex(0);
    setCurrentSlide(0);
    setIsDescExpanded(false);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setSelectedImage(null);
    setIsChristmasMode(false);
    setIsDescExpanded(false);
    document.body.style.overflow = "auto";
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent pt-20">
      {/* Top Navbar: Logo Left, Language Right */}

      {/* Hero Section: Centered Title & Search */}
      <div className="bg-transparent pb-8 pt-6 px-4 sm:px-6 lg:px-8 mb-4 relative z-10 w-full">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-zinc-100 mb-4 tracking-tight">
            AI 人物提示词库
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 mb-10 text-lg">
            汇集 700+ 高质量人物、角色、虚拟人 Prompt，激发你的创作灵感
          </p>

          <SearchInput value={searchQuery} onDebouncedChange={setSearchQuery} />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10 w-full flex-1">
        {/* Categories (Pills) - Fixed Jittering Issue */}
        {/* Categories (Pills) - Expandable */}
        <div className="relative w-full mb-6">
          <div
            className={`flex flex-wrap gap-3 transition-all duration-300 ease-in-out ${
              isExpanded ? "max-h-[1000px]" : "max-h-[50px] overflow-hidden"
            } justify-start pr-12`}
          >
            {(categories || DEFAULT_CATEGORIES).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 border-2 ${
                  activeCategory === cat
                    ? "bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-gray-900 dark:border-zinc-100 shadow-lg shadow-gray-200 dark:shadow-none"
                    : "bg-transparent text-gray-400 dark:text-zinc-500 border-gray-200 dark:border-zinc-800 hover:border-gray-900 dark:hover:border-zinc-100 hover:text-gray-900 dark:hover:text-zinc-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute right-0 top-0 h-[46px] w-12 flex items-center justify-center bg-linear-to-l from-white dark:from-zinc-950 via-white/80 dark:via-zinc-950/80 to-transparent z-10"
          >
            <div className="bg-white dark:bg-zinc-800 p-1.5 rounded-full border border-gray-100 dark:border-zinc-700">
              <ChevronDown
                className={`w-4 h-4 text-gray-500 dark:text-zinc-400 transition-transform duration-300 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
            <p className="text-gray-500 text-lg font-medium">加载中...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full mb-6 shadow-sm border border-red-100 dark:border-red-900/30">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition-colors"
            >
              刷新页面
            </button>
          </div>
        )}

        {/* Masonry Grid - JS Based for Correct Order */}
        {!loading && !error && filteredData && (
          <div className="flex gap-6 items-start">
            {masonryColumns.map((column, colIndex) => (
              <div key={colIndex} className="flex-1 space-y-6">
                {column.map((item) => (
                  <div
                    key={item.id}
                    className="group relative bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden cursor-pointer border border-gray-100/50 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    onClick={() => openModal(item)}
                  >
                    {/* Image Container */}
                    <ImageActionMenu
                      imageUrl={item.url}
                      allUrls={item.urls}
                      downloadName={item.title}
                    >
                      <div className="relative overflow-hidden bg-gray-50 dark:bg-zinc-800">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.title}
                          className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
                          loading="lazy"
                        />

                        {/* Hover Details Button */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(item);
                            }}
                            className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-gray-900 dark:text-zinc-100 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                          >
                            View Details
                          </button>
                        </div>

                        {/* Watermark */}
                        <div className="absolute bottom-2 right-2 opacity-60 pointer-events-none">
                          <span className="text-[10px] font-bold text-white/90 drop-shadow-md bg-black/20 px-1.5 py-0.5 rounded backdrop-blur-[2px]">
                            AI by lumina.cyou
                          </span>
                        </div>
                      </div>
                    </ImageActionMenu>

                    {/* Card Body - Minimalist */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-base leading-snug">
                          {item.title}
                        </h3>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {item.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-xs font-semibold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between text-xs font-medium text-gray-400 pt-3 border-t border-gray-50 dark:border-zinc-800">
                        <span className="flex items-center gap-1.5 cursor-pointer hover:text-red-500 transition-colors group/like">
                          <Heart className="w-3.5 h-3.5 text-gray-400 group-hover/like:text-red-500 group-hover/like:fill-red-500 transition-colors" />
                          <span>{item.likes || 0}</span>
                        </span>
                        <span className="bg-gray-50 dark:bg-zinc-800 px-2 py-0.5 rounded text-gray-500 dark:text-zinc-400">
                          {item.model}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Load More Trigger */}
        {!loading && !error && hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
          </div>
        )}

        {!loading && !error && (filteredData || []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="bg-white p-6 rounded-full mb-6 shadow-sm border border-gray-100">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-xl font-bold text-gray-900 mb-2">
              没有找到相关结果
            </p>
            <p className="text-gray-500">尝试搜索其他关键词或切换分类</p>
          </div>
        )}
      </main>

      {/* Detailed Modal - Clean & Spacious */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
          onClick={() => {
            setSelectedImage(null);
            setIsDescExpanded(false);
          }}
        >
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          ></div>

          <div
            className="relative bg-white dark:bg-zinc-900 w-full max-w-6xl h-full md:h-[90vh] rounded-4xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-300 ring-1 ring-white/20 dark:ring-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 z-20 p-2.5 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-all shadow-md hover:shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
              {/* Left Side: Image / Carousel */}
              <div className="w-full md:w-3/5 bg-gray-50/50 dark:bg-zinc-950/50 flex items-center justify-center p-6 sm:p-10">
                <div className="flex flex-col items-center gap-3 w-full">
                  {/* Style Tabs - Moved Above Image */}
                  {selectedImage.copywritingResults &&
                    selectedImage.copywritingResults.length > 0 && (
                      <div className="flex items-center gap-0.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 overflow-x-auto max-w-full scrollbar-hide animate-in fade-in slide-in-from-top-4 duration-500">
                        {selectedImage.copywritingResults.map((item, index) => (
                          <button
                            key={item.type || index}
                            type="button"
                            onClick={() => setSelectedStyleIndex(index)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 focus:outline-none whitespace-nowrap",
                              selectedStyleIndex === index
                                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-md scale-105"
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                            )}
                          >
                            {STYLE_LABELS[item.type] || "默认"}
                          </button>
                        ))}
                      </div>
                    )}

                  <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-full max-w-[290px]">
                    <div className="relative aspect-4/5 bg-gray-100 dark:bg-zinc-800">
                      {selectedImage.urls && selectedImage.urls.length > 0 ? (
                        <div className="relative group/carousel w-full h-full">
                          <Carousel
                            setApi={setApi}
                            plugins={[Autoplay({ delay: 4000 })]}
                            className="w-full h-full"
                            opts={{ loop: true }}
                          >
                            <CarouselContent className="h-full">
                              {selectedImage.urls.map((url, i) => (
                                <CarouselItem
                                  key={url}
                                  className="h-full flex items-center justify-center"
                                >
                                  <ImageActionMenu
                                    imageUrl={url}
                                    allUrls={selectedImage.urls}
                                    downloadName={`${selectedImage.title}-${
                                      i + 1
                                    }`}
                                    className="w-full h-full"
                                  >
                                    <img
                                      src={url}
                                      alt={`${selectedImage.title} ${i + 1}`}
                                      className="w-full h-full object-cover cursor-context-menu"
                                    />
                                  </ImageActionMenu>
                                </CarouselItem>
                              ))}
                            </CarouselContent>

                            {/* Navigation Arrows */}
                            {selectedImage.urls.length > 1 && (
                              <>
                                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 border-none text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 z-20" />
                                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 border-none text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 z-20" />
                              </>
                            )}

                            {/* Pagination Dots */}
                            {selectedImage.urls.length > 1 && (
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                {selectedImage.urls.map((_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => api?.scrollTo(i)}
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                      currentSlide === i
                                        ? "bg-white w-3 shadow-sm"
                                        : "bg-white/40"
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </Carousel>
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <ImageActionMenu
                            imageUrl={selectedImage.url}
                            downloadName={selectedImage.title}
                            className="w-full h-full"
                          >
                            <img
                              src={selectedImage.url}
                              alt={selectedImage.title}
                              className="w-full h-full object-cover"
                            />
                          </ImageActionMenu>
                        </div>
                      )}
                    </div>

                    {/* XHS Style Card Footer */}
                    <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-50 dark:border-zinc-800">
                      <div className="mb-2">
                        <h3
                          className="font-bold text-gray-900 dark:text-zinc-100 text-[15px] leading-snug mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-1 -m-1 rounded transition-colors"
                          onClick={() => {
                            const title =
                              selectedImage.copywritingResults &&
                              selectedImage.copywritingResults.length > 0
                                ? selectedImage.copywritingResults[
                                    selectedStyleIndex
                                  ]?.title
                                : selectedImage.title;
                            navigator.clipboard.writeText(title);
                            toast.success("标题已复制");
                          }}
                        >
                          {selectedImage.copywritingResults &&
                          selectedImage.copywritingResults.length > 0
                            ? selectedImage.copywritingResults[
                                selectedStyleIndex
                              ]?.title
                            : selectedImage.title}
                        </h3>
                        {selectedImage.copywritingResults &&
                          selectedImage.copywritingResults.length > 0 && (
                            <div className="relative">
                              <div
                                className="text-[13px] text-gray-600 dark:text-zinc-400 leading-relaxed line-clamp-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-1 -m-1 rounded transition-colors"
                                onClick={() => {
                                  const desc =
                                    selectedImage.copywritingResults[
                                      selectedStyleIndex
                                    ]?.description;
                                  navigator.clipboard.writeText(desc);
                                  toast.success("描述已复制");
                                }}
                              >
                                {
                                  selectedImage.copywritingResults[
                                    selectedStyleIndex
                                  ]?.description
                                }
                              </div>

                              {/* Style-specific Tags */}
                              <div
                                className="flex flex-wrap gap-x-2 gap-y-1 mt-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-1 -m-1 rounded transition-colors max-w-[95%]"
                                onClick={() => {
                                  const tags = selectedImage.copywritingResults[
                                    selectedStyleIndex
                                  ]?.tags
                                    ?.map((t) => `#${t}`)
                                    .join(" ");
                                  navigator.clipboard.writeText(tags);
                                  toast.success("标签已复制");
                                }}
                              >
                                {selectedImage.copywritingResults[
                                  selectedStyleIndex
                                ]?.tags?.map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="text-[12px] font-medium text-gray-400 dark:text-zinc-500"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-white dark:border-zinc-700 shadow-sm overflow-hidden">
                            <img
                              src="/copywriting_avatar.webp"
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                            <span className="uppercase">
                              {selectedImage.author[0]}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                            {selectedImage.author}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Heart className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">
                            {selectedImage.likes > 1000
                              ? (selectedImage.likes / 1000).toFixed(1) + "k"
                              : selectedImage.likes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Details */}
              <div className="w-full md:w-2/5 p-6 md:p-10 bg-white dark:bg-zinc-900 flex flex-col md:overflow-y-auto">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedImage.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-lg bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 text-xs font-bold border border-yellow-400/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title & Author Info */}
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-gray-900 dark:text-zinc-100 mb-2 leading-tight">
                    {selectedImage.title}
                  </h2>
                  <p className="text-gray-500 dark:text-zinc-400 text-sm font-medium">
                    By {selectedImage.author} • {selectedImage.model}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-10">
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-center border border-gray-100 dark:border-zinc-700">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      点赞
                    </div>
                    <div className="text-lg font-black text-gray-900 dark:text-zinc-100">
                      {selectedImage.likes}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-center border border-gray-100 dark:border-zinc-700">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      尺寸
                    </div>
                    <div className="text-lg font-black text-gray-900 dark:text-zinc-100">
                      {selectedImage.aspectRatio}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-center border border-gray-100 dark:border-zinc-700">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      版本
                    </div>
                    <div className="text-lg font-black text-gray-900 dark:text-zinc-100">
                      v6.0
                    </div>
                  </div>
                </div>

                {/* Prompts */}
                <div className="space-y-8 flex-1">
                  <div className="relative group flex flex-col h-full">
                    {/* Header: Title and Copy Button */}
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h3 className="text-sm font-extrabold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">
                        提示词 (Prompt)
                      </h3>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          点击按钮复制
                        </span>
                        <CopyButton
                          text={displayedPrompt}
                          onCopy={() => handleManualCopy(selectedImage)}
                        />
                      </div>
                    </div>
                    <div
                      className="p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-300 leading-relaxed font-mono wrap-break-word min-h-[100px]"
                      onCopy={() => handleManualCopy(selectedImage)}
                    >
                      {displayedPrompt}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer - Minimal */}
      <footer className="mt-12 py-10 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg shadow-sm">
              <Logo className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-zinc-100">
              Lumina <span className="text-yellow-500">AI</span>
            </span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-gray-500 dark:text-zinc-400">
            <Link
              to="/legal#terms"
              className="hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
            >
              使用条款
            </Link>
            <Link
              to="/legal#privacy"
              className="hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
            >
              隐私政策
            </Link>
          </div>
          <p className="text-gray-400 text-sm font-medium">
            © 2024 Nona Banana AI.
          </p>
        </div>
      </footer>

      {/* Toast */}
      <div
        className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3.5 rounded-full font-bold shadow-2xl transition-all duration-300 flex items-center gap-2.5 z-50 ${
          isCopied
            ? "translate-y-0 opacity-100"
            : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-yellow-400 rounded-full p-0.5">
          <Check className="w-3.5 h-3.5 text-black" />
        </div>
        复制成功
      </div>
    </div>
  );
};

export default App;
