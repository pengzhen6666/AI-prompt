import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Ghost,
  X,
  Loader2,
  Trash2,
  Smile,
  Image as ImageIcon,
  Upload,
  Accessibility,
} from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import {
  getActionStyles,
  createActionStyle,
  deleteActionStyle,
  type ActionStyleRecord,
} from "@/servers/action_style";
import { analyzeActionFromImage } from "@/servers/ai";
import { uploadFileServerAPI, defaultBucket } from "@/servers/upload";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import { supabase } from "@/supabase";

const MEMBERSHIP_STYLE_LIMITS: Record<string, number> = {
  free: 1,
  pro: 3,
  ultra: 20,
};

export default function ActionStylePage() {
  const navigate = useNavigate();
  const [styles, setStyles] = useState<ActionStyleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchActionStyles();
  }, []);

  const fetchActionStyles = async () => {
    try {
      setLoading(true);
      const { user } = useUserStore.getState();
      if (!user) return;
      const data = await getActionStyles(user.id);
      setStyles(data);
    } catch (err) {
      toast.error("加载数据失败");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formName || !formDesc) {
      toast.error("请填写完整信息");
      return;
    }

    try {
      setIsSubmitting(true);
      const { user } = useUserStore.getState();
      if (!user) return;

      const newRecord = await createActionStyle(user.id, {
        name: formName,
        description: formDesc,
        image_url: uploadedImageUrl || "",
        category: "全部",
      });

      setStyles([newRecord, ...styles]);
      setIsAddModalOpen(false);
      resetForm();
      toast.success("动作库记录添加成功！");
    } catch (error) {
      toast.error("添加失败，请重试");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("确定要删除这个动作吗？")) return;
    try {
      await deleteActionStyle(id);
      setStyles(styles.filter((s) => s.id !== id));
      toast.success("已删除");
    } catch (err) {
      toast.error("删除失败");
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setPreviewUrl(null);
    setUploadedImageUrl(null);
  };

  /**
   * 统一处理图片上传与分析逻辑
   */
  const handleFileUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("请上传有效的图片文件");
      return;
    }

    setFormFile(file);
    // 生成本地预览
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      setIsSubmitting(true);

      // 1. 立即上传图片
      const { data, error } = await uploadFileServerAPI({
        file,
        bucket: defaultBucket,
      });

      if (error) {
        toast.error("图片上传失败");
        throw error;
      }

      if (data) {
        const { data: publicUrlData } = supabase.storage
          .from(defaultBucket)
          .getPublicUrl(data.path);
        setUploadedImageUrl(publicUrlData.publicUrl);
      }

      // 2. AI 解析动作
      const result = await analyzeActionFromImage(file);
      setFormDesc(result);
      toast.success("图片上传并解析完成");
    } catch (err) {
      toast.error("处理失败，请重试");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full pt-20 pb-8 px-4 bg-zinc-50/30 dark:bg-black/20 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all text-zinc-500 active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <Accessibility
                  className="text-purple-500 fill-purple-500/10"
                  size={18}
                />
                动作实验室
              </h1>
              <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                Action Style Library
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const { profile } = useUserStore.getState();
              const membershipCode = profile?.membership_code || "free";
              const currentLimit = MEMBERSHIP_STYLE_LIMITS[membershipCode] || 1;
              if (styles.length >= currentLimit) {
                toast.warning(
                  `当前等级 (${membershipCode}) 限制最多创建 ${currentLimit} 个动作。升级会员以解锁更多名额！`
                );
                return;
              }
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-full text-xs font-bold transition-all active:scale-95 shadow-lg shadow-zinc-900/10"
          >
            <Plus size={14} className="stroke-[2px]" />
            <span>新增动作</span>
          </button>
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-zinc-300" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {styles.map((style) => (
              <div
                key={style.id}
                className="group bg-white dark:bg-zinc-900/80 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-purple-500/30 transition-all flex flex-col gap-4 relative overflow-hidden cursor-default shadow-sm hover:shadow-lg hover:shadow-purple-500/5"
              >
                <div className="flex items-start gap-4">
                  {/* Image Preview */}
                  <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 border border-zinc-50 dark:border-zinc-700/50">
                    {style.image_url ? (
                      <img
                        src={style.image_url}
                        alt={style.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-zinc-900 dark:text-white truncate text-sm tracking-tight">
                        {style.name}
                      </h3>
                    </div>
                    <p className="text-zinc-400 dark:text-zinc-500 text-[10px] line-clamp-3 leading-snug font-medium mb-1">
                      {style.description || "暂无描述"}
                    </p>
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-zinc-50 dark:border-zinc-800/50">
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(e, style.id)}
                      className="p-1 text-zinc-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && styles.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Ghost size={40} className="text-zinc-300" />
            <p className="text-xs text-zinc-400 font-bold">
              暂无动作预设，点击上方按钮新增
            </p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in"
            onClick={() => !isSubmitting && setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-100 dark:border-zinc-800 p-6 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Accessibility
                  size={16}
                  className="text-purple-500 fill-purple-500/20"
                />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  新增动作预设
                </h2>
              </div>
              {!isSubmitting && (
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={16} className="text-zinc-400" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* 姓名输入 */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                  动作名称
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="如：慵懒坐姿、动感奔跑、优雅回眸..."
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium disabled:opacity-50"
                />
              </div>

              {/* 图片上传展示区 */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                  解析图片
                </label>
                <div
                  onClick={() =>
                    !isSubmitting &&
                    document.getElementById("ai-action-upload")?.click()
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isSubmitting) setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (isSubmitting) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className={cn(
                    "relative aspect-video rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer group overflow-hidden",
                    previewUrl || isDragging
                      ? "border-purple-500 bg-purple-500/5 shadow-inner"
                      : "border-zinc-100 dark:border-zinc-800 hover:border-purple-500/30 bg-zinc-50/50 dark:bg-zinc-800/20",
                    isSubmitting && "opacity-50 cursor-wait saturate-0"
                  )}
                >
                  {previewUrl ? (
                    <>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <Upload
                          size={24}
                          className="text-white animate-bounce"
                        />
                        <span className="text-[10px] text-white font-bold opacity-80">
                          更换图片
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full bg-purple-100/50 dark:bg-purple-500/10 flex items-center justify-center mb-3 transition-all",
                          isDragging
                            ? "scale-125 bg-purple-500 text-white"
                            : "group-hover:scale-110 text-purple-500"
                        )}
                      >
                        {isDragging ? (
                          <Upload size={24} />
                        ) : (
                          <ImageIcon size={24} />
                        )}
                      </div>
                      <div className="text-center space-y-1">
                        <span className="text-[10px] font-bold text-zinc-500 group-hover:text-purple-500 block transition-colors">
                          {isDragging
                            ? "松开即刻开始解析"
                            : "点击或拖拽图片到此处"}
                        </span>
                        <span className="text-[8px] font-medium text-zinc-400 block">
                          AI 自动执行肢体动作分析
                        </span>
                      </div>
                    </>
                  )}

                  {isSubmitting && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 animate-in fade-in">
                      <Loader2
                        size={24}
                        className="animate-spin text-purple-500"
                      />
                      <span className="text-[10px] font-black text-purple-600 animate-pulse tracking-widest">
                        ANALYZING...
                      </span>
                    </div>
                  )}
                </div>
                <input
                  id="ai-action-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>

              {/* AI 展示框 */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 flex items-center justify-between">
                  <span>动作形态分析报告</span>
                  {formDesc && !isSubmitting && (
                    <span className="text-[8px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded-md animate-pulse">
                      AI 深度解析已就绪
                    </span>
                  )}
                </label>
                <div
                  className={cn(
                    "relative group transition-all duration-500",
                    formDesc &&
                      !isSubmitting &&
                      "ring-1 ring-purple-500/20 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.05)]"
                  )}
                >
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="解析结果将在此展示..."
                    disabled={isSubmitting}
                    className={cn(
                      "w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500 h-40 resize-none font-medium leading-relaxed transition-all",
                      isSubmitting
                        ? "opacity-40"
                        : "text-zinc-600 dark:text-zinc-300"
                    )}
                  />
                  {isSubmitting && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/10 dark:bg-black/5 backdrop-blur-[1px] rounded-2xl">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce"></span>
                      </div>
                      <span className="text-[10px] font-black text-purple-600/60 tracking-widest uppercase">
                        Structure Processing
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-zinc-50 dark:border-zinc-800">
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !formDesc || !formName}
                className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-30 transition-all font-sans shadow-lg shadow-zinc-900/10"
              >
                保存到动作库
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
