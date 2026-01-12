import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
    Sparkles,
    LayoutGrid,
    ChevronDown,
    Video,
    Eraser,
    Wand2,
    Plus,
    History,
    Maximize2,
    Settings2,
    Zap,
    MonitorPlay,
    Loader2,
    Download,
    Trash2,
    Play,
    Clock,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/store/userStore";
import {
    generateVideo,
    saveGeneratedVideo,
    getGeneratedVideoHistory,
    deleteGeneratedVideo
} from "@/servers/ai";
import { toast } from "sonner";

const VideoStudio = () => {
    const { t } = useTranslation(["common"]);
    const { user } = useUserStore();
    const [activeMode, setActiveMode] = useState<"generate" | "convert" | "transition">("generate");
    const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("16:9");
    const [prompt, setPrompt] = useState("");
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);

    // History state
    const [history, setHistory] = useState<any[]>([]);
    const [previewVideo, setPreviewVideo] = useState<string | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Image states
    const [img1, setImg1] = useState<string | null>(null);
    const [img2, setImg2] = useState<string | null>(null);
    const [img1File, setImg1File] = useState<File | null>(null);
    const [img2File, setImg2File] = useState<File | null>(null);

    const fileInputRef1 = useRef<HTMLInputElement>(null);
    const fileInputRef2 = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user?.id) {
            fetchHistory();
        }
    }, [user]);

    const fetchHistory = async () => {
        if (!user?.id) return;
        setLoadingHistory(true);
        try {
            const data = await getGeneratedVideoHistory(user.id);
            setHistory(data || []);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (slot === 1) {
                setImg1(url);
                setImg1File(file);
            } else {
                setImg2(url);
                setImg2File(file);
            }
        }
    };

    const toBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteGeneratedVideo(id);
            setHistory(prev => prev.filter(item => item.id !== id));
            toast.success("删除成功");
        } catch (error: any) {
            toast.error("删除失败");
        }
    };



    const handleRender = async () => {
        if (isRendering) return;
        if (!prompt.trim() && activeMode === "generate") {
            toast.error("请输入创作描述");
            return;
        }
        if ((activeMode === "convert" && !img1File) || (activeMode === "transition" && (!img1File || !img2File))) {
            toast.error("请上传参考图");
            return;
        }

        setIsRendering(true);
        setRenderProgress(10);
        // 清空输入以便对齐生图页面逻辑
        const currentPrompt = prompt;
        setPrompt("");

        try {
            let base64Img1 = "";
            let base64Img2 = "";
            if (img1File) base64Img1 = (await toBase64(img1File)).split(",")[1];
            if (img2File) base64Img2 = (await toBase64(img2File)).split(",")[1];

            setRenderProgress(30);

            const result = await generateVideo({
                prompt: currentPrompt,
                mode: activeMode,
                ratio: aspectRatio,
                img1: base64Img1,
                img2: base64Img2,
                model: "Google Veo"
            });

            setRenderProgress(70);

            if (result && result.video_url) {
                if (user?.id) {
                    await saveGeneratedVideo({
                        user_id: user.id,
                        prompt: currentPrompt,
                        model: "Google Veo",
                        aspect_ratio: aspectRatio,
                        video_url: result.video_url,
                        mode: activeMode,
                        cover_url: result.cover_url
                    });
                    fetchHistory();
                }
                setRenderProgress(100);
                toast.success("视频生成成功");
            } else {
                throw new Error("生成失败，未获取到视频链接");
            }
        } catch (error: any) {
            console.error("Render Error:", error);
            setPrompt(currentPrompt); // 失败时还原
            toast.error(error.message || "生成失败，请稍后重试");
        } finally {
            setIsRendering(false);
            setRenderProgress(0);
        }
    };

    const groupedHistory = useMemo(() => {
        const groups = history.reduce((acc: any, item: any) => {
            const dateKey = item.created_at ? item.created_at.split("T")[0] : "以前";
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(item);
            return acc;
        }, {});

        return Object.entries(groups).sort((a, b) => {
            if (a[0] === "以前") return 1;
            if (b[0] === "以前") return -1;
            return b[0].localeCompare(a[0]);
        });
    }, [history]);

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

    const handleDownload = async (url: string, id: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `video-${id}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            toast.error("下载失败");
        }
    };

    const modes = [
        { id: "generate", label: t("common:video_studio_mode_generate"), icon: Video },
        { id: "convert", label: t("common:video_studio_mode_convert"), icon: Wand2 },
        { id: "transition", label: t("common:video_studio_mode_transition"), icon: Eraser },
    ];

    return (
        <div className="relative w-full min-h-screen bg-transparent text-zinc-900 dark:text-zinc-100 flex flex-col font-sans pt-20">
            {/* Main Feed Content */}
            <main className="w-full flex-1">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-48">

                    {(isRendering || history.length > 0) ? (
                        <div className="flex flex-col gap-12">
                            {/* Generation Skeleton (at the top of current day or first group) */}
                            {isRendering && (
                                <div className="flex flex-col gap-6">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                                            正在渲染
                                        </h2>
                                        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className={cn(
                                            "relative rounded-3xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800",
                                            aspectRatio === "16:9" ? "aspect-video" : "aspect-[9/16]"
                                        )}>
                                            <div className="absolute inset-0 animate-pulse bg-linear-to-br from-purple-500/10 to-transparent" />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                                <div className="relative w-24 h-24 flex items-center justify-center">
                                                    <svg className="w-full h-full -rotate-90">
                                                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-zinc-200 dark:text-zinc-800" />
                                                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={276} strokeDashoffset={276 - (276 * renderProgress) / 100} strokeLinecap="round" className="text-purple-500 transition-all duration-300" />
                                                    </svg>
                                                    <span className="absolute text-xl font-black italic text-zinc-900 dark:text-white">{Math.floor(renderProgress)}%</span>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-600 dark:text-purple-400 animate-pulse">Rendering Studio</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {groupedHistory.map(([dateKey, items]: [string, any]) => (
                                <div key={dateKey} className="flex flex-col gap-8">
                                    {/* Date Header */}
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                                            {formatDateForDisplay(dateKey)}
                                        </h2>
                                        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50" />
                                    </div>

                                    {/* Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {items.map((video: any) => (
                                            <div key={video.id} className="group relative flex flex-col gap-3">
                                                {/* Video Card */}
                                                <div className={cn(
                                                    "relative rounded-[32px] overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50 shadow-xl group-hover:shadow-2xl group-hover:shadow-purple-500/10 transition-all duration-500",
                                                    video.aspect_ratio === "16:9" ? "aspect-video" : "aspect-[9/16]"
                                                )}>
                                                    <img src={video.cover_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />

                                                    {/* Overlays */}
                                                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                                                    {/* Badge */}
                                                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-[9px] font-black text-white/90 uppercase tracking-widest italic flex items-center gap-2">
                                                        <Video className="w-3 h-3" />
                                                        {video.model}
                                                    </div>

                                                    {/* Play Button Icon */}
                                                    <div
                                                        onClick={() => setPreviewVideo(video.video_url)}
                                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100 cursor-pointer"
                                                    >
                                                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-3xl border border-white/30 flex items-center justify-center shadow-2xl">
                                                            <Play className="w-6 h-6 text-white fill-current translate-x-0.5" />
                                                        </div>
                                                    </div>

                                                    {/* Actions Bottom */}
                                                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownload(video.video_url, video.id);
                                                                }}
                                                                className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-3xl border border-white/10 text-white transition-colors"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm("确定要删除这段视频吗？")) {
                                                                    handleDelete(video.id);
                                                                }
                                                            }}
                                                            className="p-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/40 backdrop-blur-3xl border border-rose-500/20 text-rose-200 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Meta Info Below */}
                                                <div className="px-2 space-y-1">
                                                    <p className="text-[13px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed italic">
                                                        "{video.prompt || "无描述"}"
                                                    </p>
                                                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                                                        <span className="flex items-center gap-1">
                                                            <Zap className="w-3 h-3" /> {video.mode}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {new Date(video.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-500 gap-6">
                            <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center animate-in zoom-in duration-500">
                                <MonitorPlay className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                            </div>
                            <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <p className="text-xl font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600">Video Studio</p>
                                <p className="text-sm text-zinc-400/60 font-medium">您的创作将以瀑布流形式在此呈现</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Floating Interaction Bar */}
            <div className="fixed bottom-12 left-0 right-0 z-50 px-6 pointer-events-none">
                <div className="max-w-4xl mx-auto w-full pointer-events-auto">
                    <div className="relative group">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-linear-to-r from-purple-500/20 via-indigo-600/20 to-rose-500/20 rounded-[40px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />

                        <div className="relative flex flex-col bg-white/80 dark:bg-zinc-950/90 backdrop-blur-3xl rounded-[32px] border border-zinc-200 dark:border-zinc-800/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden">
                            {/* Mode & Params Tab */}
                            <div className="px-6 py-2 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    {modes.map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setActiveMode(mode.id as any)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                                                activeMode === mode.id
                                                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black shadow-md"
                                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                            )}
                                        >
                                            <mode.icon className="w-3 h-3" />
                                            <span className="hidden sm:inline">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        {(["9:16", "16:9"] as const).map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => setAspectRatio(r)}
                                                className={cn(
                                                    "text-[10px] font-black tracking-tighter transition-all",
                                                    aspectRatio === r ? "text-purple-600 dark:text-purple-400 scale-110" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                                )}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800" />
                                    <div className="flex items-center gap-2 opacity-60">
                                        <Zap className="w-3 h-3 text-purple-500" />
                                        <span className="text-[9px] font-black text-zinc-500 uppercase">Google Veo</span>
                                    </div>
                                </div>
                            </div>

                            {/* Main Input Area */}
                            <div className="flex items-center gap-4 p-4 min-h-[100px]">
                                {(activeMode === "convert" || activeMode === "transition") && (
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => fileInputRef1.current?.click()}
                                            className="w-16 h-20 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group overflow-hidden relative"
                                        >
                                            {img1 ? (
                                                <img src={img1} className="w-full h-full object-cover" />
                                            ) : (
                                                <Plus className="w-5 h-5 text-zinc-300 group-hover:text-purple-500 transition-colors" />
                                            )}
                                        </button>
                                        <input type="file" className="hidden" ref={fileInputRef1} onChange={(e) => handleFileChange(e, 1)} accept="image/*" />

                                        {activeMode === "transition" && (
                                            <>
                                                <button
                                                    onClick={() => fileInputRef2.current?.click()}
                                                    className="w-16 h-20 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group overflow-hidden relative"
                                                >
                                                    {img2 ? (
                                                        <img src={img2} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Plus className="w-5 h-5 text-zinc-300 group-hover:text-purple-500 transition-colors" />
                                                    )}
                                                </button>
                                                <input type="file" className="hidden" ref={fileInputRef2} onChange={(e) => handleFileChange(e, 2)} accept="image/*" />
                                            </>
                                        )}
                                    </div>
                                )}

                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={
                                        activeMode === "generate" ? t("common:video_studio_placeholder_generate") :
                                            activeMode === "convert" ? t("common:video_studio_placeholder_convert") : t("common:video_studio_placeholder_transition")
                                    }
                                    className="flex-1 bg-transparent border-none text-[15px] text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none resize-none py-2 leading-relaxed"
                                />

                                <div className="flex flex-col items-end gap-3 self-end">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-tighter">10 CR</span>
                                    </div>
                                    <button
                                        onClick={handleRender}
                                        disabled={isRendering}
                                        className="relative group/btn px-8 py-3 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-[11px] font-black uppercase tracking-[0.2em] italic flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        {isRendering ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                {t("common:video_studio_render")}
                                                <Zap className="w-3.5 h-3.5 fill-current" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Video Preview Modal */}
                {previewVideo && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm p-4 md:p-12 animate-in fade-in duration-300"
                        onClick={() => setPreviewVideo(null)}
                    >
                        <div className="relative w-full max-w-6xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setPreviewVideo(null)}
                                className="absolute top-6 right-6 z-10 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-md"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <video
                                src={previewVideo}
                                className="w-full h-full object-contain"
                                controls
                                autoPlay
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoStudio;
