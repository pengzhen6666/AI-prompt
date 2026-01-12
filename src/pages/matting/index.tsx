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
import { removeBackground } from "@/servers/ai";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

interface HistoryItem {
    id: string;
    original: string;
    processed: string;
    timestamp: number;
}

const MattingPage = () => {
    const { t } = useTranslation(["common"]);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // History State
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem("matting_history");
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load history", e);
            }
        }
    }, []);

    const saveToHistory = (original: string, processed: string) => {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            original,
            processed,
            timestamp: Date.now(),
        };
        const newHistory = [newItem, ...history];
        setHistory(newHistory);
        localStorage.setItem("matting_history", JSON.stringify(newHistory));
    };

    const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newHistory = history.filter(item => item.id !== id);
        setHistory(newHistory);
        localStorage.setItem("matting_history", JSON.stringify(newHistory));
    };

    const loadHistoryItem = (item: HistoryItem) => {
        setOriginalImage(item.original);
        setProcessedImage(item.processed);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const url = reader.result as string;
                setOriginalImage(url);
                setProcessedImage(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMatting = async () => {
        if (!originalImage || isProcessing) return;

        setIsProcessing(true);
        try {
            const result = await removeBackground({ image: originalImage });

            if (result && result.url) {
                setProcessedImage(result.url);
                saveToHistory(originalImage, result.url);
                toast.success(t("common:matting_success"));
            } else {
                throw new Error("处理失败，未获取到图片链接");
            }
        } catch (error: any) {
            console.error("Matting Error:", error);
            toast.error(error.message || "抠像失败，请稍后重试");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async (urlToDownload?: string) => {
        const targetUrl = urlToDownload || processedImage;
        if (!targetUrl) return;
        try {
            const response = await fetch(targetUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `matting-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("下载失败");
        }
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
                                {history.length === 0 ? (
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
                                                // Optional: Close sheet here
                                            }}
                                        >
                                            <div className="absolute inset-0 opacity-20"
                                                style={{
                                                    backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                                                    backgroundSize: '10px 10px'
                                                }}
                                            />
                                            <img src={item.processed} className="relative w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110" alt="History" />

                                            {/* Hover Actions */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteHistoryItem(e, item.id); }}
                                                    className="p-2 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownload(item.processed); }}
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
                            <div className="absolute inset-0 opacity-10 pointer-events-none"
                                style={{
                                    backgroundImage: `linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)`,
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                                }}
                            />

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
                                            Download
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-zinc-600">
                                    {isProcessing ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                                                <Loader2 className="relative w-12 h-12 animate-spin text-purple-500" />
                                            </div>
                                            <div className="text-sm font-medium text-purple-400 animate-pulse tracking-wider">正在智能抠图中...</div>
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
                        disabled={!originalImage || isProcessing || !!processedImage}
                        className={cn(
                            "w-full h-14 rounded-xl font-bold text-lg tracking-widest flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden",
                            processedImage
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
                                : !originalImage
                                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                                    : "bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#d946ef] text-white hover:brightness-110 shadow-[0_0_40px_-10px_rgba(139,92,246,0.5)] border border-white/10 active:scale-[0.99] group"
                        )}
                    >
                        {processedImage ? (
                            <>
                                <div className="p-1 rounded-full bg-emerald-500/20">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <span className="text-base">处理完成</span>
                            </>
                        ) : isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-base">正在 AI 抠图中...</span>
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

                    {/* Reset Button (Only when processed) */}
                    {processedImage && (
                        <button
                            onClick={() => {
                                setProcessedImage(null);
                                setOriginalImage(null);
                                setIsProcessing(false);
                            }}
                            className="w-full mt-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            开始新的任务
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MattingPage;
