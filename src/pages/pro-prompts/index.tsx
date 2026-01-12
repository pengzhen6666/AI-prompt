import React, { useState, useEffect, useCallback } from "react";
import {
    Sparkles,
    Wand2,
    Copy,
    CheckCircle2,
    Loader2,
    FileText,
    Code2,
    ArrowLeft,
    History,
    Clock,
    Trash2,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { generateProPrompt, saveProPrompt, getProPromptHistory } from "@/servers/ai";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useUserStore } from "@/store/userStore";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

const ProPrompts = () => {
    const { t } = useTranslation(["common"]);
    const navigate = useNavigate();
    const { user } = useUserStore();

    // UI State
    const [prompt, setPrompt] = useState("");
    const [format, setFormat] = useState<"text" | "json">("text");
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [language, setLanguage] = useState("中文");

    // History State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (!user?.id) return;
        setLoadingHistory(true);
        try {
            const data = await getProPromptHistory(user.id);
            setHistoryItems(data || []);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoadingHistory(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            fetchHistory();
        }
    }, [user?.id, fetchHistory]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("请输入您的创意灵感");
            return;
        }

        setIsGenerating(true);
        setResult(null);
        try {
            const data = await generateProPrompt({
                prompt: prompt.trim(),
                format: format,
                language: language
            });
            setResult(data);

            // Auto-save to history if user is logged in
            if (user?.id) {
                try {
                    await saveProPrompt({
                        user_id: user.id,
                        input_prompt: prompt.trim(),
                        output_result: data,
                        format: format
                    });
                    fetchHistory(); // Refresh history list
                } catch (saveError) {
                    console.error("Failed to save history:", saveError);
                }
            }

            toast.success("生成成功");
        } catch (error: any) {
            console.error("Pro Prompts Generation Error:", error);
            toast.error(error.message || "生成失败，请稍后重试");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = (content?: any) => {
        const textToCopy = typeof (content || result) === "string"
            ? (content || result)
            : JSON.stringify((content || result), null, 2);

        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        toast.success("已复制到剪贴板");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLoadHistory = (item: any) => {
        setPrompt(item.input_prompt);
        setResult(item.output_result);
        setFormat(item.format);
        setIsHistoryOpen(false);
        toast.info("已加载历史记录");
    };

    return (
        <div className="flex-1 w-full bg-transparent text-foreground min-h-screen relative flex flex-col pt-16 selection:bg-purple-500/30">
            <main className="relative z-10 max-w-6xl mx-auto w-full px-4 md:px-8 py-10 md:py-16 flex flex-col items-center flex-1 overflow-hidden">
                {/* Single Card Split Layout (Theme Adaptive) */}
                <div className="w-full bg-white dark:bg-zinc-950/60 backdrop-blur-3xl rounded-[32px] border border-zinc-200 dark:border-zinc-800/50 shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[750px] min-h-[500px]">

                    {/* Left Section: Configuration */}
                    <div className="flex-1 p-8 md:p-10 space-y-8 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800/50 flex flex-col overflow-y-auto scrollbar-hide">
                        {/* Input Title */}
                        <div className="space-y-4 flex flex-col">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <Wand2 className="w-5 h-5 text-purple-400" />
                                    {t("common:pro_prompts_input_title")}
                                </h3>
                                <button
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="flex items-center gap-1.5 text-zinc-400 hover:text-purple-500 transition-all group"
                                    title="查看历史记录"
                                >
                                    <History className="w-4 h-4 group-hover:rotate-[-12deg] transition-transform" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">历史</span>
                                </button>
                            </div>
                            <div className="flex-1 min-h-[160px] relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={t("common:pro_prompts_placeholder")}
                                    className="relative w-full h-full min-h-[160px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 text-[15px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/30 transition-all resize-none leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Language Selector (Simplified) */}
                        <div className="space-y-4">
                            <h4 className="text-[13px] font-bold text-zinc-500 uppercase tracking-widest">
                                {t("common:pro_prompts_language_label")}
                            </h4>
                            <div className="flex gap-2">
                                {[
                                    { id: "中文", label: "中文" },
                                    { id: "English", label: "English" }
                                ].map((lang) => (
                                    <button
                                        key={lang.id}
                                        onClick={() => setLanguage(lang.id)}
                                        className={cn(
                                            "px-6 py-2 rounded-xl text-xs font-bold transition-all border",
                                            language === lang.id
                                                ? "bg-purple-600/10 dark:bg-purple-600/20 border-purple-500/50 text-purple-600 dark:text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                                                : "bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
                                        )}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Format Selector (Simplified) */}
                        <div className="space-y-4">
                            <h4 className="text-[13px] font-bold text-zinc-500 uppercase tracking-widest">
                                {t("common:pro_prompts_format_label")}
                            </h4>
                            <div className="flex gap-2">
                                {[
                                    { id: "text", label: t("common:pro_prompts_format_plain") },
                                    { id: "json", label: t("common:pro_prompts_format_json") }
                                ].map((fmt) => (
                                    <button
                                        key={fmt.id}
                                        onClick={() => setFormat(fmt.id as any)}
                                        className={cn(
                                            "px-6 py-2 rounded-xl text-xs font-bold transition-all border",
                                            format === fmt.id
                                                ? "bg-indigo-600/10 dark:bg-indigo-600/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                                                : "bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
                                        )}
                                    >
                                        {fmt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Button */}
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90 text-white transition-all shadow-xl shadow-purple-500/10 group relative overflow-hidden border-none active:scale-[0.98]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]" />
                            {isGenerating ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2.5">
                                    <Sparkles className="w-4 h-4 fill-white" />
                                    <span className="text-sm font-black tracking-widest uppercase pt-0.5">
                                        {t("common:pro_prompts_generate")}
                                    </span>
                                </div>
                            )}
                        </Button>
                    </div>

                    {/* Right Section: Output Display Area */}
                    <div className="flex-1 bg-zinc-50/50 dark:bg-black/20 p-8 md:p-10 flex flex-col space-y-4 overflow-hidden">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                {t("common:pro_prompts_output_title")}
                            </h3>
                            {result && (
                                <button
                                    onClick={() => handleCopy()}
                                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm active:scale-95"
                                    title="Copy Result"
                                >
                                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            )}
                        </div>

                        <div className="flex-1 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 relative overflow-hidden flex flex-col group">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            {!result && !isGenerating && (
                                <div className="absolute inset-0 p-6 text-zinc-400 dark:text-zinc-600 text-sm font-medium leading-relaxed italic">
                                    生成的提示词将显示在这里...
                                </div>
                            )}

                            {isGenerating ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500">
                                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center animate-spin">
                                        <Wand2 className="w-5 h-5 opacity-40 text-purple-400" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] animate-pulse">
                                        Generating...
                                    </span>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                                    {result && (
                                        <div className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-300 font-medium leading-[1.8] tracking-wide font-sans">
                                            {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* History Sidebar */}
            <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <SheetContent side="right" className="w-full sm:max-w-[420px] bg-white dark:bg-[#0a0a0c]/95 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white p-0 shadow-2xl">
                    <SheetHeader className="p-6 border-b border-zinc-200 dark:border-zinc-800/50">
                        <SheetTitle className="text-zinc-900 dark:text-white flex items-center gap-3 text-sm font-black uppercase tracking-widest">
                            <History className="w-4 h-4 text-purple-400" />
                            生成记录
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide h-[calc(100vh-80px)]">
                        {loadingHistory ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-30">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-[10px] font-bold tracking-widest uppercase">Loading...</span>
                            </div>
                        ) : historyItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-20">
                                <Clock className="w-8 h-8" />
                                <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600">No records</span>
                            </div>
                        ) : (
                            historyItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="group bg-zinc-950/50 border border-zinc-900/50 rounded-xl p-3.5 hover:border-purple-500/20 hover:bg-zinc-900/30 transition-all cursor-pointer"
                                    onClick={() => handleLoadHistory(item)}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex-1">
                                            <p className="text-xs text-zinc-400 font-medium line-clamp-2 leading-relaxed italic">
                                                "{item.input_prompt}"
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(item.output_result);
                                            }}
                                            className="p-1.5 rounded-lg bg-zinc-900/50 text-zinc-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm border",
                                                item.format === "json"
                                                    ? "bg-blue-500/5 text-blue-500/60 border-blue-500/10"
                                                    : "bg-purple-500/5 text-purple-500/60 border-purple-500/10"
                                            )}>
                                                {item.format}
                                            </span>
                                            <span className="text-[9px] text-zinc-700 font-medium">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <ChevronRight className="w-3 h-3 text-zinc-800 group-hover:text-purple-500/50 transition-colors" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div >
    );
};

export default ProPrompts;
