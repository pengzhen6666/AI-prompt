import React, { useState, useMemo } from "react";
import {
  Check,
  Zap,
  Shield,
  CreditCard,
  Target,
  Users,
  Briefcase,
  Gem,
  Plus,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Crown,
  Layers,
  ChevronRight,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PERSONAL_TIERS,
  ENTERPRISE_TIERS,
  PERSONAL_ADDONS,
  ENTERPRISE_ADDONS,
  PricingTier,
  AddonPackage,
} from "./pricing-data";
import { InviteFloat } from "../invite";

type BillingCycle = "monthly" | "continuous" | "yearly";
type PricingTab = "personal" | "enterprise" | "addons";
type AddonStatus = "freeLite" | "pro" | "ultra" | "enterprise";

const PricingCard = ({
  tier,
  cycle,
  onSelect,
  tabType,
}: {
  tier: PricingTier;
  cycle: BillingCycle;
  onSelect: (tier: PricingTier) => void;
  tabType: PricingTab;
}) => {
  const getPrice = () => {
    const p = tier.pricing;
    if (cycle === "yearly" && p.yearly !== undefined) return p.yearly;
    if (cycle === "continuous" && p.continuous !== undefined) return p.continuous;
    return p.monthly;
  };

  const getSuffix = () => {
    if (cycle === "yearly" && tier.pricing.yearly !== undefined) return "/年";
    if (tier.id === "lite" && cycle === "monthly") return "/周";
    return "/月";
  };

  const price = getPrice();
  const hasPriceForCycle = price !== undefined;

  return (
    <div
      className={cn(
        "group relative flex flex-col p-8 rounded-[2.5rem] transition-all duration-700 h-full",
        "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800",
        "hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] hover:-translate-y-2",
        tier.isPopular ? "ring-2 ring-zinc-900 dark:ring-white shadow-2xl" : "shadow-sm"
      )}
    >
      {tier.isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2">
            <Star size={10} style={{ stroke: "url(#colorful-gradient)", fill: "url(#colorful-gradient)" }} />
            核心推荐
          </div>
        </div>
      )}

      <div className="mb-6 relative">
        <div className="flex justify-between items-start mb-4">
          <div className={cn(
            "h-11 w-11 flex items-center justify-center rounded-xl transition-all duration-500 group-hover:scale-110",
            tier.isPopular ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
          )}>
            {tier.id === "free" ? <Target size={22} style={{ stroke: "url(#personal-gradient)" }} /> :
              tier.id === "lite" ? <Zap size={22} style={{ stroke: "url(#lightning-gradient)", fill: "url(#lightning-gradient)" }} className="drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]" /> :
                tier.id === "pro" ? <Gem size={22} style={{ stroke: "url(#pro-gradient)" }} /> :
                  tier.id === "ultra" ? <Crown size={22} style={{ stroke: "url(#pro-gradient)" }} /> :
                    <Briefcase size={22} style={{ stroke: "url(#enterprise-gradient)" }} />}
          </div>
          <div className="text-right">
            <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{tier.name}</h3>
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">{tier.description}</p>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
              {hasPriceForCycle ? (price === 0 ? "免费" : `¥${price}`) : "—"}
            </span>
            {hasPriceForCycle && price !== 0 && (
              <span className="text-[11px] font-bold text-zinc-400 ml-1">{getSuffix()}</span>
            )}
          </div>
          {tier.isPopular && cycle === "yearly" && tier.pricing.monthly && tier.pricing.yearly && (
            <div className="text-[10px] font-black text-green-500 uppercase tracking-widest mt-1">
              年度节省 ¥{Math.round(tier.pricing.monthly * 12 - tier.pricing.yearly)}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 mb-8">
        <div className="w-full h-px bg-zinc-100 dark:bg-zinc-900 my-6" />
        {Object.entries(tier.benefits).map(([key, value], i) => {
          if (value === "/" || !value) return null;
          const label = {
            promptGen: "提示词生成",
            imageQuota: "图片额度",
            resolution: "画质上限",
            speed: "生成速度",
            addonDiscount: "加油包折扣",
            estimatedImages: "折合图量",
            useCase: "用途",
            creditConsumption: "积分消耗",
            seats: "席位",
            seatPurchase: "席位购买",
          }[key as keyof typeof tier.benefits];

          return (
            <div key={i} className="flex items-center gap-3 transition-all duration-300 group-hover:translate-x-1">
              <div className={cn(
                "flex items-center justify-center h-5 w-5 rounded-md",
                tier.isPopular ? "bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-400"
              )}>
                <Check size={10} strokeWidth={4} style={{ stroke: tabType === "personal" ? (tier.id === "pro" || tier.id === "ultra" ? "url(#pro-gradient)" : "url(#personal-gradient)") : "url(#enterprise-gradient)" }} />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-zinc-800 dark:text-zinc-200">{value}</span>
                <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest leading-none mt-0.5">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onSelect(tier)}
        disabled={!hasPriceForCycle}
        className={cn(
          "w-full py-4 rounded-3xl font-black text-[10px] tracking-[0.2em] transition-all duration-500",
          tier.isPopular
            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xl hover:scale-[1.03] active:scale-95"
            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800",
          !hasPriceForCycle && "opacity-50 cursor-not-allowed"
        )}
      >
        {tier.id === "free" ? "当前方案" : "立即升级"}
      </button>
    </div>
  );
};

const AddonCard = ({ addon, status }: { addon: AddonPackage; status: AddonStatus }) => {
  const isEnterprise = status === "enterprise";

  // Get data based on current status
  const currentData = isEnterprise ? addon.tiers.pro : (
    status === "freeLite" ? addon.tiers.freeLite :
      status === "pro" ? addon.tiers.pro :
        addon.tiers.ultra
  );

  return (
    <div className="group relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-7 transition-all duration-700 hover:shadow-2xl overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:opacity-50 transition-all duration-700 pointer-events-none">
        <Zap size={100} strokeWidth={1} style={{ stroke: "url(#lightning-gradient)", fill: "url(#lightning-gradient)" }} className="drop-shadow-[0_0_20px_rgba(0,242,255,0.4)]" />
      </div>

      <div className="relative z-10 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-full text-[8px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-200/50 dark:border-zinc-800">
            {isEnterprise ? "企业专供" : "算力补给"}
          </div>
          {currentData.label && (
            <div className="px-2 py-0.5 bg-yellow-400 text-black rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
              {currentData.label}
            </div>
          )}
        </div>
        <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1">{addon.name}</h3>
        <p className="text-[11px] font-bold text-zinc-400 leading-relaxed">
          {isEnterprise ? addon.useCase : `针对您的创作等级精心定制。`}
        </p>
      </div>

      <div className="flex-1 relative z-10 space-y-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">点数额度</div>
            <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">{currentData.credits}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
              折合图量
            </div>
            <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter flex items-center justify-end gap-1">
              {isEnterprise ? addon.capacity : currentData.images}
              <TrendingUp size={12} style={{ stroke: "url(#lightning-gradient)" }} />
            </div>
            <div className="text-[8px] font-black text-zinc-500 tracking-widest uppercase">
              ({status === "freeLite" ? "1-2K" : "4K"})
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
          <div className="flex items-baseline justify-center gap-1 mb-4">
            <span className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter italic">¥{addon.price}</span>
          </div>
        </div>
      </div>

      <button className="w-full py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl relative z-10 mt-auto">
        立即购买
      </button>
    </div>
  );
};

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<PricingTab>("personal");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [addonStatus, setAddonStatus] = useState<AddonStatus>("freeLite");

  const tabs = [
    { id: "personal", label: "个人会员", icon: Target },
    { id: "enterprise", label: "企业会员", icon: Briefcase },
    { id: "addons", label: "算力加油包", icon: Zap },
  ];

  const cycles = [
    { id: "monthly", label: "月付" },
    { id: "continuous", label: "连续订阅", badge: "最灵活" },
    { id: "yearly", label: "年付", badge: "-20%" },
  ];

  const addonLevels = [
    { id: "freeLite", label: "免费 / 基础版", icon: Target },
    { id: "pro", label: "专业版", icon: Gem },
    { id: "ultra", label: "旗舰版", icon: Crown },
    { id: "enterprise", label: "企业版", icon: BuildingsIcon },
  ];

  return (
    <div className="flex-1 min-h-screen bg-white dark:bg-zinc-950 font-sans selection:bg-zinc-900 selection:text-white py-20 px-4 sm:px-8 flex flex-col justify-center relative overflow-hidden">
      <InviteFloat />
      {/* Colorful Gradient Definition */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          {/* Personal - Rose/Coral Gradient */}
          <linearGradient id="personal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>

          {/* Pro - Violet/Indigo Gradient */}
          <linearGradient id="pro-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>

          {/* Enterprise - Emerald/Teal Gradient */}
          <linearGradient id="enterprise-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Lightning - Cyan/Blue Gradient */}
          <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F2FF">
              <animate attributeName="stop-color" values="#00F2FF; #7000FF; #00F2FF" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#FFFFFF">
              <animate attributeName="stop-color" values="#FFFFFF; #00F2FF; #FFFFFF" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#00F2FF">
              <animate attributeName="stop-color" values="#00F2FF; #7000FF; #00F2FF" dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>
      </svg>

      {/* Premium Background Background Effects */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(var(--dot-color)_1.5px,transparent_1.5px)] bg-size-[50px_50px] opacity-100 pointer-events-none" />
      <div className="absolute top-0 right-[-10%] w-1/2 h-screen bg-linear-to-b from-zinc-100/30 dark:from-zinc-100/5 to-transparent -z-10 blur-[120px]" />

      <div className="relative z-10 max-w-[1440px] mx-auto w-full">

        {/* Dynamic Navigation System */}
        <div className="flex flex-col items-center gap-4 mb-8">
          {/* Main Tabs (Apple Style) */}
          <div className="relative p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-4xl flex gap-1 shadow-inner border border-zinc-200/50 dark:border-zinc-800/50">
            {/* Sliding Indicator */}
            <div
              className="absolute h-[calc(100%-0.75rem)] bg-white dark:bg-white transition-all duration-500 rounded-3xl shadow-2xl z-0"
              style={{
                width: `calc(${100 / tabs.length}% - 0.5rem)`,
                left: `calc(${(tabs.findIndex(t => t.id === activeTab) * (100 / tabs.length))}% + 0.25rem)`
              }}
            />
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as PricingTab)}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-2 px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                  activeTab === tab.id ? "text-zinc-900 dark:text-zinc-950" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                {tab.id === "personal" ? <Target size={14} style={{ stroke: "url(#personal-gradient)" }} /> :
                  tab.id === "enterprise" ? <Briefcase size={14} style={{ stroke: "url(#enterprise-gradient)" }} /> :
                    <Zap size={14} style={{ stroke: "url(#lightning-gradient)", fill: "url(#lightning-gradient)" }} className="drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]" />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-Classification Controls */}
          <div className="animate-in fade-in duration-700">
            {activeTab === "personal" ? (
              <div className="flex gap-2 p-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl backdrop-blur-md">
                {cycles.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setBillingCycle(item.id as BillingCycle)}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      billingCycle === item.id
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl"
                        : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    {item.label}
                    {item.badge && (
                      <span className={cn(
                        "ml-2 py-0.5 px-1.5 rounded-md text-[8px] transition-colors",
                        billingCycle === item.id
                          ? "bg-zinc-900/10 text-zinc-900"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : activeTab === "addons" ? (
              <div className="flex flex-wrap justify-center gap-4">
                {addonLevels.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setAddonStatus(lvl.id as AddonStatus)}
                    className={cn(
                      "flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all duration-300",
                      addonStatus === lvl.id
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xl scale-105"
                        : "bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                    )}
                  >
                    <lvl.icon size={14} style={{ stroke: lvl.id === "pro" ? "url(#pro-gradient)" : (lvl.id === "ultra" ? "url(#pro-gradient)" : (lvl.id === "enterprise" ? "url(#enterprise-gradient)" : "url(#personal-gradient)")) }} />
                    {lvl.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Content Section Area */}
        <div className="relative animate-in fade-in duration-1000 delay-300">
          {activeTab === "personal" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PERSONAL_TIERS.map((tier) => (
                <PricingCard
                  key={tier.id}
                  tier={tier}
                  cycle={billingCycle}
                  tabType="personal"
                  onSelect={(t) => console.log("Selected", t)}
                />
              ))}
            </div>
          )}

          {activeTab === "enterprise" && (
            <div className="flex flex-wrap justify-center gap-6 max-w-[1400px] mx-auto w-full">
              {/* Business Monthly */}
              <div className="w-full md:w-[calc(33.33%-1rem)] max-w-[380px]">
                <PricingCard
                  tier={ENTERPRISE_TIERS[0]}
                  cycle="monthly"
                  tabType="enterprise"
                  onSelect={(t) => console.log("Selected", t)}
                />
              </div>
              {/* Business Yearly */}
              <div className="w-full md:w-[calc(33.33%-1rem)] max-w-[380px]">
                <PricingCard
                  tier={{ ...ENTERPRISE_TIERS[0], isPopular: true, name: "年度企业套餐" }}
                  cycle="yearly"
                  tabType="enterprise"
                  onSelect={(t) => console.log("Selected", t)}
                />
              </div>
              {/* Business Ultra */}
              <div className="w-full md:w-[calc(33.33%-1rem)] max-w-[380px]">
                <PricingCard
                  tier={ENTERPRISE_TIERS[1]}
                  cycle="yearly"
                  tabType="enterprise"
                  onSelect={(t) => console.log("Selected", t)}
                />
              </div>
            </div>
          )}

          {activeTab === "addons" && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter italic">
                  {addonStatus === "freeLite" ? "基础算力包" : addonStatus === "pro" ? "专业加速包" : addonStatus === "ultra" ? "旗舰增强包" : "企业巨量包"}
                </h2>
                <p className="text-zinc-400 font-bold mt-1 text-[10px] uppercase tracking-widest">为您当前的创作等级精准匹配的算力加油包。</p>
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                {(addonStatus === "enterprise" ? ENTERPRISE_ADDONS : PERSONAL_ADDONS).map((addon) => (
                  <div key={addon.id} className="w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] min-w-[280px] max-w-sm h-auto">
                    <AddonCard addon={addon} status={addonStatus} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Support Footer */}
        <footer className="mt-32 pt-16 pb-16 border-t border-zinc-100 dark:border-zinc-900 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-linear-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
          <div className="max-w-2xl mx-auto space-y-8">
            <h3 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-tight italic">
              突破想象的边界
            </h3>
            <div className="flex flex-col items-center gap-4">
              <p className="text-zinc-400 font-bold text-base">加入 10,000+ 创作者，共同成长</p>
              <a
                href="#"
                className="group flex items-center gap-4 px-10 py-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[11px] tracking-[0.3em] shadow-2xl hover:scale-[1.05] transition-all"
              >
                联系商务
                <ChevronRight className="transition-transform group-hover:translate-x-2" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Minimal Icons
function BuildingsIcon(props: any) {
  return <Layers {...props} />;
}
