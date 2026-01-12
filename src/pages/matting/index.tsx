import React, { useState, useRef, useEffect } from "react";
import {
    Upload,
    Download,
    Zap,
    ImageIcon,
    Loader2,
    History,
    X,
    Trash2,
    ImagePlus,
    CheckCircle2,
    RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
// @ts-ignore
import { removeBackground } from "@imgly/background-removal";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/supabase";
import { useUserStore } from "@/store/userStore";
import { uploadFileServerAPI, defaultBucket } from "@/servers/upload";
import { compressImage } from "@/lib/imageCompression";

interface HistoryItem {
    id: string;
    original_url: string;
    processed_url: string;
    created_at: string;
}

const MattingPage = () => {
    const { t } = useTranslation(["common"]);
    const { user } = useUserStore();
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null); // This is a Blob URL for display
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<number>(0);
    const [loadingSubtext, setLoadingSubtext] = useState<string>("初始化中...");

    const fileInputRef = useRef<HTMLInputElement>(null);

    // History State
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const fetchHistory = async () => {
        if (!user) {
            setHistory([]);
            return;
        }
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from("pzcreated image")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            setHistory(data || []);
        } catch (e) {
            console.error("Failed to fetch history", e);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchHistory();

        // Cleanup blob URLs on unmount
        return () => {
            if (processedImage && processedImage.startsWith("blob:")) {
                URL.revokeObjectURL(processedImage);
            }
        };
    }, [user?.id]);

    const saveToHistory = async (originalBase64: string, processedBlobUrl: string) => {
        if (!user) return;

        try {
            // 1. Convert Original Base64 to Blob
            const originalRes = await fetch(originalBase64);
            const originalBlob = await originalRes.blob();
            const originalFile = new File([originalBlob], `original_${Date.now()}.png`, { type: "image/png" });

            // 2. Convert Processed Blob URL to Blob
            const processedRes = await fetch(processedBlobUrl);
            const processedBlob = await processedRes.blob();
            const processedFile = new File([processedBlob], `processed_${Date.now()}.png`, { type: "image/png" });

            // 3. Upload Original
            const originalPath = `matting/original/${user.id}/${Date.now()}.png`;
            await uploadFileServerAPI({
                file: originalFile,
                name: originalPath
            });

            // 4. Upload Processed
            const processedPath = `matting/processed/${user.id}/${Date.now()}.png`;
            await uploadFileServerAPI({
                file: processedFile,
                name: processedPath
            });

            // 5. Get Public URLs
            const { data: { publicUrl: originalUrl } } = supabase.storage.from(defaultBucket).getPublicUrl(originalPath);
            const { data: { publicUrl: processedUrl } } = supabase.storage.from(defaultBucket).getPublicUrl(processedPath);

            // 6. DB Insert
            const { error: dbError } = await supabase
                .from("pzcreated image")
                .insert([{
                    user_id: user.id,
                    original_url: originalUrl,
                    processed_url: processedUrl,
                }]);

            if (dbError) throw dbError;

            fetchHistory(); // Refresh
        } catch (e) {
            console.error("Failed to save history", e);
            toast.error("历史记录同步失败");
        }
    };

    const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!user) return;

        try {
            const { error } = await supabase
                .from("pzcreated image")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) throw error;
            setHistory(prev => prev.filter(item => item.id !== id));
            toast.success("删除成功");
        } catch (e) {
            console.error("Failed to delete history", e);
            toast.error("删除失败");
        }
    };

    const loadHistoryItem = (item: HistoryItem) => {
        // Revoke current if blob
        if (processedImage && processedImage.startsWith("blob:")) {
            URL.revokeObjectURL(processedImage);
        }
        setOriginalImage(item.original_url);
        setProcessedImage(item.processed_url);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const url = reader.result as string;
                setOriginalImage(url);

                // Clear previous result
                if (processedImage && processedImage.startsWith("blob:")) {
                    URL.revokeObjectURL(processedImage);
                }
                setProcessedImage(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMatting = async () => {
        if (!originalImage || isProcessing) return;

        setIsProcessing(true);
        setProgress(0);
        setLoadingSubtext("图片预处理中...");

        try {
            // 1. Revoke old blob if any (safety)
            if (processedImage && processedImage.startsWith("blob:")) {
                URL.revokeObjectURL(processedImage);
            }

            // 2. Pre-process image (Scale down for stability)
            // Excessive resolution (like 4K) is the main reason for browser freeze.
            // 1280px is a sweet spot for quality vs performance.
            const response = await fetch(originalImage);
            const rawBlob = await response.blob();
            const rawFile = new File([rawBlob], "input.png", { type: rawBlob.type });

            const compressedFile = await compressImage(rawFile, 10, 1280); // Max 10MB, Max 1280px
            setLoadingSubtext("准备 AI 资源...");

            // 3. Process with AI
            const blob = await removeBackground(compressedFile, {
                progress: (key: string, current: number, total: number) => {
                    const percent = Math.round((current / total) * 100);
                    setProgress(percent);
                    if (key.includes("fetch")) setLoadingSubtext(`下载模型: ${percent}%`);
                    else if (key.includes("compute")) setLoadingSubtext(`AI 处理中: ${percent}%`);
                    else setLoadingSubtext(`正在处理... ${percent}%`);
                },
                // Optional: model: "small" or "medium" if stability is priority over hair-line precision
                // fetchArgs: { mode: 'no-cors' }
            });

            // 4. Create URL
            const url = URL.createObjectURL(blob);
            setProcessedImage(url);

            // 5. Save
            await saveToHistory(originalImage, url);
            toast.success(t("common:matting_success"));

        } catch (error: any) {
            console.error("Matting Error:", error);
            // Check for specific errors like memory
            const errorMsg = error.message || "";
            if (errorMsg.includes("out of memory")) {
                toast.error("图片过大，内存溢出，请尝试更小的图片");
            } else {
                toast.error("处理失败，请刷新页面或尝试减少图片分辨率");
            }
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleDownload = async (urlToDownload?: string) => {
        const targetUrl = urlToDownload || processedImage;
        if (!targetUrl) return;

        const link = document.createElement("a");
        link.href = targetUrl;
        link.download = `matting-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 pt-24 pb-12 font-sans text-zinc-100">

            {/* Header Section */}
            <div className="text-center space-y-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">
                    智能移除背景
                </h1>
                <p className="text-zinc-400 text-sm md:text-base font-medium max-w-xl mx-auto">
                    发丝级精细分割，一键抠图，让你的素材处理更高效。
                </p>
            </div>

            {/* Main Container */}
            <div className="w-full max-w-5xl bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">

                {/* Header / History Trigger */}
                <div className="absolute top-6 right-6 z-10">
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all duration-300">
                                <History className="w-5 h-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent className="bg-zinc-950 border-zinc-800 text-white w-[400px] sm:w-[540px]">
                            <SheetHeader>
                                <SheetTitle className="text-white text-xl font-bold flex items-center gap-2">
                                    <History className="w-5 h-5" />
                                    History
                                </SheetTitle>
                            </SheetHeader>
                            <div className="mt-8 grid grid-cols-2 gap-4 max-h-[calc(100vh-100px)] overflow-y-auto pr-2 custom-scrollbar pb-8">
                                {isLoadingHistory ? (
                                    <div className="col-span-2 text-center text-zinc-500 py-20 flex flex-col items-center gap-4">
                                        <Loader2 className="w-12 h-12 animate-spin text-purple-500/50" />
                                        <span>正在获取云端记录...</span>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="col-span-2 text-center text-zinc-500 py-20 flex flex-col items-center gap-4">
                                        <History className="w-12 h-12 opacity-20" />
                                        <span>暂无历史记录</span>
                                    </div>
                                ) : (
                                    history.map((item) => (
                                        <div
                                            key={item.id}
                                            className="group relative aspect-square rounded-xl bg-zinc-900 border border-zinc-800/50 overflow-hidden cursor-pointer hover:border-purple-500/50 transition-all duration-300"
                                            onClick={() => {
                                                loadHistoryItem(item);
                                            }}
                                        >
                                            <div className="absolute inset-0 opacity-20"
                                                style={{
                                                    backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                                                    backgroundSize: '10px 10px'
                                                }}
                                            />
                                            <img src={item.processed_url} className="relative w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110" alt="History" />

                                            {/* Hover Actions */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                                <button
                                                    onClick={(e) => deleteHistoryItem(e, item.id)}
                                                    className="p-2 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownload(item.processed_url); }}
                                                    className="p-2 rounded-full bg-white/10 hover:bg-purple-600/80 text-white transition-colors"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Left: Original / Upload */}
                    <div className="flex flex-col gap-4 group/left">
                        <div className="text-sm font-bold text-zinc-400 pl-1 tracking-wide uppercase">原始图片</div>
                        <div
                            className={cn(
                                "flex-1 relative w-full aspect-square rounded-[24px] border-2 border-dashed border-zinc-700 bg-zinc-900/30 flex flex-col items-center justify-center overflow-hidden transition-all duration-300",
                                originalImage ? "border-solid border-white/5 bg-zinc-900/50" : "hover:border-purple-500/40 hover:bg-zinc-900/60 cursor-pointer"
                            )}
                            onClick={() => !originalImage && fileInputRef.current?.click()}
                        >
                            {originalImage ? (
                                <>
                                    <img src={originalImage} className="w-full h-full object-contain p-6" alt="Original" />
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                            className="p-2 rounded-xl bg-black/50 text-white hover:bg-white/20 backdrop-blur-md transition-colors border border-white/10"
                                            title="Replace"
                                        >
                                            <ImagePlus className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOriginalImage(null); setProcessedImage(null); }}
                                            className="p-2 rounded-xl bg-black/50 text-white hover:bg-red-500/80 backdrop-blur-md transition-colors border border-white/10"
                                            title="Clear"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-[#1E1E1E] flex items-center justify-center group-hover/left:scale-110 group-hover/left:bg-[#252525] transition-all duration-300 shadow-xl border border-white/5">
                                        <Upload className="w-7 h-7 text-purple-500" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <div className="text-lg font-bold text-zinc-300 group-hover/left:text-white transition-colors">点击上传图片</div>
                                        <div className="text-xs text-zinc-500 font-medium">支持 JPG, PNG, WEBP (最大 10MB)</div>
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                            />
                        </div>
                    </div>

                    {/* Right: Result */}
                    <div className="flex flex-col gap-4">
                        <div className="text-sm font-bold text-zinc-400 pl-1 tracking-wide uppercase">抠图结果</div>
                        <div className="flex-1 relative w-full aspect-square rounded-[24px] border-2 border-dashed border-zinc-700 bg-zinc-900/30 flex flex-col items-center justify-center overflow-hidden">
                            {/* Grid bg */}
                            {/* White bg */}
                            {processedImage && <div className="absolute inset-0 bg-white pointer-events-none" />}

                            {processedImage ? (
                                <div className="relative w-full h-full flex items-center justify-center p-6 animate-in fade-in duration-500">
                                    <img src={processedImage} className="w-full h-full object-contain relative z-10" alt="Result" />
                                    <div className="absolute top-4 right-4 z-20">
                                        <button
                                            onClick={() => handleDownload()}
                                            className="px-4 py-2 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-900/20 hover:bg-purple-700 hover:shadow-purple-700/30 transition-all font-medium text-xs flex items-center gap-2"
                                            title="Download"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            下载透明图片
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-zinc-600">
                                    {isProcessing ? (
                                        <div className="flex flex-col items-center gap-6 w-full px-12">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                                                <Loader2 className="relative w-12 h-12 animate-spin text-purple-500" />
                                            </div>
                                            <div className="w-full space-y-2">
                                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-purple-400">
                                                    <span>AI Processing</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 ease-out"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <div className="text-center text-xs text-zinc-500 mt-2 font-mono">{loadingSubtext}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
                                            <div className="text-sm font-medium opacity-40">等待生成结果</div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Action Button */}
                <div className="w-full mt-auto">
                    <button
                        onClick={handleMatting}
                        disabled={!originalImage || isProcessing}
                        className={cn(
                            "w-full h-14 rounded-xl font-bold text-lg tracking-widest flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden",
                            processedImage && !isProcessing
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                                : !originalImage
                                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                                    : "bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#d946ef] text-white hover:brightness-110 shadow-[0_0_40px_-10px_rgba(139,92,246,0.5)] border border-white/10 active:scale-[0.99] group"
                        )}
                    >
                        {processedImage && !isProcessing ? (
                            <>
                                <div className="p-1 rounded-full bg-emerald-500/20">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <span className="text-base text-emerald-400">处理完成 (点击重新生成)</span>
                            </>
                        ) : isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-base">正在 AI 抠图中 ({progress}%)</span>
                            </>
                        ) : (
                            <>
                                {!originalImage ? null : (
                                    <span className="relative flex h-3 w-3 mr-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                    </span>
                                )}
                                <Zap className={cn("w-5 h-5 fill-current transition-transform duration-300", !originalImage ? "" : "group-hover:scale-110 group-hover:rotate-12")} />
                                <span className="text-base">立即移除背景</span>
                            </>
                        )}
                    </button>

                    {/* Reset & Retry Buttons */}
                    {processedImage && !isProcessing && (
                        <div className="flex gap-4 mt-3">
                            <button
                                onClick={() => {
                                    setProcessedImage(null);
                                    handleMatting();
                                }}
                                className="flex-1 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                重新抠图
                            </button>
                            <button
                                onClick={() => {
                                    if (processedImage && processedImage.startsWith("blob:")) {
                                        URL.revokeObjectURL(processedImage);
                                    }
                                    setProcessedImage(null);
                                    setOriginalImage(null);
                                    setIsProcessing(false);
                                    setProgress(0);
                                }}
                                className="flex-1 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-3.5 h-3.5" />
                                开始新的任务
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MattingPage;
