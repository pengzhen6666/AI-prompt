import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Star,
  Zap,
  Coffee,
  Ghost,
  Sun,
  Heart,
  X,
  MoreVertical,
  CheckCircle2,
  Loader2,
  MessageSquare,
  User,
  Trash2,
  Copy,
  Search,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { generateMarketingResponse } from "@/servers/ai";
import {
  getMarketingPersonas,
  createMarketingPersona,
  deleteMarketingPersona,
  togglePersonaActive,
  type MarketingPersonaRecord,
} from "@/servers/marketing";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";

// 为 UI 渲染补充图标和颜色逻辑
const getTagIcon = (tag: string) => {
  if (tag.includes("可爱") || tag.includes("萌"))
    return <Heart size={20} className="text-rose-500" />;
  if (tag.includes("成熟") || tag.includes("御姐"))
    return <Coffee size={20} className="text-zinc-600" />;
  if (tag.includes("高冷") || tag.includes("女神") || tag.includes("清冷"))
    return <Ghost size={20} className="text-indigo-400" />;
  if (tag.includes("犀利") || tag.includes("精英"))
    return <Zap size={20} className="text-amber-500" />;
  return <Star size={20} className="text-indigo-500" />;
};

const getTagColor = (tag: string) => {
  if (tag.includes("可爱") || tag.includes("萌"))
    return "bg-rose-50 dark:bg-rose-500/5";
  if (tag.includes("成熟") || tag.includes("御姐"))
    return "bg-zinc-50 dark:bg-zinc-500/5";
  if (tag.includes("高冷") || tag.includes("女神") || tag.includes("清冷"))
    return "bg-indigo-50 dark:bg-indigo-500/5";
  if (tag.includes("犀利") || tag.includes("精英"))
    return "bg-amber-50 dark:bg-amber-500/5";
  return "bg-zinc-50 dark:bg-zinc-800";
};

type SceneType = "dm" | "reply" | "comment";

