import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
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
  updatePromptLikes,
  getAllTags,
} from "@/servers/prompts";
import type { PromptDisplay } from "@/types/prompt";
import Navbar from "@/components/Navbar";
import { useDebounce } from "@/hooks/useDebounce";
import { getMasonryOptimizedUrl } from "@/lib/supabaseThumbnailLoader";

// 默认分类
const DEFAULT_CATEGORIES = ["全部"];

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
  const [activeCategory, setActiveCategory] = useState("全部");
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<PromptDisplay | null>(
    null
  );
  const [isCopied, setIsCopied] = useState(false);
  const [filteredData, setFilteredData] = useState<PromptDisplay[]>([]);
  const [allData, setAllData] = useState<PromptDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    filteredData.forEach((item, index) => {
      // 仅对前 50 项在 "全部" 标签下进行 URL 优化，存储在 thumbnailUrl 中
      const optimizedItem = {
        ...item,
        thumbnailUrl: getMasonryOptimizedUrl(item.url, index, activeCategory),
      };
      cols[index % numColumns].push(optimizedItem);
    });
    return cols;
  }, [filteredData, numColumns, activeCategory]);

  // 初始加载数据和标签
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 并行加载 prompts 和 tags
        const [promptsData, tagsData] = await Promise.all([
          getAllPrompts({ author: "Background Wall" }),
          getAllTags({ author: "Background Wall" }),
        ]);

        setAllData(promptsData);
        setFilteredData(promptsData);
        setCategories(["全部", ...tagsData]);
      } catch (err) {
        console.error("加载数据失败:", err);
        setError("加载数据失败,请刷新页面重试");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter logic
  useEffect(() => {
    const filterData = async () => {
      if (searchQuery.trim()) {
        // 如果有搜索词,使用搜索 API
        const results = await searchPrompts(
          searchQuery,
          activeCategory === "全部" ? undefined : activeCategory
        );
        setFilteredData(results);
      } else {
        if (activeCategory === "全部") {
          // 全部(排行榜)逻辑:
          // 1. 按点赞数降序排序
          // 2. 取前8名 -> 随机排序
          // 3. 剩余的 -> 随机排序

          setFilteredData(allData);
        } else {
          // 否则按分类筛选
          const filtered = allData.filter((item) => {
            return item.tags.includes(activeCategory);
          });
          setFilteredData(filtered);
        }
      }
    };

    filterData();
  }, [activeCategory, searchQuery, allData]);

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

    // Optimistic update
    const newLikes = item.likes + 1;
    const updateState = (prev: PromptDisplay[]) =>
      prev.map((p) => (p.id === item.id ? { ...p, likes: newLikes } : p));

    setAllData(updateState);
    setFilteredData(updateState);

    // Call API
    const success = await updatePromptLikes(String(item.id));
    if (!success) {
      // Revert if failed
      const revertState = (prev: PromptDisplay[]) =>
        prev.map((p) => (p.id === item.id ? { ...p, likes: item.likes } : p));
      setAllData(revertState);
      setFilteredData(revertState);
    }
  };

  const openModal = (img) => {
    setSelectedImage(img);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setSelectedImage(null);
    document.body.style.overflow = "auto";
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent font-sans text-gray-900 pt-20">
      {/* Global Navbar handles navigation */}

      {/* Hero Section: Centered Title & Search */}
      <div className="bg-transparent pb-8 pt-6 px-4 sm:px-6 lg:px-8 mb-4 relative z-10 w-full">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-zinc-100 mb-4 tracking-tight">
            AI 背景墙提示词库
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 mb-10 text-lg">
            汇集 700+ 高质量背景、壁纸、场景 Prompt，激发你的创作灵感
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
            className={`flex flex-wrap gap-3 transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[1000px]" : "max-h-[50px] overflow-hidden"
              } justify-start pr-12`}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 border-2 ${activeCategory === cat
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
            className="absolute right-0 top-0 h-[46px] w-12 flex items-center justify-center bg-gradient-to-l from-gray-50 via-gray-50 to-transparent z-10"
          >
            <div className="bg-white p-1.5 rounded-full shadow-sm border border-gray-100">
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""
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
            <div className="bg-red-50 p-6 rounded-full mb-6 shadow-sm border border-red-100">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-xl font-bold text-gray-900 mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition-colors"
            >
              刷新页面
            </button>
          </div>
        )}

        {/* Masonry Grid - JS Based for Correct Order */}
        {!loading && !error && (
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

                    {/* Card Body - Minimalist */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-base leading-snug">
                          {item.title}
                        </h3>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {item.tags.map((tag) => (
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
                          <span>{item.likes}</span>
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

        {!loading && !error && filteredData.length === 0 && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          ></div>

          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-5xl max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in duration-200 ring-1 ring-white/20 dark:ring-zinc-800">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 z-10 p-2.5 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-all shadow-md hover:shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Side: Image */}
            <div className="w-full md:w-3/5 bg-gray-50/50 dark:bg-zinc-800/50 flex items-center justify-center p-6 sm:p-10 relative">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-w-full max-h-[40vh] md:max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
              {/* Watermark */}
              <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 opacity-70 pointer-events-none">
                <span className="text-xs font-bold text-white/90 drop-shadow-md bg-black/20 px-2 py-1 rounded backdrop-blur-[2px]">
                  AI by lumina.cyou
                </span>
              </div>
            </div>

            {/* Right Side: Details */}
            <div className="w-full md:w-2/5 p-6 md:p-10 bg-white dark:bg-zinc-900 flex flex-col">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  {selectedImage.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-black tracking-wider text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-100 mb-3 leading-tight">
                  {selectedImage.title}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 font-medium">
                  <span>By {selectedImage.author}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700"></span>
                  <span>{selectedImage.model}</span>
                </div>
              </div>
              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-center">
                  <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                    点赞
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-zinc-100">
                    {selectedImage.likes}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-center">
                  <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                    尺寸
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-zinc-100">
                    {selectedImage.aspectRatio}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-center">
                  <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                    版本
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-zinc-100">
                    v6.0
                  </div>
                </div>
              </div>

              {/* Prompts */}
              <div className="space-y-8 flex-1 overflow-hidden">
                <div className="relative group flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                      提示词 (Prompt)
                    </h3>
                    <button
                      onClick={() =>
                        handleCopy(selectedImage.prompt, selectedImage)
                      }
                      className="text-xs font-bold text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {isCopied ? "已复制" : "复制"}
                    </button>
                  </div>

                  <div
                    className="p-5 rounded-2xl bg-gray-50 border-2 border-gray-100 text-sm text-gray-600 leading-relaxed font-mono break-words overflow-y-auto flex-1 max-h-[400px]"
                    onCopy={() => handleManualCopy(selectedImage)}
                  >
                    {selectedImage.prompt}
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
            <div className="bg-yellow-400 p-1.5 rounded-lg shadow-sm">
              <BananaIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-zinc-100 tracking-tight">
              NonaBanana
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
        className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3.5 rounded-full font-bold shadow-2xl transition-all duration-300 flex items-center gap-2.5 z-50 ${isCopied
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
