import React, { useState } from "react";
import {
    Gift,
    X,
    UserPlus,
    Coins,
    Smartphone,
    TrendingUp,
    Sparkles,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const INVITE_REWARDS = [
    {
        type: "新人注册礼",
        reward: "50 积分",
        value: "¥1.5",
        capacity: "25 张 4K",
        limit: "需绑定手机号 (一次性)",
        icon: Smartphone,
        color: "from-blue-500 to-cyan-400"
    },
    {
        type: "邀请好友注册",
        reward: "20 积分/人",
        value: "¥0.6",
        capacity: "10 张 4K",
        limit: "每日上限 3 人 (防刷)",
        icon: UserPlus,
        color: "from-purple-500 to-pink-400"
    },
    {
        type: "好友首次付费",
        reward: "300 积分",
        value: "¥9.0",
        capacity: "150 张 4K",
        limit: "好友开通任意会员/加油包",
        icon: Coins,
        color: "from-amber-500 to-orange-400"
    }
];

export function InviteFloat() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Entry Button */}
            <div className="fixed top-24 left-4 z-100 group animate-in fade-in slide-in-from-left-4 duration-1000">
                <button
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        "relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-500",
                        "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl",
                        "hover:scale-105 hover:-translate-y-1 active:scale-95 group"
                    )}
                >
                    {/* Pulsing Aura */}
                    <div className="absolute inset-0 rounded-2xl bg-violet-500/20 animate-pulse blur-xl group-hover:bg-violet-500/30 transition-colors" />

                    <div className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/40">
                        <Gift size={20} className="animate-bounce" />
                    </div>

                    <div className="relative flex flex-col items-start pr-2">
                        <span className="text-[10px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest leading-none mb-1">新人好礼</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">新人邀请好礼</span>
                    </div>

                    {/* Sparkles Decor */}
                    <Sparkles size={14} className="absolute -top-1 -right-1 text-amber-400 animate-pulse" />
                </button>
            </div>

            {/* Invitation Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[700px] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden rounded-[2.5rem]">
                    <div className="relative overflow-hidden pt-12 pb-8 px-8">
                        {/* Background decorative gradients */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-violet-500 via-pink-500 to-amber-500" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-500/10 blur-[80px] rounded-full" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full" />

                        <DialogHeader className="relative z-10 mb-8">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xl">
                                    <Gift size={28} />
                                </div>
                                <div>
                                    <DialogTitle className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white italic capitalize">
                                        新人邀请好礼
                                    </DialogTitle>
                                    <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">
                                        邀请好友，解锁海量算力
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="relative z-10 space-y-4">
                            {/* Rewards List */}
                            <div className="grid grid-cols-1 gap-4">
                                {INVITE_REWARDS.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="group relative overflow-hidden bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 p-6 rounded-3xl transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
                                    >
                                        <div className="flex items-center justify-between gap-6 relative z-10">
                                            <div className="flex items-center gap-5">
                                                <div className={cn(
                                                    "h-12 w-12 flex items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6",
                                                    `bg-linear-to-br ${item.color}`
                                                )}>
                                                    <item.icon size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">{item.type}</h4>
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.limit}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8 text-right">
                                                <div>
                                                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">奖励内容</div>
                                                    <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter italic">+{item.reward}</div>
                                                </div>
                                                <div className="hidden sm:block">
                                                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">价值折算</div>
                                                    <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter italic">{item.value}</div>
                                                </div>
                                                <div className="min-w-[100px]">
                                                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">对应产能</div>
                                                    <div className="text-sm font-bold text-green-500 flex items-center justify-end gap-1">
                                                        {item.capacity}
                                                        <TrendingUp size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Warning Note */}
                            <div className="mt-8 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-start gap-3">
                                <Info size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] font-bold text-red-500/80 leading-relaxed uppercase tracking-widest">
                                    注意：必须绑定手机号，避免被疯狂薅羊毛。为了保证系统公平，我们将对异常邀请行为进行人工审核。
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <button className="py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-black text-[11px] tracking-[0.2em] transition-all hover:bg-zinc-200 dark:hover:bg-zinc-800">
                                    规则详情
                                </button>
                                <button className="py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[11px] tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
                                    立即邀请
                                </button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