export default function StylePage() {
  const navigate = useNavigate();
  const [styles, setStyles] = useState<MarketingPersonaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("全部");

  // 详情查看状态
  const [viewingPersona, setViewingPersona] =
    useState<MarketingPersonaRecord | null>(null);
  const [activeSceneTab, setActiveSceneTab] = useState<SceneType>("reply");

  // Form States
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [selectedTag, setSelectedTag] = useState("可爱萌妹");

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      const { user } = useUserStore.getState();
      if (!user) return;
      const data = await getMarketingPersonas(user.id);
      setStyles(data);
    } catch (err) {
      toast.error("加载数据失败");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersona = async () => {
    if (!formName || !formDesc) {
      toast.error("请填写完整信息");
      return;
    }

    try {
      setIsGenerating(true);
      const res = await generateMarketingResponse({
        personaName: formName,
        personaDescription: `[${selectedTag}] ${formDesc}`,
      });

      const { user } = useUserStore.getState();
      if (!user) return;

      const newPersona = await createMarketingPersona(user.id, {
        ...res,
        category: selectedTag,
        is_active: styles.length === 0,
      });

      setStyles([newPersona, ...styles]);
      setIsAddModalOpen(false);
      resetForm();
      toast.success("人格全案生成并保存成功！");
    } catch (error) {
      toast.error("生成失败，请稍后重试");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("确定要删除这个人设吗？")) return;
    try {
      await deleteMarketingPersona(id);
      setStyles(styles.filter((s) => s.id !== id));
      toast.success("已删除");
      if (viewingPersona?.id === id) setViewingPersona(null);
    } catch (err) {
      toast.error("删除失败");
    }
  };

  const handleToggle = async (
    e: React.MouseEvent,
    style: MarketingPersonaRecord
  ) => {
    e.stopPropagation();
    try {
      const { user } = useUserStore.getState();
      if (!user) return;
      const updated = await togglePersonaActive(
        user.id,
        style.id,
        style.is_active
      );
      fetchPersonas();
      toast.success(updated.is_active ? "已激活该人设" : "已停用");
    } catch (err) {
      toast.error("操作失败");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板", { duration: 1000 });
  };

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
  };

  const filteredStyles =
    activeTab === "全部"
      ? styles
      : styles.filter(
          (s) =>
            s.category.includes(activeTab) || activeTab.includes(s.category)
        );

  const filterTabs = [
    "全部",
    "可爱萌妹",
    "知性御姐",
    "高冷女神",
    "元气少女",
    "清冷气质",
    "职场精英",
  ];

  return (
    <div className="flex-1 w-full pt-20 pb-8 px-4 bg-zinc-50/30 dark:bg-black/20 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all text-zinc-500 active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <Star
                  className="text-indigo-500 fill-indigo-500/10"
                  size={16}
                />
                人格实验室
              </h1>
              <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                Marketing Personas
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-full text-xs font-bold transition-all active:scale-95 shadow-lg shadow-zinc-900/10"
          >
            <Plus size={14} className="stroke-[2px]" />
            <span>AI 构建人设</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap border",
                activeTab === tab
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-zinc-300" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredStyles.map((style) => (
              <div
                key={style.id}
                onClick={() => setViewingPersona(style)}
                className={cn(
                  "group bg-white dark:bg-zinc-900/80 p-4 rounded-2xl border transition-all flex flex-col gap-4 relative overflow-hidden cursor-pointer",
                  style.is_active
                    ? "border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                    : "border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30"
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform",
                      getTagColor(style.category)
                    )}
                  >
                    {getTagIcon(style.category)}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-zinc-900 dark:text-white truncate text-sm tracking-tight">
                        {style.name}
                      </h3>
                      {style.is_active && (
                        <span className="text-[8px] font-black text-indigo-500 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-md uppercase tracking-tighter">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 dark:text-zinc-500 text-[10px] line-clamp-2 leading-snug font-medium mb-1">
                      {style.bio || "暂无简介"}
                    </p>
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-zinc-50 dark:border-zinc-800/50">
                  <div className="flex items-center gap-1 text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                    <MessageSquare size={10} className="text-indigo-500" />
                    <span>300 话术</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggle(e, style)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
                        style.is_active
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      {style.is_active ? "使用中" : "激活人设"}
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, style.id)}
                      className="p-1 text-zinc-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="absolute top-4 right-3">
                  <ChevronRight
                    size={14}
                    className="text-zinc-300 group-hover:text-indigo-500 transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredStyles.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Ghost size={40} className="text-zinc-300" />
            <p className="text-xs text-zinc-400 font-bold">
              {activeTab === "全部"
                ? "暂无营销人格，点击上方按钮开始 AI 创作"
                : `暂无“${activeTab}”分类的人格方案`}
            </p>
          </div>
        )}
      </div>

      {/* Detail Drawer (View Library) */}
      {viewingPersona && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setViewingPersona(null)}
          />
          <div className="relative w-full max-w-lg bg-zinc-50 dark:bg-zinc-950 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-zinc-200 dark:border-zinc-800">
            {/* Drawer Header */}
            <div className="p-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                      getTagColor(viewingPersona.category)
                    )}
                  >
                    {getTagIcon(viewingPersona.category)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {viewingPersona.name}
                    </h2>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {viewingPersona.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingPersona(null)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <User size={12} className="text-indigo-500" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                    博主简介
                  </span>
                  <button
                    onClick={() => handleCopy(viewingPersona.bio)}
                    className="ml-auto text-zinc-400 hover:text-indigo-500 transition-colors"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
                  {viewingPersona.bio}
                </p>
              </div>
            </div>

            {/* Scene Selector */}
            <div className="flex p-2 gap-1 bg-white dark:bg-zinc-900">
              {[
                { id: "reply", label: "回复粉丝", color: "text-rose-500" },
                { id: "dm", label: "私信回复", color: "text-indigo-500" },
                { id: "comment", label: "外拓互动", color: "text-amber-500" },
              ].map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => setActiveSceneTab(scene.id as SceneType)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1",
                    activeSceneTab === scene.id
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      : "text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] opacity-70",
                      activeSceneTab === scene.id
                        ? scene.color
                        : "text-zinc-300"
                    )}
                  >
                    100 条
                  </span>
                  {scene.label}
                </button>
              ))}
            </div>

            {/* Responses List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
              {viewingPersona.responses[activeSceneTab]?.map((resp, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopy(resp)}
                  className="group bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer relative"
                >
                  <div className="absolute top-4 left-3 text-[8px] font-bold text-zinc-300">
                    #{idx + 1}
                  </div>
                  <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed pl-6 pr-4">
                    {resp}
                  </p>
                  <div className="absolute top-4 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy
                      size={14}
                      className="text-zinc-400 hover:text-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 text-center">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <Sparkles size={12} className="text-indigo-500" />
                AI 生成的 300 条话术已全库就绪
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Persona Modal (Keep as is) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in"
            onClick={() => !isGenerating && setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-100 dark:border-zinc-800 p-6 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-indigo-500 fill-indigo-500/20" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  生成营销全案
                </h2>
              </div>
              {!isGenerating && (
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={16} className="text-zinc-400" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                  人设代号
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例如：高冷御姐、可爱萌妹、气质摄影师..."
                  disabled={isGenerating}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                  风格标签
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "可爱萌妹", icon: <Heart size={12} /> },
                    { name: "知性御姐", icon: <Coffee size={12} /> },
                    { name: "高冷女神", icon: <Ghost size={12} /> },
                    { name: "元气少女", icon: <Sun size={12} /> },
                    { name: "清冷气质", icon: <Star size={12} /> },
                    { name: "职场精英", icon: <Zap size={12} /> },
                    { name: "文艺博主", icon: <Sparkles size={12} /> },
                  ].map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setSelectedTag(cat.name);
                        setFormName(cat.name);
                      }}
                      disabled={isGenerating}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all transform active:scale-95",
                        selectedTag === cat.name
                          ? "bg-zinc-900 border-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                          : "bg-white dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:border-zinc-900 dark:hover:border-white"
                      )}
                    >
                      <span
                        className={cn(
                          selectedTag === cat.name
                            ? "text-inherit"
                            : "text-zinc-400 group-hover:text-inherit"
                        )}
                      >
                        {cat.icon}
                      </span>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                  人设描述关键词
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="描述人格特点，AI 将为你生成全套名字、简介及 300 条各场景话术库..."
                  disabled={isGenerating}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20 resize-none font-medium disabled:opacity-50"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {[
                    "语气活泼",
                    "逻辑严密",
                    "爱用Emoji",
                    "专业度高",
                    "亲和力强",
                    "简洁有力",
                  ].map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() =>
                        setFormDesc((prev) => (prev ? `${prev}, ${kw}` : kw))
                      }
                      className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[9px] font-bold rounded-md hover:text-indigo-500 transition-colors"
                    >
                      +{kw}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-zinc-50 dark:border-zinc-800">
              <button
                onClick={handleCreatePersona}
                disabled={isGenerating}
                className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 transition-all font-sans shadow-lg shadow-zinc-900/10"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>AI 深度生成中(约20s)...</span>
                  </>
                ) : (
                  "开始构建全案"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
