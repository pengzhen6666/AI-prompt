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
    RefreshCw,
    Eraser,
    RotateCcw,
    MousePointer2
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

    // Eraser Tool State
    const [isEraserMode, setIsEraserMode] = useState(false);
    const [brushMode, setBrushMode] = useState<'erase' | 'restore'>('erase');
    const [brushSize, setBrushSize] = useState(25);
    const [isDrawing, setIsDrawing] = useState(false);
    const [undoStack, setUndoStack] = useState<string[]>([]); // Array of Blob URLs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const sourceImageRef = useRef<HTMLImageElement | null>(null); // Original image for restore
    const lastPosRef = useRef<{ x: number, y: number } | null>(null);
    const cachedRectRef = useRef<{ rect: DOMRect, visualScale: number, offsetX: number, offsetY: number, renderWidth: number, renderHeight: number } | null>(null);

    const fetchHistory = async () => {
        if (!user) {
            setHistory([]);
            return;
        }
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from("pzcreated_image")
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
                .from("pzcreated_image")
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
                .from("pzcreated_image")
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
        setIsEraserMode(false); // Reset eraser mode when loading new
        setOriginalImage(item.original_url);
        setProcessedImage(item.processed_url);
    };

    // --- Eraser Logic ---
    const initCanvas = () => {
        if (!processedImage || !canvasRef.current || !originalImage) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        const srcImg = new Image();
        img.crossOrigin = "anonymous";
        srcImg.crossOrigin = "anonymous";

        // Wait for both images to load to ensure perfect alignment
        let loadedCount = 0;
        const onLoad = () => {
            loadedCount++;
            if (loadedCount === 2) {
                // Keep internal resolution matching the actual processed image pixels
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                sourceImageRef.current = srcImg;

                // Capture the absolute initial state (AI result) so it can be undone back to
                try {
                    const initialState = canvas.toDataURL("image/png");
                    setUndoStack([initialState]);
                } catch (e) {
                    console.warn("Failed to capture initial state", e);
                }
            }
        };

        img.onload = onLoad;
        srcImg.onload = onLoad;
        img.src = processedImage;
        srcImg.src = originalImage;
    };

    useEffect(() => {
        if (isEraserMode) {
            initCanvas();
        } else {
            setUndoStack([]);
        }
    }, [isEraserMode]); // Only init when entering mode

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current || !sourceImageRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Cache layout calculations once per stroke to avoid reflows during draw
        const canvasRatio = canvas.width / canvas.height;
        const containerRatio = rect.width / rect.height;
        let renderWidth, renderHeight, offsetX = 0, offsetY = 0;

        if (canvasRatio > containerRatio) {
            renderWidth = rect.width;
            renderHeight = renderWidth / canvasRatio;
            offsetY = (rect.height - renderHeight) / 2;
        } else {
            renderHeight = rect.height;
            renderWidth = renderHeight * canvasRatio;
            offsetX = (rect.width - renderWidth) / 2;
        }

        cachedRectRef.current = {
            rect,
            visualScale: canvas.width / renderWidth,
            offsetX,
            offsetY,
            renderWidth,
            renderHeight
        };

        try {
            const state = canvas.toDataURL("image/png");
            setUndoStack(prev => [...prev.slice(-24), state]);
        } catch (e) {
            console.error("Undo capture failed", e);
        }

        setIsDrawing(true);
        lastPosRef.current = null; // Reset last position
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPosRef.current = null;
        if (canvasRef.current) {
            canvasRef.current.toBlob((blob) => {
                if (blob) {
                    const newUrl = URL.createObjectURL(blob);
                    setProcessedImage(newUrl);
                }
            }, "image/png");
        }
    };

    const handleUndo = () => {
        if (undoStack.length === 0 || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const newStack = [...undoStack];
        const lastState = newStack.pop();
        if (!lastState) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setUndoStack(newStack);

            // Sync the processed image state immediately
            setProcessedImage(lastState);
        };
        img.src = lastState;
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isEraserMode) return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            } else if (e.key === 'e') {
                setBrushMode('erase');
            } else if (e.key === 'r') {
                setBrushMode('restore');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEraserMode, undoStack, brushMode]); // Depend on modes to ensure listeners use current state if needed (though modes are stateful)

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !canvasRef.current || !sourceImageRef.current || !cachedRectRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const srcImg = sourceImageRef.current;
        if (!ctx) return;

        const { rect, visualScale, offsetX, offsetY, renderWidth, renderHeight } = cachedRectRef.current;

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left - offsetX) * (canvas.width / renderWidth);
        const y = (clientY - rect.top - offsetY) * (canvas.height / renderHeight);

        const scaleX_src = srcImg.width / canvas.width;
        const scaleY_src = srcImg.height / canvas.height;
        const brushPx = brushSize * visualScale;

        // Smooth drawing algorithm
        const lastPos = lastPosRef.current;

        if (brushMode === 'erase') {
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineWidth = brushPx;

            ctx.beginPath();
            if (lastPos) {
                ctx.moveTo(lastPos.x, lastPos.y);
                ctx.lineTo(x, y);
            } else {
                ctx.arc(x, y, brushPx / 2, 0, Math.PI * 2);
            }
            ctx.stroke();
        } else {
            // Restore Mode: Interpolate stamps for smoothness
            ctx.globalCompositeOperation = "source-over";

            const dist = lastPos ? Math.sqrt(Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2)) : 0;
            const steps = lastPos ? Math.max(1, Math.ceil(dist / (brushPx / 4))) : 1;

            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                const curX = lastPos ? lastPos.x + (x - lastPos.x) * t : x;
                const curY = lastPos ? lastPos.y + (y - lastPos.y) * t : y;

                const sx = (curX - brushPx / 2) * scaleX_src;
                const sy = (curY - brushPx / 2) * scaleY_src;
                const sw = brushPx * scaleX_src;
                const sh = brushPx * scaleY_src;

                ctx.drawImage(
                    srcImg,
                    sx, sy, sw, sh,
                    curX - brushPx / 2, curY - brushPx / 2, brushPx, brushPx
                );
            }
        }

        lastPosRef.current = { x, y };
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
            const imgResponse = await fetch(originalImage);
            const rawBlob = await imgResponse.blob();
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

            // 4. Create URL & Update UI Immediately
            const url = URL.createObjectURL(blob);
            setProcessedImage(url);
            setIsProcessing(false);
            setProgress(0);
            setLoadingSubtext("");

            // 5. Save in background
            saveToHistory(originalImage, url);
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
        } catch (e) {
            console.error("Download failed", e);
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
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Left: Original / Upload */}
                    <div className="flex flex-col gap-4 group/left">
                        <div className="flex items-center justify-between px-1.5 h-6">
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">原始图片</div>
                        </div>

                        <div
                            className={cn(
                                "h-[560px] relative w-full rounded-[32px] border-2 border-dashed border-zinc-800 bg-zinc-900/20 flex flex-col items-center justify-center overflow-hidden transition-all duration-500 shadow-inner",
                                originalImage ? "border-solid border-white/[0.03] bg-zinc-900/40" : "hover:border-purple-500/30 hover:bg-zinc-900/40 cursor-pointer"
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
                        <div className="flex items-center justify-between px-1.5 h-6">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5 text-purple-500/60" />
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">抠图结果</span>
                            </div>

                            {!isEraserMode && processedImage && !isProcessing && (
                                <div className="flex items-center gap-2 pr-1 animate-in fade-in duration-300">
                                    <button
                                        onClick={() => setIsEraserMode(true)}
                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                                        title="手动修复"
                                    >
                                        <Eraser className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDownload()}
                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                        title="下载"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <button className="p-1.5 rounded-lg hover:bg-white/5 group transition-colors">
                                            <History className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                                        </button>
                                    </SheetTrigger>
                                    <SheetContent className="bg-[#0A0A0A] border-zinc-900 text-white w-[400px] sm:w-[540px]">
                                        <SheetHeader className="pb-6 border-b border-white/5">
                                            <SheetTitle className="text-white flex items-center gap-2">
                                                <History className="w-5 h-5 text-purple-500" />
                                                抠图历史
                                            </SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-6 grid grid-cols-2 gap-4 h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar">
                                            {isLoadingHistory ? (
                                                <div className="col-span-2 flex justify-center py-20">
                                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                                </div>
                                            ) : history.length === 0 ? (
                                                <div className="col-span-2 text-center py-20 text-zinc-500">暂无历史记录</div>
                                            ) : (
                                                history.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="group relative aspect-square rounded-2xl bg-zinc-900/50 border border-white/5 overflow-hidden cursor-pointer hover:border-purple-500/50 transition-all"
                                                        onClick={() => loadHistoryItem(item)}
                                                    >
                                                        {/* Transparency grid bg */}
                                                        <div className="absolute inset-0 opacity-10"
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
                        </div>

                        {/* Isolated Eraser Toolbar Row */}
                        {isEraserMode && (
                            <div className="bg-zinc-900/50 border border-white/[0.03] rounded-2xl p-1.5 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top-1 duration-300">
                                <div className="flex items-center gap-2">
                                    <div className="flex bg-black/40 rounded-xl p-0.5 border border-white/5">
                                        <button
                                            onClick={() => setBrushMode('erase')}
                                            className={cn(
                                                "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2",
                                                brushMode === 'erase' ? "bg-purple-600 text-white shadow-lg active:scale-95" : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            <Eraser className="w-3 h-3" />
                                            抠除 (E)
                                        </button>
                                        <button
                                            onClick={() => setBrushMode('restore')}
                                            className={cn(
                                                "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2",
                                                brushMode === 'restore' ? "bg-purple-600 text-white shadow-lg active:scale-95" : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            复原 (R)
                                        </button>
                                    </div>

                                    <div className="h-6 w-px bg-white/10 mx-1" />

                                    <div className="flex items-center gap-3 px-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"
                                            style={{
                                                width: Math.max(2, brushSize / 8),
                                                height: Math.max(2, brushSize / 8)
                                            }}
                                        />
                                        <input
                                            type="range" min="5" max="80" value={brushSize}
                                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                            className="w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleUndo}
                                        disabled={undoStack.length === 0}
                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                                        title="撤销"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
                                    </button>
                                    <button
                                        onClick={() => setIsEraserMode(false)}
                                        className="px-4 py-1.5 rounded-xl bg-white text-zinc-950 text-[10px] font-black hover:brightness-90 transition-all active:scale-95 shadow-xl"
                                    >
                                        完成
                                    </button>
                                </div>
                            </div>
                        )}

                        <div ref={containerRef} className="h-[560px] relative w-full rounded-[32px] border border-white/5 bg-zinc-900/30 flex flex-col items-center justify-center overflow-hidden shadow-2xl group/result">
                            {processedImage ? (
                                <div className="relative w-full h-full flex items-center justify-center animate-in fade-in duration-500">
                                    {/* Subtler Transparency grid for a more premium look */}
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                        style={{
                                            backgroundImage: `linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)`,
                                            backgroundSize: '20px 20px'
                                        }}
                                    />
                                    {/* Clean Off-White bg */}
                                    <div className="absolute inset-0 bg-[#FDFCFF]" />

                                    {isEraserMode ? (
                                        <canvas
                                            ref={canvasRef}
                                            className="w-full h-full object-contain relative z-20 cursor-crosshair"
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                        />
                                    ) : (
                                        <img src={processedImage} className="w-full h-full object-contain relative z-10" alt="Result" />
                                    )}
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

                {/* Bottom Action Section */}
                <div className="w-full mt-10">
                    {!isProcessing && processedImage ? (
                        <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <button
                                onClick={handleMatting}
                                className="flex-1 h-14 rounded-2xl bg-zinc-900 border border-white/5 text-emerald-500 font-bold text-lg tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all active:scale-[0.99] group overflow-hidden"
                            >
                                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                重新尝试
                            </button>
                            <button
                                onClick={() => {
                                    setOriginalImage(null);
                                    setProcessedImage(null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                                className="flex-1 h-14 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 font-bold text-lg tracking-widest hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-3"
                            >
                                <X className="w-5 h-5" />
                                开始新的任务
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleMatting}
                            disabled={!originalImage || isProcessing}
                            className={cn(
                                "w-full h-14 rounded-2xl font-bold text-xl tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-500 relative overflow-hidden",
                                !originalImage
                                    ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/[0.02]"
                                    : "bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 text-white hover:brightness-110 shadow-[0_20px_40px_-12px_rgba(79,70,229,0.4)] active:scale-[0.99] group"
                            )}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="absolute inset-0 bg-white/10 w-[var(--progress-width)] transition-all duration-300" style={{ '--progress-width': `${progress}%` } as any} />
                                    <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                                    <span className="relative z-10 font-black">正在处理 {progress}%</span>
                                </>
                            ) : (
                                <>
                                    <Zap className={cn("w-5 h-5 fill-current transition-transform duration-300", !originalImage ? "" : "group-hover:scale-110 group-hover:rotate-12")} />
                                    <span>立即移除背景</span>
                                    {originalImage && (
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MattingPage;
