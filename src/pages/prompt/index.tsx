import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  reversingPromptFromImages,
  generateVideoPrompts,
  analyzeFaceFromImage,
  type VideoPromptResult,
} from "@/servers/ai";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  ScanText,
  ScanSearch,
  Sparkles,
  Loader2,
  Copy,
  FileText,
  Trash2,
  ImageIcon,
  History,
  X,
  Send,
  Download,
  Link2,
  Check,
  Plus,
  User,
  Accessibility,
  Settings2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { ImageInput } from "@/components/ImageInput";
import { supabase } from "@/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { analytics } from "@/lib/analytics";
import { compressImage } from "@/lib/imageCompression";
import { defaultBucket, uploadFileServerAPI } from "@/servers/upload";
import { AuthModal } from "@/components/AuthModal";
import { ImageActionMenu } from "@/components/ImageActionMenu";
import { CopyButton } from "@/components/CopyButton";
import { getFaceStyles, type FaceStyleRecord } from "@/servers/face_style";
import {
  canGuestUseAI,
  incrementGuestUsage,
  getRemainingGuestUsage,
} from "@/lib/guestLimit";

import { usePromptStore, type VideoResult } from "@/store/promptStore";
import {
  getActionStyles,
  type ActionStyleRecord,
} from "@/servers/action_style";
import { useUserStore } from "@/store/userStore";
import { useMarketingStore } from "@/store/marketingStore";
import { Input } from "@/components/ui/input";
import { mdVersion } from "@/version";

const PROMPT_STYLES = [
  {
    id: "default",
    name: "默认",
    description: "Default Style",
    image:
      "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&h=400&fit=crop",
  },
  {
    id: "creamy",
    name: "奶油柔焦",
    description: "Creamy Soft",
    image:
      "https://qbemmnrwjqrmxxnixfmg.supabase.co/storage/v1/object/public/siteweb/public/8ef96b98f4da96acea2dc5aca502991bd1a16532242af27223fc3d18fc6f500a.jpeg",
  },
  {
    id: "backlit",
    name: "逆光系",
    description: "Backlit Cinematic",
    image:
      "https://qbemmnrwjqrmxxnixfmg.supabase.co/storage/v1/object/public/siteweb/public/5a581b86e9923b90790384c278e9dd57466bcaf2db9adbabf34baf959ab89020.png",
  },
  {
    id: "film",
    name: "胶片质感",
    description: "Film Retro",
    image:
      "https://qbemmnrwjqrmxxnixfmg.supabase.co/storage/v1/object/public/siteweb/public/35944f18854d8659fdadf0899d7821061e533e713b2db6a28f9bb4413333c3a5.png",
  },
];
const MEMBERSHIP_STYLE_LIMITS: Record<string, number> = {
  free: 1,
  pro: 3,
  ultra: 20,
};

//
const PromptPage = ({ userFromApp }: { userFromApp: SupabaseUser | null }) => {
  const {
    response,
    setResponse,
    videoResults,
    setVideoResults,
    currentImageUrl,
    setCurrentImageUrl,
    imageHistory: history,
    setImageHistory: setHistory,
    videoHistory,
    setVideoHistory,
    clearAll: clearStore,
    generating,
    setGenerating,
    progress,
    setProgress,
    selectedStyle,
    setSelectedStyle,
    personStyle,
    setPersonStyle,
    analyzeFace,
    setAnalyzeFace,
    selectedFaceId,
    setSelectedFaceId,
    selectedActionId,
    setSelectedActionId,
    isRefined,
    setIsRefined,
    customStyleText,
    setCustomStyleText,
    resetInputParameters,
  } = usePromptStore();

  const [images, setImages] = useState<File[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const [loadingVideoHistory, setLoadingVideoHistory] = useState(false);
  const [loadingMoreVideoHistory, setLoadingMoreVideoHistory] = useState(false);
  const [videoHistoryPage, setVideoHistoryPage] = useState(0);
  const [hasMoreVideoHistory, setHasMoreVideoHistory] = useState(true);

  const isFetchingRef = useRef(false);
  const videoIsFetchingRef = useRef(false);

  const PAGE_SIZE = 15;

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");
  const [selectedVideoStyleIndex, setSelectedVideoStyleIndex] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const lastFetchedSessionIdRef = useRef<string | null>(null);
  const { user, profile, openAuthModal } = useUserStore();
  const getCostByType = useMarketingStore((state) => state.getCostByType);
  const membershipCode = profile?.membership_code || "free";

  const imageCost = getCostByType("points_consumption", membershipCode); // 假设 type 为 points_consumption
  // 实际上可能需要更细分的 type，比如 "image_reverse" 和 "video_reverse"
  // 但根据 SQL，type 主要是 event_type 或者是 category？
  // 之前的对话提到过针对不同功能的积分消耗，通常在 config 中以会员等级为键。
  // 暂时统一使用 points_consumption，或者根据业务逻辑区分。

  const isUltra = profile?.membership_code === "ultra";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versions = mdVersion();
  const defaultVersion =
    versions.find((v) => v.default)?.key || versions[0].key;

  // Initialize personStyle if it's not set in the store yet (e.g. first visit)
  useEffect(() => {
    if (!personStyle) {
      setPersonStyle(defaultVersion);
    }
  }, [personStyle, defaultVersion, setPersonStyle]);

  const [faceStyles, setFaceStyles] = useState<FaceStyleRecord[]>([]);
  const [actionStyles, setActionStyles] = useState<ActionStyleRecord[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showMoreModels, setShowMoreModels] = useState(false);

  // Handle direct navigation from history
  useEffect(() => {
    const id = searchParams.get("id");
    if (id && user) {
      const fetchAndLoadItem = async () => {
        const { data, error } = await supabase
          .from("generated_prompts")
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

  useEffect(() => {
    if (!user) {
      clearStore();

      // Load last guest result if not logged in
      const savedImage = localStorage.getItem("last_guest_prompt_result");
      if (savedImage) {
        try {
          const { response: res, url } = JSON.parse(savedImage);
          setResponse(res);
          setCurrentImageUrl(url);
          setActiveTab("image");
        } catch (e) { }
      }
      const savedVideo = localStorage.getItem("last_guest_video_prompt_result");
      if (savedVideo) {
        try {
          const { results, url } = JSON.parse(savedVideo);
          setVideoResults(results);
          setCurrentImageUrl(url);
          setActiveTab("video");
        } catch (e) { }
      }
    } else {
      // Use id as a stable dependency and combine with a lock
      if (
        history === null &&
        !isFetchingRef.current &&
        !videoIsFetchingRef.current
      ) {
        setResponse("");
        setVideoResults([]);
        setCurrentImageUrl(null);
        fetchHistory(user);
        fetchVideoHistory(user);
      }
    }
  }, [user?.id]);

  // Separate effect for face styles to ensure they load regardless of history status
  useEffect(() => {
    if (user?.id) {
      fetchFaceStyles(user.id);
      fetchActionStyles(user.id);
    }
  }, [user?.id]);

  const fetchFaceStyles = async (userId: string) => {
    try {
      const data = await getFaceStyles(userId);
      setFaceStyles(data);
    } catch (err) {
      console.error("Error fetching face styles:", err);
    }
  };

  const fetchActionStyles = async (userId: string) => {
    try {
      const data = await getActionStyles(userId);
      setActionStyles(data);
    } catch (err) {
      console.error("Error fetching action styles:", err);
    }
  };

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (activeTab === "image") {
            if (
              hasMoreHistory &&
              !isFetchingRef.current &&
              !loadingHistory &&
              !loadingMoreHistory &&
              (history || []).length > 0
            ) {
              fetchHistory(user, true);
            }
          } else if (activeTab === "video") {
            if (
              hasMoreVideoHistory &&
              !videoIsFetchingRef.current &&
              !loadingVideoHistory &&
              !loadingMoreVideoHistory &&
              (videoHistory || []).length > 0
            ) {
              fetchVideoHistory(user, true);
            }
          }
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    activeTab,
    hasMoreHistory,
    hasMoreVideoHistory,
    loadingHistory,
    loadingMoreHistory,
    loadingVideoHistory,
    loadingMoreVideoHistory,
    user?.id,
    (history || []).length,
    (videoHistory || []).length,
  ]);

  const fetchHistory = async (
    userInfo: SupabaseUser | null,
    isLoadMore = false
  ) => {
    const userToFetch = userInfo || user;
    if (!userToFetch?.id) return;

    // Use synchronous ref lock to prevent duplicate concurrent requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isLoadMore) {
      setLoadingMoreHistory(true);
    } else {
      setLoadingHistory(true);
    }

    try {
      const pageToFetch = isLoadMore ? historyPage + 1 : 0;
      const from = pageToFetch * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("generated_prompts")
        .select("*")
        .eq("user_id", userToFetch.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      const historyData = data || [];

      if (isLoadMore) {
        setHistory((prev) => {
          const existingIds = new Set((prev || []).map((item) => item.id));
          const uniqueNewItems = historyData.filter(
            (item) => !existingIds.has(item.id)
          );
          return [...(prev || []), ...uniqueNewItems];
        });
        setHistoryPage(pageToFetch);
      } else {
        setHistory(historyData);
        setHistoryPage(0);
        // 如果当前是图片 Tab，且没有当前内容，则初始化
        if (activeTab === "image" && !response && historyData.length > 0) {
          loadHistoryItem(historyData[0]);
        }
      }
      setHasMoreHistory(historyData.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingMoreHistory(false);
      setLoadingHistory(false);
      isFetchingRef.current = false;
    }
  };

  const fetchVideoHistory = async (
    userInfo: SupabaseUser | null,
    isLoadMore = false
  ) => {
    const userToFetch = userInfo || user;
    if (!userToFetch?.id) return;

    if (videoIsFetchingRef.current) return;
    videoIsFetchingRef.current = true;

    if (isLoadMore) {
      setLoadingMoreVideoHistory(true);
    } else {
      setLoadingVideoHistory(true);
    }

    try {
      const pageToFetch = isLoadMore ? videoHistoryPage + 1 : 0;
      const from = pageToFetch * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("generated_video_prompts")
        .select("*")
        .eq("user_id", userToFetch.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      const historyData = data || [];

      if (isLoadMore) {
        setVideoHistory((prev) => {
          const existingIds = new Set((prev || []).map((item) => item.id));
          const uniqueNewItems = historyData.filter(
            (item) => !existingIds.has(item.id)
          );
          return [...(prev || []), ...uniqueNewItems];
        });
        setVideoHistoryPage(pageToFetch);
      } else {
        setVideoHistory(historyData);
        setVideoHistoryPage(0);
        // 如果当前是视频 Tab，且没有当前内容，则初始化
        if (
          activeTab === "video" &&
          videoResults.length === 0 &&
          historyData.length > 0
        ) {
          loadHistoryItem(historyData[0]);
        }
      }
      setHasMoreVideoHistory(historyData.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching video history:", error);
    } finally {
      setLoadingMoreVideoHistory(false);
      setLoadingVideoHistory(false);
      videoIsFetchingRef.current = false;
    }
  };

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const generatePrompt = async () => {
    if (generating) return;
    if (!user) {
      if (!canGuestUseAI()) {
        openAuthModal("login");
        toast.error("今日游客试用次数已达上限，请登录后继续使用");
        return;
      }
    }

    if (images.length === 0) return;

    // Capture current images reference
    const currentImages = [...images];
    if (currentImages.length === 0) return;

    setGenerating(true);
    setResponse("");
    setProgress(0);
    // Clear input UI immediately (Mimic image-to-text)
    setImages([]);
    analytics.trackClick("prompt_reverse_btn", {
      active_tab: activeTab,
    });

    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 96) return prev;
        // 0-70%: +2 (35 steps * 0.2s = 7s)
        // 70-96%: +1 (26 steps * 0.2s = 5.2s)
        // Total: ~12.2s
        const increment = prev < 70 ? 2 : 1;
        return Math.min(prev + increment, 96);
      });
    }, 200);

    const imgFile = currentImages[0];
    const localUrl = URL.createObjectURL(imgFile);
    const optimisticId = `optimistic-${Date.now()}`;

    // Immediately show the image and add an optimistic entry to history
    setCurrentImageUrl(localUrl);
    if (user) {
      const optimisticItem = {
        id: optimisticId,
        user_id: user.id,
        image_url: localUrl,
        prompt_result: "",
        title: "全案解析",
        style_tags: "", // Will be updated later
        created_at: new Date().toISOString(),
        is_submitted: false,
        is_optimistic: true, // Tag it as optimistic
      };
      setHistory((prev) => [optimisticItem, ...(prev || [])]);
      setCurrentHistoryId(optimisticId);
    }

    try {
      // 1. Define Parallel Tasks: Upload and AI Analysis
      const uploadTask = (async () => {
        const compressedFile = await compressImage(imgFile);
        const fileHash = await calculateFileHash(compressedFile);
        const fileExt = compressedFile.name.split(".").pop() || "jpg";
        const fileName = `${fileHash}.${fileExt}`;
        const filePath = `public/${fileName}`;

        // Attempt direct upload without existence check (Conflict check happens naturally)
        const { data: uploadData, error: uploadError } =
          await uploadFileServerAPI({
            file: compressedFile,
            name: filePath,
          });

        if (uploadError) {
          // If conflict (409) or other errors, try to just get the URL if it already exists
          const { data: publicUrlData } = supabase.storage
            .from(defaultBucket)
            .getPublicUrl(filePath);
          return publicUrlData.publicUrl;
        }

        if (uploadData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from(defaultBucket)
            .getPublicUrl(uploadData.path);
          return publicUrlData.publicUrl;
        }
        return null;
      })();

      const aiTask = (async () => {
        let processedText = "";
        if (analyzeFace && activeTab === "image") {
          processedText = await analyzeFaceFromImage(imgFile);
        } else {
          const isUsingFaceStyle = selectedFaceId !== "default";

          const customFace = faceStyles.find((s) => s.id === selectedFaceId);
          const customAction = actionStyles.find(
            (s) => s.id === selectedActionId
          );
          const rawText = await reversingPromptFromImages(
            imgFile,
            selectedStyle && selectedStyle !== "default"
              ? PROMPT_STYLES.find((s) => s.id === selectedStyle)?.name
              : undefined,
            personStyle,
            customFace?.description,
            customAction?.description,
            isRefined
          );

          processedText = rawText.data || rawText; // Support both old and new response structures
          try {
            const parsed =
              typeof rawText === "string" ? JSON.parse(rawText) : rawText;
            if (parsed.prompt) {
              if (
                typeof parsed.prompt === "string" &&
                parsed.prompt.startsWith("{")
              ) {
                const nested = JSON.parse(parsed.prompt);
                processedText = nested.prompt || parsed.prompt;
              } else {
                processedText = parsed.prompt;
              }
            }
          } catch (e) { }
        }
        return processedText;
      })();

      // 2. Start Parallel Execution
      const [uploadedUrl, analysisResult] = await Promise.all([
        uploadTask,
        aiTask,
      ]);

      if (!uploadedUrl) throw new Error("圖片存儲失败");
      setCurrentImageUrl(uploadedUrl);

      const processedText =
        typeof analysisResult === "string"
          ? analysisResult
          : JSON.stringify(analysisResult);

      // Complete progress
      clearInterval(interval);
      setProgress(100);

      // Small delay to show 100%
      await new Promise((resolve) => setTimeout(resolve, 300));
      setResponse(processedText);

      if (!user) {
        incrementGuestUsage();
        toast.info(`今日剩余试用次数: ${getRemainingGuestUsage()}`);
        localStorage.setItem(
          "last_guest_prompt_result",
          JSON.stringify({
            response: processedText,
            url: uploadedUrl,
          })
        );
      }

      // 4. Collect Style Tags
      const tags: string[] = [];
      const customFaceName = faceStyles.find(
        (s) => s.id === selectedFaceId
      )?.name;
      const customActionName = actionStyles.find(
        (s) => s.id === selectedActionId
      )?.name;
      const customStyleName =
        selectedStyle === "custom"
          ? customStyleText
          : PROMPT_STYLES.find((s) => s.id === selectedStyle)?.name;
      // Add Person Style
      const matchedVersion = versions.find((v) => v.key === personStyle);
      if (personStyle && matchedVersion) {
        tags.push(matchedVersion.title);
      }
      if (customFaceName && selectedFaceId !== "default")
        tags.push(customFaceName);
      if (customActionName && selectedActionId !== "default")
        tags.push(customActionName);
      if (customStyleName && selectedStyle !== "default")
        tags.push(customStyleName);
      if (!isRefined) {
        tags.push("complete");
      }

      const styleTagsString = tags.join(" · ");

      // 5. Save to Database
      const insertPayload = {
        user_id: user?.id || null,
        image_url: uploadedUrl,
        prompt_result: processedText,
        title: "全案解析",
        style_tags: styleTagsString || null,
      };

      const { data: savedData, error: dbError } = user
        ? await supabase
          .from("generated_prompts")
          .insert(insertPayload)
          .select()
          .single()
        : await supabase.from("generated_prompts").insert(insertPayload);

      if (dbError) {
        console.warn("Guest save failed (likely RLS or network)", dbError);
        // Don't throw for guests, just let them see the result
        if (user) {
          // Remove optimistic item if failed
          setHistory((prev) =>
            (prev || []).filter((h) => h.id !== optimisticId)
          );
          throw dbError;
        }
      } else {
        if (user) {
          const newSavedItem = { ...savedData, is_submitted: false };
          setCurrentHistoryId(newSavedItem.id);
          // Replace optimistic item with real data
          setHistory((prev) =>
            (prev || []).map((h) => (h.id === optimisticId ? newSavedItem : h))
          );
          setHasMoreHistory(true); // Ensure it can still load more if needed

          // 刷新用户 profile 以更新余额
          useUserStore.getState().fetchProfile(user);
        }
      }
    } catch (error) {
      clearInterval(interval);
      if (user) {
        setHistory((prev) => (prev || []).filter((h) => h.id !== optimisticId));
      }
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "重试失败");
    } finally {
      setGenerating(false);
      URL.revokeObjectURL(localUrl);
    }
  };

  const generateVideoPrompt = async () => {
    if (generating) return;
    if (!user) {
      if (!canGuestUseAI()) {
        openAuthModal("login");
        toast.error("今日游客试用次数已达上限，请登录后继续使用");
        return;
      }
    }

    if (images.length === 0) return;
    const currentImages = [...images];
    setGenerating(true);
    setVideoResults([]);
    setProgress(0);
    setImages([]);
    analytics.trackClick("video_prompt_reverse_btn");

    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 96) return prev;
        const increment = prev < 70 ? 2 : 1;
        return Math.min(prev + increment, 96);
      });
    }, 200);

    const imgFile = currentImages[0];
    const localUrl = URL.createObjectURL(imgFile);
    const optimisticId = `optimistic-video-${Date.now()}`;

    // Immediately show the image and add optimistic entry
    setCurrentImageUrl(localUrl);
    if (user) {
      const optimisticItem = {
        id: optimisticId,
        user_id: user.id,
        image_url: localUrl,
        results: [],
        title: "视频解析",
        created_at: new Date().toISOString(),
        is_submitted: false,
        is_optimistic: true,
      };
      setVideoHistory((prev) => [optimisticItem, ...(prev || [])]);
      setCurrentHistoryId(optimisticId);
    }

    try {
      const compressedFile = await compressImage(imgFile);

      // 1. Upload to Storage
      const fileHash = await calculateFileHash(compressedFile);
      const fileExt = compressedFile.name.split(".").pop() || "jpg";
      const fileName = `${fileHash}.${fileExt}`;
      const filePath = `public/video_${fileName}`;

      let currentUploadedPath = null;
      const { data: existingFiles } = await supabase.storage
        .from(defaultBucket)
        .list("public", { search: `video_${fileName}` });

      if (existingFiles && existingFiles.length > 0) {
        const { data: publicUrlData } = supabase.storage
          .from(defaultBucket)
          .getPublicUrl(filePath);
        currentUploadedPath = publicUrlData.publicUrl;
      } else {
        const { data: uploadData, error: uploadError } =
          await uploadFileServerAPI({
            file: compressedFile,
            name: filePath,
          });
        if (uploadError) throw uploadError;
        if (uploadData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from(defaultBucket)
            .getPublicUrl(uploadData.path);
          currentUploadedPath = publicUrlData.publicUrl;
        }
      }

      if (!currentUploadedPath) throw new Error("圖片存儲失敗");
      setCurrentImageUrl(currentUploadedPath);

      // 2. AI Generate Video Prompts
      const results = await generateVideoPrompts([imgFile]);

      clearInterval(interval);
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));

      setVideoResults(results);
      setSelectedVideoStyleIndex(0);

      if (!user) {
        incrementGuestUsage();
        toast.info(`今日试用次数剩余: ${getRemainingGuestUsage()}`);
        // Save for persistence
        localStorage.setItem(
          "last_guest_video_prompt_result",
          JSON.stringify({
            results: results,
            url: currentUploadedPath,
          })
        );
      }

      // 3. Save to Database
      const insertPayload = {
        user_id: user?.id || null,
        image_url: currentUploadedPath,
        results: results,
        title: "视频解析",
      };

      const { data: savedData, error: dbError } = user
        ? await supabase
          .from("generated_video_prompts")
          .insert(insertPayload)
          .select()
          .single()
        : await supabase.from("generated_video_prompts").insert(insertPayload);

      if (dbError) {
        console.warn("Guest video save failed", dbError);
        if (user) {
          setVideoHistory((prev) =>
            (prev || []).filter((h) => h.id !== optimisticId)
          );
          throw dbError;
        }
      } else {
        if (user) {
          // Replace optimistic item
          setVideoHistory((prev) =>
            (prev || []).map((h) => (h.id === optimisticId ? savedData : h))
          );
          setCurrentHistoryId(savedData.id);

          // 刷新用户 profile 以更新余额
          useUserStore.getState().fetchProfile(user);
        }
      }
      toast.success("视频提示词生成完成");
    } catch (error) {
      clearInterval(interval);
      if (user) {
        setVideoHistory((prev) =>
          (prev || []).filter((h) => h.id !== optimisticId)
        );
      }
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "重试失败");
    } finally {
      setGenerating(false);
      URL.revokeObjectURL(localUrl);
    }
  };

  const handleGenerate = () => {
    if (activeTab === "image") {
      generatePrompt();
    } else {
      generateVideoPrompt();
    }
  };

  const loadHistoryItem = (item: any) => {
    setCurrentImageUrl(item.image_url);
    setCurrentHistoryId(item.id);

    // 如果是视频提示词记录
    if (item.results && Array.isArray(item.results)) {
      setActiveTab("video");
      setVideoResults(item.results);
      setSelectedVideoStyleIndex(0);
      setResponse(""); // 清空图片反推结果
    } else {
      // 如果是图片反向提示词记录
      setActiveTab("image");
      let text = item.prompt_result || item.result;
      try {
        if (text.startsWith("{")) {
          const parsed = JSON.parse(text);
          text = parsed.prompt || text;
        }
      } catch (e) { }
      setResponse(typeof text === "string" ? text : JSON.stringify(text));
      setVideoResults([]); // 清空视频结果
    }
  };

  const deleteHistoryItem = async () => {
    if (!user || !deleteId) return;
    try {
      const { error } = await supabase
        .from("generated_prompts")
        .delete()
        .eq("id", deleteId)
        .eq("user_id", user.id);

      if (error) throw error;
      setHistory((prev) => (prev || []).filter((item) => item.id !== deleteId));
      toast.success("已移除记录");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("删除失败");
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
    analytics.trackClick("prompt_result_copy", {
      source: "prompt_reverse",
      content_type: "prompt",
    });
  };

  const handleSubmission = async () => {
    if (!user) {
      toast.error("请先登录再进行投稿");
      return;
    }
    if (!response || !currentImageUrl) {
      toast.error("内容不完整，无法投稿");
      return;
    }

    setSubmitting(true);
    try {
      // 回退逻辑：如果 currentHistoryId 为空，尝试从历史记录中匹配
      let targetId = currentHistoryId;
      if (!targetId && currentImageUrl) {
        if (activeTab === "image") {
          const matched = history.find((h) => h.image_url === currentImageUrl);
          if (matched) targetId = matched.id;
        } else {
          const matched = videoHistory.find(
            (h) => h.image_url === currentImageUrl
          );
          if (matched) targetId = matched.id;
        }
      }

      console.log("Submitting for ID:", targetId);

      const { error } = await supabase.from("prompt_submissions").insert([
        {
          user_id: user.id,
          image_url: currentImageUrl,
          prompt_result:
            response ||
            (activeTab === "video" ? JSON.stringify(videoResults) : ""),
          status: "pending",
        },
      ]);

      if (error) throw error;

      // 更新生成的记录的状态
      if (targetId) {
        const table =
          activeTab === "image"
            ? "generated_prompts"
            : "generated_video_prompts";

        await supabase
          .from(table)
          .update({ is_submitted: true })
          .eq("id", targetId);

        if (activeTab === "image") {
          setHistory((prev) =>
            (prev || []).map((item) =>
              item.id === targetId ? { ...item, is_submitted: true } : item
            )
          );
        } else {
          setVideoHistory((prev) =>
            (prev || []).map((item) =>
              item.id === targetId ? { ...item, is_submitted: true } : item
            )
          );
        }
      }

      toast.success("投稿成功！感谢您的贡献");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("投稿失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-transparent flex flex-col font-sans selection:bg-purple-100 selection:text-purple-900 pt-20">
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-8 flex flex-col md:flex-row gap-8 overflow-hidden">
        {/* Left Sidebar: History */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 gap-4 h-full overflow-y-auto pr-2 scrollbar-hide">
          <div className="flex flex-col gap-3">
            {activeTab === "image"
              ? (history || []).map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.is_optimistic && loadHistoryItem(item)}
                  className={cn(
                    "p-3 rounded-xl border shadow-sm transition-all group flex gap-3 items-start relative overflow-hidden",
                    item.id === currentHistoryId
                      ? "bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-500/30"
                      : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-purple-500/30",
                    item.is_optimistic &&
                    "animate-pulse cursor-wait opacity-70"
                  )}
                >
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800">
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 mb-1 font-medium flex items-center justify-between">
                      <span>
                        {item.is_optimistic
                          ? "生成中..."
                          : new Date(item.created_at).toLocaleString(
                            "zh-CN",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                      </span>
                    </p>
                    {item.style_tags && (
                      <p className="text-[9px] text-purple-600/60 dark:text-purple-400/60 mb-1 font-bold line-clamp-1">
                        {item.style_tags}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-zinc-500 font-mono line-clamp-2 leading-snug">
                      {item.prompt_result ||
                        item.result ||
                        (item.is_optimistic
                          ? "正在深度解析视觉特征..."
                          : "无详情信息")}
                    </p>
                  </div>
                  {!item.is_optimistic && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
              : (videoHistory || []).map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.is_optimistic && loadHistoryItem(item)}
                  className={cn(
                    "p-3 rounded-xl border shadow-sm transition-all group flex gap-3 items-start relative overflow-hidden",
                    item.id === currentHistoryId
                      ? "bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-500/30"
                      : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-purple-500/30",
                    item.is_optimistic &&
                    "animate-pulse cursor-wait opacity-70"
                  )}
                >
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800">
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 mb-1 font-medium flex items-center justify-between">
                      <span>
                        {item.is_optimistic
                          ? "分析中..."
                          : new Date(item.created_at).toLocaleString(
                            "zh-CN",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 font-mono line-clamp-2 leading-snug">
                      视频解析:{" "}
                      {item.results?.[0]?.title ||
                        (item.is_optimistic ? "正在分析素材..." : "未命名")}
                    </p>
                  </div>
                  {!item.is_optimistic && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}

            {/* Pagination Trigger */}
            <div
              ref={observerTarget}
              className="h-10 flex items-center justify-center py-4 shrink-0"
            >
              {((activeTab === "image" && loadingMoreHistory) ||
                (activeTab === "video" && loadingMoreVideoHistory)) && (
                  <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                )}
              {((activeTab === "image" &&
                !hasMoreHistory &&
                (history || []).length > 0) ||
                (activeTab === "video" &&
                  !hasMoreVideoHistory &&
                  (videoHistory || []).length > 0)) && (
                  <span className="text-[10px] text-gray-300">
                    没有更多历史记录了
                  </span>
                )}
            </div>
          </div>

          <AlertDialog
            open={!!deleteId}
            onOpenChange={(open) => !open && setDeleteId(null)}
          >
            <AlertDialogContent className="rounded-2xl max-w-[400px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">
                  确认删除记录？
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-500">
                  此操作将永久移除该条解析记录，且无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-3">
                <AlertDialogCancel className="rounded-xl border-gray-100 px-6 py-2">
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteHistoryItem}
                  className="rounded-xl bg-red-500 hover:bg-red-600 px-6 py-2 text-white border-none"
                >
                  确认移除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto w-full relative">
          {/* Header Section - Fixed on PC, Scrolling on H5 */}
          <div className="hidden md:block text-center shrink-0 mb-8 space-y-3 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-3 h-3" />
              Reverse Lab
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-zinc-100 tracking-tight italic">
              PROMPT REVERSE
            </h1>
            {!user && (
              <div className="flex justify-center mt-2">
                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  今日游客试用剩余: {getRemainingGuestUsage()} 次
                </span>
              </div>
            )}
            <p className="text-gray-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed text-sm">
              AI 深度洞察视觉意境，为你还原{" "}
              <span className="text-gray-900 dark:text-zinc-100 font-semibold border-b-2 border-purple-500/30">
                商業級別
              </span>{" "}
              提示词，精准捕捉光影、构图与艺术灵魂
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-6 md:gap-8 scrollbar-hide">
            {/* Header Section for H5 - Scrolling */}
            <div className="md:hidden text-center shrink-0 mb-4 space-y-2 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                Reverse Lab
              </div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight italic">
                PROMPT REVERSE
              </h1>
              {!user && (
                <div className="flex justify-center mt-1">
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    今日游客试用剩余: {getRemainingGuestUsage()} 次
                  </span>
                </div>
              )}
              <p className="text-gray-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed text-xs">
                AI 深度洞察视觉意境，为你还原{" "}
                <span className="text-gray-900 dark:text-zinc-100 font-semibold border-b-2 border-purple-500/30">
                  商業級別
                </span>{" "}
                提示词
              </p>
            </div>

            {generating ||
              (activeTab === "image"
                ? response
                : (videoResults || []).length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-500">
                <div className="md:col-span-4">
                  <ImageActionMenu
                    imageUrl={currentImageUrl || ""}
                    downloadName="image-to-prompt"
                  >
                    <div className="w-full max-w-[280px] mx-auto md:mx-0 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-gray-100 dark:border-zinc-800 flex flex-col transition-transform hover:-translate-y-1 duration-300 h-full min-h-[300px] md:min-h-[350px] cursor-context-menu">
                      <div className="relative flex-1 bg-gray-100 overflow-hidden">
                        {currentImageUrl ? (
                          <>
                            <img
                              src={currentImageUrl}
                              alt="Preview"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            {generating && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px] transition-all">
                                <div className="relative flex items-center justify-center">
                                  {/* Progress Ring or Similar visual if needed, but text is requested */}
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
                                  {activeTab === "image"
                                    ? "Parsing Features"
                                    : "Analyzing Frames"}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-zinc-800/10 gap-3">
                            <span className="text-4xl md:text-5xl font-bold text-purple-600 animate-pulse">
                              {progress}%
                            </span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider border border-white/10">
                          {generating ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              Processing...
                            </span>
                          ) : (
                            "Reference Image"
                          )}
                        </div>
                      </div>
                    </div>
                  </ImageActionMenu>
                </div>
                <div className="md:col-span-8 flex flex-col gap-4">
                  {generating ? (
                    // Skeleton Screen during Generation
                    <section className="space-y-4 relative">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-30 rounded-xl border border-gray-100 dark:border-zinc-800/50 shadow-sm -mx-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {activeTab === "image"
                            ? "Analysing Prompt..."
                            : "Analysing Video..."}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 rounded-3xl md:rounded-4xl p-4 md:p-6 shadow-xl border border-gray-100 dark:border-zinc-800">
                        <div className="space-y-4">
                          <div className="h-4 w-24 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
                          <div className="space-y-3 p-5 bg-gray-50/50 dark:bg-zinc-950/50 rounded-2xl border border-gray-100/50 dark:border-zinc-800/30">
                            <div className="h-4 w-full bg-gray-200/50 dark:bg-zinc-800/50 rounded animate-pulse" />
                            <div className="h-4 w-full bg-gray-200/50 dark:bg-zinc-800/50 rounded animate-pulse" />
                            <div className="h-4 w-3/4 bg-gray-200/50 dark:bg-zinc-800/50 rounded animate-pulse" />
                          </div>
                        </div>
                        {activeTab === "video" && (
                          <div className="mt-8 space-y-4">
                            <div className="h-4 w-32 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
                            <div className="h-20 w-full bg-purple-50/30 dark:bg-purple-950/10 rounded-2xl animate-pulse" />
                          </div>
                        )}
                      </div>
                    </section>
                  ) : activeTab === "image" ? (
                    <section className="space-y-4 relative">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-30 rounded-xl border border-gray-100 dark:border-zinc-800/50 shadow-sm -mx-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          Prompt Result
                        </span>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const currentItem = (history || []).find(
                              (h) => h.id === currentHistoryId
                            );
                            const isSubmitted = currentItem?.is_submitted;

                            return (
                              !isSubmitted && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={submitting}
                                  onClick={handleSubmission}
                                  className="h-8 rounded-lg text-[10px] md:text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 hover:scale-105 active:scale-95 transition-all duration-200 gap-1.5"
                                >
                                  {submitting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  投稿
                                </Button>
                              )
                            );
                          })()}
                          <CopyButton
                            text={response}
                            label="复制结果"
                            theme="purple"
                            className="h-8 rounded-lg text-[10px] md:text-xs font-bold"
                            iconSize={14}
                          />
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 rounded-3xl md:rounded-4xl p-4 md:p-6 shadow-xl border border-gray-100 dark:border-zinc-800">
                        <div className="max-h-[300px] md:max-h-[500px] overflow-y-auto scrollbar-hide rounded-2xl">
                          <pre className="p-4 md:p-5 bg-gray-50/50 dark:bg-zinc-950/50 text-[11px] md:text-[12px] font-mono text-gray-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed border border-gray-100/50 dark:border-zinc-800/30">
                            {JSON.stringify(response)}
                          </pre>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="space-y-4">
                      {/* Video Style Tabs */}
                      <div className="flex items-center gap-1.5 p-1 bg-gray-50 dark:bg-zinc-800/50 rounded-xl overflow-x-auto scrollbar-hide border border-gray-100 dark:border-zinc-800/50">
                        {(videoResults || []).map((v, i) => (
                          <button
                            key={v.type}
                            onClick={() => setSelectedVideoStyleIndex(i)}
                            className={`flex-1 min-w-[80px] px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedVideoStyleIndex === i
                              ? "bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm border border-purple-100/50 dark:border-purple-500/20"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
                              }`}
                          >
                            {v.title}
                          </button>
                        ))}
                      </div>

                      {/* Video Content Card */}
                      {videoResults[selectedVideoStyleIndex] && (
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 md:p-6 shadow-xl border border-gray-100 dark:border-zinc-800 space-y-6">
                          {/* Core Prompt */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" />
                                Core Prompt (EN)
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const res =
                                    videoResults[selectedVideoStyleIndex];
                                  const text = `【核心提示词】\n${res.prompt}\n\n【负面提示词】\n${res.negative_prompt}`;
                                  copyToClipboard(text);
                                }}
                                className="h-7 px-2 text-[10px] font-bold text-gray-400 hover:text-purple-600"
                              >
                                <Copy className="w-3.5 h-3.5 mr-1" /> 复制全部
                              </Button>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-zinc-950/50 rounded-xl border border-gray-100 dark:border-zinc-800/30">
                              <p className="text-xs md:text-[13px] font-mono text-gray-600 dark:text-zinc-400 leading-relaxed italic">
                                {
                                  videoResults?.[selectedVideoStyleIndex]
                                    ?.prompt
                                }
                              </p>
                            </div>
                          </div>

                          {/* Negative Prompt */}
                          <div className="space-y-3">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                              <X className="w-3.5 h-3.5" />
                              Negative Prompt
                            </span>
                            <div className="p-3 bg-red-50/30 dark:bg-red-950/10 rounded-xl border border-red-100/30">
                              <p className="text-[11px] font-mono text-red-500/80 leading-relaxed">
                                {
                                  videoResults?.[selectedVideoStyleIndex]
                                    ?.negative_prompt
                                }
                              </p>
                            </div>
                          </div>

                          {/* Generation Tips */}
                          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/10 rounded-2xl border border-purple-100/50 dark:border-purple-900/20">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 p-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <ScanSearch className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                                  使用建议 / Optimization Tips
                                </p>
                                <p className="text-[11px] text-purple-600/80 dark:text-purple-400/70 leading-relaxed">
                                  {
                                    videoResults?.[selectedVideoStyleIndex]
                                      ?.tips
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 opacity-40">
                <div className="w-24 h-24 rounded-4xl border-2 border-dashed border-gray-200 dark:border-zinc-800 flex items-center justify-center mb-4">
                  <ScanSearch className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  {activeTab === "image"
                    ? "上传图片即可精准还原 Prompt"
                    : "开启属于你的 AI 电影时代"}
                </p>
              </div>
            )}
          </div>

          <ImageInput
            images={images}
            onImagesChange={setImages}
            generating={generating}
            onGenerate={handleGenerate}
            pointsCost={imageCost}
            user={user}
            canGuestUse={canGuestUseAI()}
            onAuthOpen={() => openAuthModal("login")}
            onNavigateToNano={() => navigate("/generate")}
            maxImages={1}
            placeholder={
              activeTab === "image"
                ? "上传一张参考图，AI 将为你精准还原 Prompt..."
                : "上传参考图，开启 AI 视频创作灵感..."
            }
            headerRight={
              activeTab === "image" && (
                <div className="flex items-center gap-3">
                  <Select
                    value={personStyle}
                    onValueChange={(val) => setPersonStyle(val)}
                  >
                    <SelectTrigger
                      size="sm"
                      hideIcon
                      className={cn(
                        "h-7 w-[80px] justify-center px-0 rounded-full text-[10px] font-bold transition-all border outline-none",
                        personStyle &&
                          !versions.find((v) => v.key === personStyle)?.default
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-500/30"
                          : "bg-gray-50 dark:bg-zinc-800 text-gray-500 border-gray-100 dark:border-zinc-700"
                      )}
                    >
                      <SelectValue placeholder="人物风格">
                        {versions.find((v) => v.key === personStyle)?.title ||
                          "人物风格"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      side="top"
                      align="end"
                      className="rounded-xl"
                    >
                      {(() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const mainVersions = versions.filter(
                          (v: any) => !v.more
                        );
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const moreVersions = versions.filter(
                          (v: any) => v.more
                        );

                        return (
                          <>
                            {mainVersions.map((v: any) => (
                              <SelectItem
                                key={v.key}
                                value={v.key}
                                className="text-xs"
                              >
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    {v.title}
                                    {v.default && (
                                      <span className="px-1 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold border border-indigo-100 dark:border-indigo-500/20 leading-none">
                                        default
                                      </span>
                                    )}
                                  </div>
                                  {v.description && (
                                    <span className="text-[9px] text-gray-400 font-normal leading-tight opacity-60">
                                      {v.description}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                            {moreVersions.length > 0 && (
                              <>
                                <SelectSeparator className="my-1 bg-gray-100 dark:bg-zinc-800" />
                                {!showMoreModels ? (
                                  <div
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setShowMoreModels(true);
                                    }}
                                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-xs outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 justify-center font-medium transition-colors"
                                  >
                                    展开更多模型
                                  </div>
                                ) : (
                                  <SelectGroup>
                                    <SelectLabel className="text-[10px] text-gray-400 font-medium px-2 py-1.5 flex items-center justify-between">
                                      <span>更多模型</span>
                                    </SelectLabel>
                                    {moreVersions.map((v: any) => (
                                      <SelectItem
                                        key={v.key}
                                        value={v.key}
                                        className="text-xs"
                                      >
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1.5">
                                            {v.title}
                                          </div>
                                          {v.description && (
                                            <span className="text-[9px] text-gray-400 font-normal leading-tight opacity-60">
                                              {v.description}
                                            </span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                )}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSettingsOpen(true)}
                    className="h-8 w-auto min-w-8 p-0 px-2 rounded-full bg-gray-50/50 hover:bg-gray-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all border border-gray-100 dark:border-zinc-700 flex items-center gap-1.5"
                  >
                    {/* Style Tags Display inside button */}
                    <div className="flex items-center gap-1">
                      {selectedFaceId !== "default" &&
                        faceStyles.find((s) => s.id === selectedFaceId) && (
                          <span className="text-[10px] font-bold opacity-60">
                            {
                              faceStyles.find((s) => s.id === selectedFaceId)
                                ?.name
                            }
                          </span>
                        )}
                      {selectedActionId !== "default" &&
                        actionStyles.find((s) => s.id === selectedActionId) && (
                          <span className="text-[10px] font-bold opacity-60 flex items-center gap-1">
                            {selectedFaceId !== "default" && (
                              <span className="opacity-40">·</span>
                            )}
                            {
                              actionStyles.find(
                                (s) => s.id === selectedActionId
                              )?.name
                            }
                          </span>
                        )}
                      {(selectedStyle === "custom"
                        ? customStyleText
                        : PROMPT_STYLES.find((s) => s.id === selectedStyle)
                          ?.name) &&
                        selectedStyle !== "default" && (
                          <span className="text-[10px] font-bold opacity-60 flex items-center gap-1">
                            {(selectedFaceId !== "default" ||
                              selectedActionId !== "default") && (
                                <span className="opacity-40">·</span>
                              )}
                            {selectedStyle === "custom"
                              ? customStyleText
                              : PROMPT_STYLES.find(
                                (s) => s.id === selectedStyle
                              )?.name}
                          </span>
                        )}
                      {!isRefined && (
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          {(selectedFaceId !== "default" ||
                            selectedActionId !== "default" ||
                            selectedStyle !== "default") && (
                              <span className="opacity-40 text-gray-400">·</span>
                            )}
                          complete
                        </span>
                      )}
                    </div>
                    <Settings2 className="w-4 h-4 shrink-0" />
                  </Button>

                  <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <SheetContent
                      side="right"
                      className="w-[90%] sm:max-w-2xl p-0 flex flex-col border-l-0 sm:border-l border-zinc-100 dark:border-zinc-800"
                    >
                      <SheetHeader className="p-6 pb-4 space-y-4 border-b border-gray-100 dark:border-zinc-800/50">
                        <SheetTitle className="text-base font-black flex items-center gap-2 uppercase tracking-tight text-zinc-900 dark:text-white">
                          <Settings2 className="w-4 h-4 text-purple-500" />
                          生成设置 / Settings
                        </SheetTitle>
                        <div className="flex items-center gap-3 p-1 bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl border border-gray-200/50 dark:border-zinc-700/50">
                          <div className="flex items-center p-0.5 bg-white/50 dark:bg-zinc-900/50 rounded-lg shadow-sm shrink-0">
                            <button
                              onClick={() => setIsRefined(true)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-300",
                                isRefined
                                  ? "bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-zinc-600"
                                  : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
                              )}
                            >
                              <Sparkles
                                className={cn(
                                  "w-3 h-3",
                                  isRefined ? "animate-pulse" : ""
                                )}
                              />
                              精炼提示词
                            </button>
                            <button
                              onClick={() => setIsRefined(false)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-300",
                                !isRefined
                                  ? "bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-zinc-600"
                                  : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
                              )}
                            >
                              <Settings2 className="w-3 h-3" />
                              完整提示词
                            </button>
                          </div>

                          <div className="w-px h-6 bg-gray-200/50 dark:bg-zinc-700/50 shrink-0" />

                          <div className="flex-1 pr-2">
                            <span className="text-[10px] text-gray-500 dark:text-zinc-400 leading-tight block">
                              {isRefined ? (
                                "AI 将为您提炼最核心的视觉描述，严格控制描述长度，生成更精准、更高效的绘图提示词。"
                              ) : (
                                <>
                                  AI 将为您生成详尽的多维度视觉描述。
                                  <strong className="text-red-500 dark:text-red-400 font-bold ml-1">
                                    注意：本网站无法完全展示/容纳完整提示词。
                                  </strong>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </SheetHeader>
                      <div className="flex-1 overflow-y-auto px-6">
                        <div className="flex flex-col gap-6">
                          {/* 1. Face Style */}
                          <div className="space-y-4">
                            <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                              <span>人脸模型 / Face Model</span>
                            </label>
                            <div className="relative">
                              <div className="grid grid-cols-6 gap-2">
                                {/* Default Card */}
                                <div
                                  onClick={() => setSelectedFaceId("default")}
                                  className={cn(
                                    "relative rounded-xl border-2 transition-all cursor-pointer flex flex-col aspect-9/16 overflow-hidden",
                                    selectedFaceId === "default"
                                      ? "bg-purple-50 border-purple-500"
                                      : "bg-gray-50 dark:bg-zinc-800/50 border-transparent hover:border-gray-200"
                                  )}
                                >
                                  <div className="flex-1 w-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center opacity-70">
                                    <User size={32} className="text-gray-400" />
                                  </div>
                                  <div className="h-10 w-full flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-white/50 dark:border-zinc-800">
                                    <span className="text-[11px] font-bold text-gray-500">
                                      默认
                                    </span>
                                  </div>
                                  {selectedFaceId === "default" && (
                                    <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1 shadow-sm">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>

                                {/* Login Entry for Guests */}
                                {!user && (
                                  <div
                                    onClick={() => openAuthModal("login")}
                                    className="relative rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-900/10 hover:border-purple-400 transition-all cursor-pointer flex flex-col aspect-9/16 group overflow-hidden"
                                  >
                                    <div className="flex-1 w-full flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                      <User size={32} />
                                    </div>
                                    <div className="h-10 w-full flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-purple-100 dark:border-purple-800/30 px-2 text-center">
                                      <span className="text-[11px] font-black text-purple-600 dark:text-purple-400">
                                        登录以使用
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Custom Cards */}
                                {faceStyles.map((style) => (
                                  <div
                                    key={style.id}
                                    onClick={() => setSelectedFaceId(style.id)}
                                    className={cn(
                                      "relative rounded-xl border-2 transition-all cursor-pointer flex flex-col aspect-9/16 overflow-hidden",
                                      selectedFaceId === style.id
                                        ? "bg-purple-50 border-purple-500"
                                        : "bg-gray-50 dark:bg-zinc-800/50 border-transparent hover:border-gray-200"
                                    )}
                                  >
                                    <div className="flex-1 w-full overflow-hidden">
                                      {style.avatar_url ? (
                                        <img
                                          src={style.avatar_url}
                                          alt={style.name}
                                          className="w-full h-full object-cover object-top"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center">
                                          <User
                                            size={32}
                                            className="text-gray-400"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div className="h-10 w-full flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-white/50 dark:border-zinc-800 px-2 text-center">
                                      <span className="text-[11px] font-bold text-gray-600 dark:text-zinc-400 truncate w-full">
                                        {style.name}
                                      </span>
                                    </div>
                                    {selectedFaceId === style.id && (
                                      <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1 shadow-sm">
                                        <Check className="w-3 h-3 text-white" />
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {/* Add New Card */}
                                <div
                                  onClick={() => {
                                    if (!user) {
                                      openAuthModal("login");
                                      return;
                                    }
                                    const currentLimit =
                                      MEMBERSHIP_STYLE_LIMITS[membershipCode] ||
                                      1;
                                    if (faceStyles.length >= currentLimit) {
                                      toast.warning(
                                        `当前等级 (${membershipCode}) 限制最多创建 ${currentLimit} 个人脸。升级会员以解锁更多名额！`
                                      );
                                      return;
                                    }
                                    navigate("/face-style");
                                  }}
                                  className="relative rounded-xl border-2 border-dashed border-gray-100 dark:border-zinc-800 hover:border-gray-300 transition-all cursor-pointer flex flex-col aspect-9/16 bg-transparent group overflow-hidden"
                                >
                                  <div className="flex-1 w-full flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                                    <Plus size={32} />
                                  </div>
                                  <div className="h-10 w-full flex items-center justify-center bg-gray-50/50 dark:bg-zinc-800/10 border-t border-gray-100 dark:border-zinc-800/30">
                                    <span className="text-[11px] font-black text-gray-400">
                                      新增人脸
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Action Style */}
                          <div className="space-y-4">
                            <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                              <span>动作模型 / Action Model</span>
                            </label>
                            <div className="relative">
                              <div className="grid grid-cols-6 gap-2">
                                {/* Default Card */}
                                <div
                                  onClick={() => setSelectedActionId("default")}
                                  className={cn(
                                    "relative rounded-xl border-2 transition-all cursor-pointer flex flex-col aspect-9/16 overflow-hidden",
                                    selectedActionId === "default"
                                      ? "bg-purple-50 border-purple-500"
                                      : "bg-gray-50 dark:bg-zinc-800/50 border-transparent hover:border-gray-200"
                                  )}
                                >
                                  <div className="flex-1 w-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center opacity-70">
                                    <Accessibility
                                      size={32}
                                      className="text-gray-400"
                                    />
                                  </div>
                                  <div className="h-10 w-full flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-white/50 dark:border-zinc-800">
                                    <span className="text-[11px] font-bold text-gray-500">
                                      默认
                                    </span>
                                  </div>
                                  {selectedActionId === "default" && (
                                    <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1 shadow-sm">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>

                                {/* Login Entry for Guests */}
                                {!user && (
                                  <div
                                    onClick={() => openAuthModal("login")}
                                    className="relative rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-900/10 hover:border-purple-400 transition-all cursor-pointer flex flex-col aspect-9/16 group overflow-hidden"
                                  >
                                    <div className="flex-1 w-full flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                      <Accessibility size={32} />
                                    </div>
                                    <div className="h-10 w-full flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-purple-100 dark:border-purple-800/30 px-2 text-center">
                                      <span className="text-[11px] font-black text-purple-600 dark:text-purple-400">
                                        登录以使用
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Custom Cards */}
                                {actionStyles.map((style) => (
                                  <div
                                    key={style.id}
                                    onClick={() =>
                                      setSelectedActionId(style.id)
                                    }
                                    className={cn(
                                      "relative rounded-xl border-2 transition-all cursor-pointer flex flex-col aspect-9/16 overflow-hidden",
                                      selectedActionId === style.id
                                        ? "bg-purple-50 border-purple-500"
                                        : "bg-gray-50 dark:bg-zinc-800/50 border-transparent hover:border-gray-200"
                                    )}
                                  >
                                    <div className="flex-1 w-full overflow-hidden">
                                      {style.image_url ? (
                                        <img
                                          src={style.image_url}
                                          alt={style.name}
                                          className="w-full h-full object-cover object-top"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center">
                                          <Accessibility
                                            size={32}
                                            className="text-gray-400"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div className="h-10 w-full flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-white/50 dark:border-zinc-800 px-2 text-center">
                                      <span className="text-[11px] font-bold text-gray-600 dark:text-zinc-400 truncate w-full">
                                        {style.name}
                                      </span>
                                    </div>
                                    {selectedActionId === style.id && (
                                      <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1 shadow-sm">
                                        <Check className="w-3 h-3 text-white" />
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {/* Add New Card */}
                                <div
                                  onClick={() => {
                                    if (!user) {
                                      openAuthModal("login");
                                      return;
                                    }
                                    const currentLimit =
                                      MEMBERSHIP_STYLE_LIMITS[membershipCode] ||
                                      1;
                                    if (actionStyles.length >= currentLimit) {
                                      toast.warning(
                                        `当前等级 (${membershipCode}) 限制最多创建 ${currentLimit} 个动作。升级会员以解锁更多名额！`
                                      );
                                      return;
                                    }
                                    navigate("/action-style");
                                  }}
                                  className="relative rounded-xl border-2 border-dashed border-gray-100 dark:border-zinc-800 hover:border-gray-300 transition-all cursor-pointer flex flex-col aspect-9/16 bg-transparent group overflow-hidden"
                                >
                                  <div className="flex-1 w-full flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                                    <Plus size={32} />
                                  </div>
                                  <div className="h-10 w-full flex items-center justify-center bg-gray-50/50 dark:bg-zinc-800/10 border-t border-gray-100 dark:border-zinc-800/30">
                                    <span className="text-[11px] font-black text-gray-400">
                                      新增动作
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 4. Visual Style */}
                          <div className="space-y-4">
                            <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                              视觉风格 / Visual Style
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                              {PROMPT_STYLES.map((style) => (
                                <div
                                  key={style.id}
                                  onClick={() => setSelectedStyle(style.id)}
                                  className={cn(
                                    "relative rounded-xl border-2 transition-all cursor-pointer flex flex-col aspect-9/16 overflow-hidden",
                                    selectedStyle === style.id
                                      ? "bg-purple-50 border-purple-500"
                                      : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-gray-200"
                                  )}
                                >
                                  <div className="flex-1 w-full overflow-hidden">
                                    <img
                                      src={style.image}
                                      alt={style.name}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  </div>
                                  <div className="h-10 w-full flex flex-col items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-white/50 dark:border-zinc-800 px-1 text-center pointer-events-none">
                                    <span
                                      className={cn(
                                        "text-[11px] font-bold truncate w-full",
                                        selectedStyle === style.id
                                          ? "text-purple-700 dark:text-purple-300"
                                          : "text-gray-700 dark:text-zinc-300"
                                      )}
                                    >
                                      {style.name}
                                    </span>
                                    <span className="text-[9px] text-gray-400 truncate w-full">
                                      {style.description}
                                    </span>
                                  </div>
                                  {selectedStyle === style.id && (
                                    <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1 shadow-sm">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Custom Style Card */}
                              <div
                                onClick={() => setSelectedStyle("custom")}
                                className={cn(
                                  "relative rounded-xl border-2 transition-all cursor-pointer flex flex-col aspect-9/16 overflow-hidden",
                                  selectedStyle === "custom"
                                    ? "bg-purple-50 border-purple-500"
                                    : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-gray-200"
                                )}
                              >
                                <div className="flex-1 w-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                                  <Plus size={32} className="text-gray-400" />
                                </div>
                                <div className="h-10 w-full flex flex-col items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-t border-white/50 dark:border-zinc-800 px-1 text-center pointer-events-none">
                                  <span
                                    className={cn(
                                      "text-[11px] font-bold truncate w-full",
                                      selectedStyle === "custom"
                                        ? "text-purple-700 dark:text-purple-300"
                                        : "text-gray-700 dark:text-zinc-300"
                                    )}
                                  >
                                    自定义
                                  </span>
                                  <span className="text-[9px] text-gray-400 truncate w-full">
                                    输入文字定义
                                  </span>
                                </div>
                                {selectedStyle === "custom" && (
                                  <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1 shadow-sm">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Custom Style Input */}
                            {selectedStyle === "custom" && (
                              <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="relative group">
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500/70 transition-colors">
                                    <Sparkles size={14} />
                                  </div>
                                  <Input
                                    placeholder="输入您想要的视觉风格描述..."
                                    value={customStyleText}
                                    onChange={(e) =>
                                      setCustomStyleText(e.target.value)
                                    }
                                    className="h-9 pl-9 rounded-xl bg-gray-50/50 dark:bg-zinc-800/30 border-gray-100 dark:border-zinc-700/50 text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-purple-300/50 dark:focus:border-purple-500/30 transition-all placeholder:text-gray-400/60 shadow-none focus:shadow-none"
                                  />
                                </div>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mr-1 opacity-80">
                                    灵感:
                                  </span>
                                  {[
                                    "赛博朋克",
                                    "极简主义",
                                    "油画质感",
                                    "写实摄影",
                                    "宫崎骏风",
                                    "黑白艺术",
                                    "蒸汽波",
                                  ].map((tag) => (
                                    <button
                                      key={tag}
                                      onClick={() => setCustomStyleText(tag)}
                                      className={cn(
                                        "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border shadow-none",
                                        customStyleText === tag
                                          ? "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/20 dark:border-purple-500/30 dark:text-purple-400"
                                          : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:border-gray-200"
                                      )}
                                    >
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <SheetFooter className="p-4 border-t border-gray-100 dark:border-zinc-800/50 flex flex-row items-center justify-between gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            resetInputParameters();
                            toast.success("已恢复默认设置");
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 h-9 px-3 rounded-xl font-bold text-[11px] transition-all hover:bg-gray-100 dark:hover:bg-zinc-800/50 flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          恢复默认
                        </Button>
                        <Button
                          onClick={() => setIsSettingsOpen(false)}
                          className="flex-1 max-w-[180px] bg-purple-600 hover:bg-purple-700 text-white border-none h-10 rounded-full font-bold text-[13px] transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                        >
                          保存设置
                        </Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                </div>
              )
            }
            headerLeft={
              <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                <button
                  onClick={() => setActiveTab("image")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5",
                    activeTab === "image"
                      ? "bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-zinc-300"
                  )}
                >
                  <ScanSearch className="w-3 h-3" />
                  图片反推
                </button>
                <button
                  onClick={() => setActiveTab("video")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5",
                    activeTab === "video"
                      ? "bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-zinc-300"
                  )}
                >
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  视频提示词
                </button>
              </div>
            }
          />
        </div>
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
                历史解析
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
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
                        loadHistoryItem(item);
                        setIsHistoryOpen(false);
                      }}
                      className={cn(
                        "p-3 rounded-xl active:scale-95 transition-all flex gap-3 items-start",
                        item.id === currentHistoryId
                          ? "bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-400 dark:border-purple-500/50"
                          : "bg-gray-50 dark:bg-zinc-800 border border-transparent"
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
                        <p className="text-[10px] text-gray-400 mb-1 font-medium">
                          {new Date(item.created_at).toLocaleString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-500 font-mono line-clamp-2 leading-snug">
                          {item.prompt_result || item.result || ""}
                        </p>
                      </div>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptPage;
