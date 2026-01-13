import React, { useEffect, useState, useMemo } from "react";
import {
  updateUserProfileServerAPI,
  logoutUserServerAPI,
  getUserInfoServerAPI,
} from "@/servers/user";
import {
  redeemGiftCardServerAPI,
} from "@/servers/giftcards";
import { applyInvitationCode } from "@/servers/invitation";
import { Html5Qrcode } from "html5-qrcode";
import {
  getUserPromptHistory,
  getUserCopywritingHistory,
  deleteUserPromptHistory,
  deleteUserCopywritingHistory,
  batchDeleteUserPromptHistory,
  batchDeleteUserCopywritingHistory,
  batchSubmitPrompts,
  UserHistoryPrompt,
  UserHistoryCopywriting,
} from "@/servers/history";
import {
  getActivePersona,
  type MarketingPersonaRecord,
} from "@/servers/marketing";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/types";
import {
  User as UserIcon,
  Mail,
  Edit2,
  Check,
  X,
  Loader2,
  LogOut,
  Zap,
  Image as ImageIcon,
  FileText,
  Calendar,
  Grid,
  Laptop,
  Trash2,
  Sparkles,
  Menu,
  Share2,
  ScanLine,
  Settings,
  ChevronDown,
  Search,
  ShoppingBag,
  Lightbulb,
  Plus,
  Lock,
  MessageSquare,
  MessageCircle,
  Smile,
  Accessibility,
  CreditCard,
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";

const XiaohongshuCard = ({
  profile,
  activePersona,
  user,
  notes = [],
}: {
  profile: UserProfile | null;
  activePersona: MarketingPersonaRecord | null;
  user: User | null;
  notes?: UserHistoryCopywriting[];
}) => {
  if (!profile || !user) return null;

  return (
    <div className="relative overflow-hidden bg-black rounded-[28px] text-white shadow-2xl w-[375px] h-[820px] shrink-0 font-sans flex flex-col select-none">
      {/* Background Image & Overlay */}
      <div className="absolute inset-x-0 top-0 h-[400px] z-0">
        <img
          src={notes[0]?.image_url || "/copywriting_avatar.webp"}
          className="w-full h-full object-cover opacity-80"
          alt="bg"
        />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black"></div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 1. Status Bar (Mock) */}
        <div className="flex justify-between items-center px-6 pt-5 pb-2 text-[14px] font-medium text-white/95">
          <span className="tracking-tighter font-semibold">15:54</span>
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-end -space-y-0.5 mr-0.5">
              <span className="text-[8px] scale-[0.7] origin-right font-bold leading-none">
                4.43
              </span>
              <span className="text-[8px] scale-[0.6] origin-right opacity-60 font-bold leading-none">
                KB/s
              </span>
            </div>
            <span className="text-[10px] font-bold mr-0.5">4G</span>
            {/* Signal bars */}
            <div className="flex items-end gap-px h-[9px] mb-px">
              <div className="w-[2.5px] h-[35%] bg-white rounded-[0.5px]"></div>
              <div className="w-[2.5px] h-[55%] bg-white rounded-[0.5px]"></div>
              <div className="w-[2.5px] h-[80%] bg-white rounded-[0.5px]"></div>
              <div className="w-[2.5px] h-full bg-white rounded-[0.5px]"></div>
            </div>
            {/* Battery */}
            <div className="flex items-center gap-0.5 ml-0.5">
              <div className="w-[21px] h-[10.5px] border border-white/40 rounded-[2.5px] relative p-[0.5px] flex items-center">
                <div
                  className="h-full bg-white rounded-[1.5px]"
                  style={{ width: "100%" }}
                ></div>
                <span className="absolute inset-0 flex items-center justify-center text-[7.5px] font-black text-white mix-blend-difference z-10 scale-90">
                  100
                </span>
                {/* Battery tip */}
                <div className="absolute -right-px top-1/2 -translate-y-1/2 w-px h-[3.5px] bg-white/40 rounded-r-[0.5px]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Top Navigation */}
        <div className="flex items-center justify-between px-4 mb-4">
          <Menu size={22} className="text-white" strokeWidth={1.5} />
          <div className="flex items-center gap-5">
            <ScanLine size={19} className="text-white" strokeWidth={1.5} />
            <Share2 size={19} className="text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* 3. Profile Info */}
        <div className="px-5 mb-4 flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="w-[84px] h-[84px] rounded-full border border-white/50 overflow-hidden">
              <img
                src={notes[1]?.image_url || "/copywriting_avatar.webp"}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-px right-px w-5 h-5 bg-yellow-300 rounded-full flex items-center justify-center text-black shadow-md">
              <Plus size={11} strokeWidth={3.5} />
            </div>
          </div>
          <div className="flex-1 pt-2">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[20px] font-medium tracking-tight text-white drop-shadow-md">
                {activePersona?.name || profile.full_name || "未命名用户"}
              </h2>
              <ChevronDown size={16} className="text-white/80" />
            </div>
            <div className="text-[11px] text-white/50 font-normal space-y-0.5 leading-tight">
              <div className="flex items-center gap-2">
                <span>小红书号：{user.id.slice(0, 9)}</span>
                <Grid size={10} className="text-white/50" />
              </div>
              <div>IP属地：广东</div>
            </div>
          </div>
        </div>

        {/* 4. Bio */}
        <div className="px-5 mb-3">
          <p className="text-[13px] text-white leading-relaxed font-normal line-clamp-2">
            {activePersona?.bio ||
              "想要原图的宝子们，记得在评论区滴滴我呀 ~ (●'◡'●)"}
          </p>
        </div>

        {/* 5. Tags */}
        <div className="px-5 flex flex-wrap gap-1.5 mb-5">
          <div className="bg-white/10 backdrop-blur-md rounded-full px-2 py-0.5 flex items-center gap-1">
            <span className="text-[#ff8da8] text-[10px]">♀</span>
            <span className="text-white text-[10px]">23岁</span>
          </div>
          {activePersona?.category && (
            <span className="px-2.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] text-white">
              {activePersona.category}
            </span>
          )}
          <span className="px-2.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] text-white/90">
            ✨ 摄影博主
          </span>
          <span className="px-2.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] text-white/90">
            时尚博主
          </span>
        </div>

        <div className="px-5 flex items-center justify-between mb-5">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-[14px] font-medium text-white">19</span>
              <span className="text-[10px] text-white/50 font-light">关注</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[14px] font-medium text-white">363</span>
              <span className="text-[10px] text-white/50 font-light">粉丝</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[14px] font-medium text-white">1480</span>
              <span className="text-[10px] text-white/50 font-light">
                获赞与收藏
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="px-3.5 py-1 rounded-full border border-white/20 text-[11px] text-white font-medium bg-white/5 backdrop-blur-sm">
              编辑资料
            </button>
            <button className="px-2 py-1 rounded-full border border-white/20 text-white bg-white/5 backdrop-blur-sm">
              <Settings size={13} />
            </button>
          </div>
        </div>

        {/* 7. Gray Action Grid */}
        <div className="px-2 mb-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#333]/60 backdrop-blur-md rounded-lg p-3 flex flex-col justify-center min-h-[64px]">
              <div className="text-[13px] text-white font-medium mb-0.5">
                订单
              </div>
              <div className="text-[10px] text-white/40">查看我的订单</div>
            </div>
            <div className="bg-[#333]/60 backdrop-blur-md rounded-lg p-3 flex flex-col justify-center min-h-[64px]">
              <div className="text-[13px] text-white font-medium mb-0.5">
                购物车
              </div>
              <div className="text-[10px] text-white/40">查看推荐好物</div>
            </div>
            <div className="bg-[#333]/60 backdrop-blur-md rounded-lg p-3 flex flex-col justify-center min-h-[64px]">
              <div className="text-[13px] text-white font-medium mb-0.5">
                创作灵感
              </div>
              <div className="text-[10px] text-white/40">学创作找灵感</div>
            </div>
          </div>
        </div>

        {/* 8. White Content Area (Rounded Top) */}
        <div className="flex-1 bg-white rounded-t-[16px] pt-3 overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="flex items-center px-4 border-b border-gray-100/50 pb-2 mb-2 sticky top-0 z-10 bg-white">
            <div className="flex items-center gap-6 flex-1 ml-4 text-[14px]">
              <div className="relative font-bold text-[#333]">
                笔记
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#ff2442]"></div>
              </div>
              <div className="text-gray-400 font-medium flex items-center gap-1.5 opacity-80">
                <Lock size={12} strokeWidth={2.5} className="mt-0.5" />
                收藏
              </div>
              <div className="text-gray-400 font-medium flex items-center gap-1.5 opacity-80">
                <Lock size={12} strokeWidth={2.5} className="mt-0.5" />
                赞过
              </div>
            </div>
            <Search size={16} className="text-gray-400 ml-auto" />
          </div>

          {/* Sub Tabs */}
          <div className="flex items-center gap-5 px-6 mb-3 text-[12px]">
            <span className="text-[#333] font-medium">公开 24</span>
            <span className="text-gray-400">私密 8</span>
            <span className="text-gray-400">合集 0</span>
          </div>

          {/* Note Grid */}
          <div className="grid grid-cols-2 gap-1 px-1 overflow-y-auto no-scrollbar pb-16">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-md overflow-hidden pb-2"
              >
                <div className="relative aspect-3/4 bg-gray-100 rounded-md overflow-hidden mb-2">
                  <img
                    src={note.image_url || ""}
                    className="w-full h-full object-cover"
                    alt="cover"
                  />
                </div>
                <div className="px-1.5">
                  <h3 className="text-[13px] text-[#333] font-medium leading-tight line-clamp-2 mb-2">
                    {note.description || note.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={profile.avatar_url || ""}
                        className="w-4 h-4 rounded-full object-cover"
                        alt="mini"
                      />
                      <span className="text-[10px] text-gray-400 truncate max-w-[50px]">
                        {activePersona?.name || profile.full_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-gray-400">
                      <span className="text-[10px]">♡ 赞</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center opacity-40">
                <ImageIcon size={24} className="mb-2 text-gray-200" />
                <span className="text-[10px] text-gray-400">暂无公开笔记</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Tab Bar (Fixed) */}
        <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-white border-t border-gray-100 flex items-center justify-around px-2 text-[10px] z-50">
          <div className="flex flex-col items-center gap-0.5 text-gray-400">
            <span className="text-[18px] font-bold">首页</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-gray-400">
            <span className="text-[16px] font-medium">视频</span>
          </div>
          <div className="w-10 h-7 bg-[#ff2442] rounded-[10px] flex items-center justify-center shadow-md">
            <Plus className="text-white" size={20} strokeWidth={3} />
          </div>
          <div className="flex flex-col items-center gap-0.5 text-gray-400 relative">
            <span className="text-[16px] font-medium">消息</span>
            <div className="absolute -top-1.5 -right-1.5 bg-[#ff2442] text-white text-[9px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full border border-white/20">
              7
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-[#333]">
            <span className="text-[16px] font-bold">我</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Profile() {
  const { user, profile, loading: storeLoading, setProfile } = useUserStore();
  const [activePersona, setActivePersona] =
    useState<MarketingPersonaRecord | null>(null);
  const [loadingPersona, setLoadingPersona] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<{
    title: string;
    items: string[];
    color: string;
  } | null>(null);

  // Redeem Logic
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [redeemType, setRedeemType] = useState<"card" | "invitation">(
    "invitation"
  );
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Monitor scanning state
  useEffect(() => {
    if (isScanning && redeemModalOpen) {
      const html5QrCode = new Html5Qrcode("reader");
      setScanner(html5QrCode);

      html5QrCode
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            setRedeemCode(decodedText);
            stopScanning(html5QrCode);
            toast.success("识别成功");
          },
          (errorMessage) => {
            // Silently ignore camera frames that don't have QR codes
            // if (errorMessage.includes("No MultiFormat Readers were able to decode the image")) return;
            // console.warn("QR Scan Error:", errorMessage);
          }
        )
        .catch((err) => {
          console.error("Scanner start error:", err);
          setScanError("无法启动摄像头，请检查权限设置");
          setIsScanning(false);
        });

      return () => {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch(console.error);
        }
      };
    } else if (!isScanning && scanner) {
      stopScanning(scanner);
    }
  }, [isScanning, redeemModalOpen]);

  const stopScanning = async (qrInstance: Html5Qrcode | null) => {
    if (qrInstance && qrInstance.isScanning) {
      try {
        await qrInstance.stop();
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
    }
    setIsScanning(false);
    setScanner(null);
  };

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (dialogOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [dialogOpen]);

  // Profile Editing
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [updating, setUpdating] = useState(false);

  // Tabs & History
  const [activeTab, setActiveTab] = useState<"prompts" | "copywriting">(
    "copywriting"
  );
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [prompts, setPrompts] = useState<UserHistoryPrompt[]>([]);
  const [copywriting, setCopywriting] = useState<UserHistoryCopywriting[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Deletion
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"prompts" | "copywriting">(
    "prompts"
  );
  const [deleting, setDeleting] = useState(false);

  // Bulk Actions
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const navigate = useNavigate();

  // --- Initial Data Fetch (Persona Only) ---
  useEffect(() => {
    if (user) {
      setNewName(profile?.full_name || user.email?.split("@")[0] || "");

      const fetchPersona = async () => {
        try {
          const persona = await getActivePersona(user.id);
          setActivePersona(persona);
        } catch (error) {
          console.error("Persona fetch error:", error);
        } finally {
          setLoadingPersona(false);
        }
      };
      fetchPersona();
    }
  }, [user]);

  // --- History Fetching ---
  const fetchHistory = async (reset = false) => {
    if (!user) return;

    setLoadingHistory(true);
    try {
      const currentPage = reset ? 0 : page;
      const pageSize = 12; // 12 items per page

      if (activeTab === "prompts") {
        const { data, count } = await getUserPromptHistory(user.id, {
          page: currentPage,
          pageSize,
        });
        setPrompts((prev) => (reset ? data : [...prev, ...data]));
        setHasMore((currentPage + 1) * pageSize < (count || 0));
      } else {
        const { data, count } = await getUserCopywritingHistory(user.id, {
          page: currentPage,
          pageSize,
        });
        setCopywriting((prev) => (reset ? data : [...prev, ...data]));
        setHasMore((currentPage + 1) * pageSize < (count || 0));
      }

      setPage((prev) => (reset ? 1 : prev + 1));
    } catch (error) {
      toast.error("加载历史记录失败");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Reset and fetch when tab changes
  useEffect(() => {
    if (user) {
      setPage(0); // Reset page first
      fetchHistory(true); // Fetch page 0
    }
  }, [activeTab, user]);

  const handleLoadMore = () => {
    fetchHistory(false);
  };

  // --- Actions ---
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUserServerAPI();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === profile?.full_name) {
      setIsEditing(false);
      return;
    }
    setUpdating(true);
    try {
      const updated = await updateUserProfileServerAPI({
        full_name: newName.trim(),
      });
      setProfile(updated);
      toast.success("用户名已更新");
      setIsEditing(false);
    } catch (error) {
      toast.error("保存失败，请重试");
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      if (activeTab === "prompts") {
        await batchDeleteUserPromptHistory(selectedIds);
        setPrompts((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      } else {
        await batchDeleteUserCopywritingHistory(selectedIds);
        setCopywriting((prev) =>
          prev.filter((i) => !selectedIds.includes(i.id))
        );
      }
      toast.success(`成功删除 ${selectedIds.length} 条记录`);
      setSelectedIds([]);
      setIsManageMode(false);
      setIsBulkDeleteModalOpen(false);
    } catch (error) {
      toast.error("批量删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0) return;
    setBulkSubmitting(true);
    try {
      const selectedItems = prompts.filter((p) => selectedIds.includes(p.id));
      const submissionItems = selectedItems.map((p) => ({
        id: p.id,
        user_id: user!.id,
        image_url: p.image_url,
        prompt_result: p.prompt_result,
      }));

      await batchSubmitPrompts(submissionItems);

      setPrompts((prev) =>
        prev.map((p) =>
          selectedIds.includes(p.id) ? { ...p, is_submitted: true } : p
        )
      );

      toast.success(`成功投稿 ${selectedIds.length} 条记录`);
      setSelectedIds([]);
      setIsManageMode(false);
    } catch (error) {
      toast.error("批量投稿失败");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentListIds =
      activeTab === "prompts"
        ? prompts.map((i) => i.id)
        : copywriting.map((i) => i.id);
    if (selectedIds.length === currentListIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentListIds);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      if (deleteType === "prompts") {
        await deleteUserPromptHistory(deleteId);
        setPrompts((prev) => prev.filter((i) => i.id !== deleteId));
      } else {
        await deleteUserCopywritingHistory(deleteId);
        setCopywriting((prev) => prev.filter((i) => i.id !== deleteId));
      }
      toast.success("记录已删除");
      setDeleteId(null);
    } catch (error) {
      toast.error("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      let label = "兑换码 / 邀请码";
      if (redeemType === "card") label = "礼品卡号";
      toast.error(`请输入${label}`);
      return;
    }
    if (!user) return;

    setRedeeming(true);
    try {
      let res: { data?: any; error?: { message?: string } | any } = {};

      if (redeemType === "card") {
        res = await redeemGiftCardServerAPI(redeemCode.trim(), user.id);
      } else {
        // Handle both "code" and "invitation" with applyInvitationCode
        res = await applyInvitationCode(user.id, redeemCode.trim());
      }

      if (res.error) {
        toast.error(res.error.message || res.error || "兑换失败");
      } else if (res.data?.success === false) {
        // Handle explicit success: false from RPC/Server
        toast.error(res.data.message || "兑换失败");
      } else {
        toast.success("兑换成功！");
        setRedeemCode("");
        setRedeemModalOpen(false);
        // Refresh balance
        const { data: userData } = await getUserInfoServerAPI(user);
        if (userData?.profile) {
          setProfile(userData.profile);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "兑换过程中发生错误");
    } finally {
      setRedeeming(false);
    }
  };

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRedeeming(true);
    const html5QrCode = new Html5Qrcode("reader");
    try {
      const decodedText = await html5QrCode.scanFileV2(file, false);
      setRedeemCode(decodedText.decodedText);
      toast.success("图片码识别成功");
    } catch (err) {
      console.error("Image scan error:", err);
      toast.error("未能识别图片中的二维码");
    } finally {
      html5QrCode.clear();
      setRedeeming(false);
      // Reset input
      e.target.value = "";
    }
  };
  // --- Layout Helper ---
  // Simple Masonry-like columns for prompts (just 2 cols for mobile, 3/4 for desktop)
  // Or just use Grid for simplicity and stability

  if (storeLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-zinc-400" size={24} />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex-1 w-full pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-zinc-50/50 dark:bg-black/50 min-h-screen overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Left Side: Ultra Card */}
          {profile?.membership_code === "ultra" && (
            <div className="shrink-0 flex justify-center lg:justify-start">
              <XiaohongshuCard
                profile={profile}
                user={user}
                activePersona={activePersona}
                notes={copywriting.slice(0, 2)}
              />
            </div>
          )}

          {/* Right Side: Main Profile Card */}
          <div className="flex-1 relative bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none border border-white/50 dark:border-zinc-800">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-linear-to-bl from-yellow-200/20 via-orange-100/10 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10 flex flex-col md:flex-row gap-8 md:items-start justify-between">
              <div className="flex justify-between items-center w-full">
                {/* Available User Info */}
                <div className="flex flex-col gap-4 max-w-2xl">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 p-[3px] shadow-lg shrink-0">
                      <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon size={32} className="text-zinc-300" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleUpdateName()
                              }
                              className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-1 text-xl font-bold text-zinc-900 dark:text-white outline-none w-48"
                            />
                            <button
                              onClick={handleUpdateName}
                              className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setIsEditing(false)}
                              className="p-1.5 bg-zinc-200 text-zinc-500 rounded-lg hover:bg-zinc-300"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                              {profile?.full_name || "未命名用户"}
                            </h1>
                            <button
                              onClick={() => setIsEditing(true)}
                              className="p-1.5 text-zinc-400 hover:text-indigo-500 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400 font-medium">
                        <Mail size={14} />
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Simplified Balance Account Section */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 transition-colors">
                        <CreditCard size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-zinc-400">
                          账户余额
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-zinc-900 dark:text-white">
                            {profile?.balance || 0}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter">
                            Credits
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setRedeemModalOpen(true)}
                      className="px-5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      充值与兑换
                    </button>
                  </div>

                  {/* Membership Badge & Actions */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg transform hover:scale-105 transition-transform",
                        profile?.membership_code === "ultra"
                          ? "bg-linear-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-amber-900 shadow-amber-500/20"
                          : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                      )}
                    >
                      <Zap
                        size={12}
                        className={cn(
                          "fill-current",
                          profile?.membership_code === "ultra" &&
                          "text-amber-800"
                        )}
                      />
                      {profile?.membership_level?.name || "普通用户"}
                    </div>

                    <button
                      onClick={() => navigate("/style")}
                      className="relative group active:translate-y-0 transition-all duration-200"
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-indigo-600 to-purple-800 rounded-full"></div>
                      <div className="relative flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white bg-linear-to-r from-indigo-500 to-purple-600 rounded-full transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0 shadow-md uppercase tracking-wider">
                        <Sparkles
                          size={12}
                          className="text-white group-hover:scale-110 transition-transform"
                        />
                        <span>人格设置</span>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/face-style")}
                      className="relative group active:translate-y-0 transition-all duration-200"
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-amber-600 to-orange-800 rounded-full"></div>
                      <div className="relative flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white bg-linear-to-r from-amber-500 to-orange-600 rounded-full transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0 shadow-md uppercase tracking-wider">
                        <Smile
                          size={12}
                          className="text-white group-hover:scale-110 transition-transform"
                        />
                        <span>人脸实验室</span>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/action-style")}
                      className="relative group active:translate-y-0 transition-all duration-200"
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-purple-600 to-fuchsia-800 rounded-full"></div>
                      <div className="relative flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white bg-linear-to-r from-purple-500 to-fuchsia-600 rounded-full transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0 shadow-md uppercase tracking-wider">
                        <Accessibility
                          size={12}
                          className="text-white group-hover:scale-110 transition-transform"
                        />
                        <span>动作实验室</span>
                      </div>
                    </button>

                    {profile?.membership_code === "free" && (
                      <button
                        onClick={() => navigate("/pricing")}
                        className="text-[10px] font-bold text-indigo-500 hover:underline decoration-2 underline-offset-4"
                      >
                        升级会员解锁更多权益 →
                      </button>
                    )}
                  </div>
                </div>
                {/* Logout Button */}
                <div className="flex items-start">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <LogOut
                        size={16}
                        className="group-hover:-translate-x-0.5 transition-transform"
                      />
                    )}
                    {isLoggingOut ? "正在退出..." : "退出登录"}
                  </button>
                </div>
              </div>
            </div>
            {/* Persona Responses Section (Integrated inside card) */}
            {activePersona && !loadingPersona && (
              <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* DM Responses */}
                <div className="group flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-indigo-50 dark:bg-indigo-100/10 text-indigo-500 dark:text-indigo-400 rounded-lg">
                        <Mail size={14} />
                      </div>
                      <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                        DM 话术样本
                      </h3>
                    </div>
                    {(activePersona.responses.dm?.length || 0) > 6 && (
                      <button
                        onClick={() => {
                          setDialogData({
                            title: "DM 话术样本",
                            items: activePersona.responses.dm || [],
                            color: "indigo",
                          });
                          setDialogOpen(true);
                        }}
                        className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
                      >
                        更多
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activePersona.responses.dm?.slice(0, 6).map((text, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-500/5 text-zinc-600 dark:text-indigo-300 text-[11px] rounded-full border border-indigo-100/50 dark:border-indigo-500/20 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all cursor-default"
                        title={text}
                      >
                        {text}
                      </div>
                    ))}
                    {(!activePersona.responses.dm ||
                      activePersona.responses.dm.length === 0) && (
                        <div className="text-[10px] text-zinc-300 dark:text-zinc-600 italic py-1">
                          暂无数据
                        </div>
                      )}
                  </div>
                </div>

                {/* Reply Responses */}
                <div className="group flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-50 dark:bg-blue-100/10 text-blue-500 dark:text-blue-400 rounded-lg">
                        <MessageSquare size={14} />
                      </div>
                      <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                        回复模版
                      </h3>
                    </div>
                    {(activePersona.responses.reply?.length || 0) > 6 && (
                      <button
                        onClick={() => {
                          setDialogData({
                            title: "回复模版",
                            items: activePersona.responses.reply || [],
                            color: "blue",
                          });
                          setDialogOpen(true);
                        }}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        更多
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activePersona.responses.reply
                      ?.slice(0, 6)
                      .map((text, i) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-500/5 text-zinc-600 dark:text-blue-300 text-[11px] rounded-full border border-blue-100/50 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all cursor-default"
                          title={text}
                        >
                          {text}
                        </div>
                      ))}
                    {(!activePersona.responses.reply ||
                      activePersona.responses.reply.length === 0) && (
                        <div className="text-[10px] text-zinc-300 dark:text-zinc-600 italic py-1">
                          暂无数据
                        </div>
                      )}
                  </div>
                </div>

                {/* Comment Responses */}
                <div className="group flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-purple-50 dark:bg-purple-100/10 text-purple-500 dark:text-purple-400 rounded-lg">
                        <MessageCircle size={14} />
                      </div>
                      <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                        引流互动
                      </h3>
                    </div>
                    {(activePersona.responses.comment?.length || 0) > 6 && (
                      <button
                        onClick={() => {
                          setDialogData({
                            title: "引流互动",
                            items: activePersona.responses.comment || [],
                            color: "purple",
                          });
                          setDialogOpen(true);
                        }}
                        className="text-[10px] font-bold text-purple-500 hover:text-purple-600 transition-colors"
                      >
                        更多
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activePersona.responses.comment
                      ?.slice(0, 6)
                      .map((text, i) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 bg-purple-50/50 dark:bg-purple-500/5 text-zinc-600 dark:text-purple-300 text-[11px] rounded-full border border-purple-100/50 dark:border-purple-500/20 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:border-purple-200 dark:hover:border-purple-500/30 transition-all cursor-default"
                          title={text}
                        >
                          {text}
                        </div>
                      ))}
                    {(!activePersona.responses.comment ||
                      activePersona.responses.comment.length === 0) && (
                        <div className="text-[10px] text-zinc-300 dark:text-zinc-600 italic py-1">
                          暂无数据
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Tabs Navigation & Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-white dark:bg-zinc-900 rounded-2xl w-fit shadow-sm border border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => {
                setActiveTab("prompts");
                setIsManageMode(false);
                setSelectedIds([]);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "prompts"
                  ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
            >
              <ImageIcon size={16} />
              我的 Prompt
            </button>
            <button
              onClick={() => {
                setActiveTab("copywriting");
                setIsManageMode(false);
                setSelectedIds([]);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "copywriting"
                  ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
            >
              <FileText size={16} />
              我的文案
            </button>
          </div>

          <div className="flex items-center gap-3">
            {(activeTab === "prompts"
              ? prompts.length > 0
              : copywriting.length > 0) && (
                <button
                  onClick={() => {
                    setIsManageMode(!isManageMode);
                    setSelectedIds([]);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                    isManageMode
                      ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                      : "bg-white text-zinc-600 border-zinc-100 hover:border-zinc-200"
                  )}
                >
                  {isManageMode ? "退出管理" : "批量管理"}
                </button>
              )}
          </div>
        </div>

        {/* 3. Content Area */}
        <div className="min-h-[400px]">
          {loadingHistory && page === 0 ? (
            <div className="w-full h-64 flex items-center justify-center">
              <Loader2 className="animate-spin text-zinc-300" size={32} />
            </div>
          ) : (
            <>
              {/* --- PROMPTS GRID --- */}
              {activeTab === "prompts" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {prompts.map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        isManageMode
                          ? toggleSelect(item.id)
                          : navigate(`/prompt?id=${item.id}`)
                      }
                      className={cn(
                        "group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col cursor-pointer relative",
                        selectedIds.includes(item.id)
                          ? "ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-100 scale-[0.98]"
                          : "border-zinc-100 dark:border-zinc-800 hover:shadow-xl hover:-translate-y-1"
                      )}
                    >
                      {/* Selection Overlay */}
                      {isManageMode && (
                        <div className="absolute top-4 left-4 z-20">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                              selectedIds.includes(item.id)
                                ? "bg-indigo-500 border-indigo-500"
                                : "bg-white/80 border-white/50 backdrop-blur-sm"
                            )}
                          >
                            {selectedIds.includes(item.id) && (
                              <Check
                                size={14}
                                className="text-white"
                                strokeWidth={4}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      <div className="relative aspect-3/4 overflow-hidden bg-zinc-100">
                        <img
                          src={item.image_url}
                          alt="prompt"
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="text-[10px] text-zinc-400 font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                          <Calendar size={10} />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300 font-mono line-clamp-3 leading-relaxed mb-4 flex-1">
                          {item.prompt_result}
                        </p>
                        <div className="pt-4 border-t border-dashed border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-md ${item.is_submitted
                                ? "bg-green-50 text-green-600"
                                : "bg-zinc-50 text-zinc-400"
                              }`}
                          >
                            {item.is_submitted ? "已投稿" : "未投稿"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(item.id);
                              setDeleteType("prompts");
                            }}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* --- COPYWRITING GRID --- */}
              {activeTab === "copywriting" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {copywriting.map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        isManageMode
                          ? toggleSelect(item.id)
                          : navigate(`/image-to-text?id=${item.id}`)
                      }
                      className={cn(
                        "bg-white dark:bg-zinc-900 rounded-3xl p-6 border transition-all duration-300 group cursor-pointer relative min-h-[280px] flex flex-col",
                        selectedIds.includes(item.id)
                          ? "ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-100 scale-[0.98]"
                          : "border-zinc-100 dark:border-zinc-800 hover:shadow-xl"
                      )}
                    >
                      {/* Selection Overlay */}
                      {isManageMode && (
                        <div className="absolute top-4 left-4 z-20">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                              selectedIds.includes(item.id)
                                ? "bg-indigo-500 border-indigo-500"
                                : "bg-zinc-100 border-zinc-200"
                            )}
                          >
                            {selectedIds.includes(item.id) && (
                              <Check
                                size={14}
                                className="text-white"
                                strokeWidth={4}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-4 mb-4">
                        <div className="w-20 h-20 rounded-2xl bg-zinc-100 overflow-hidden shrink-0">
                          <img
                            src={item.image_url || "/placeholder.png"}
                            className="w-full h-full object-cover"
                            alt="cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-zinc-900 dark:text-white truncate mb-1">
                            {item.title || "无标题文案"}
                          </h3>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.tags?.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-md whitespace-nowrap"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl mb-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-4 leading-relaxed font-sans">
                          {item.description}
                        </p>
                      </div>
                      {/* Results Preview */}
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-dashed border-zinc-100 dark:border-zinc-800">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
                          {Array.isArray(item.results) &&
                            item.results.length > 0 ? (
                            item.results
                              .slice(0, 3)
                              .map((res: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="shrink-0 w-32 bg-yellow-50/50 dark:bg-yellow-500/5 p-3 rounded-xl border border-yellow-100/50 dark:border-yellow-500/10 shadow-sm"
                                >
                                  <p className="text-[10px] text-yellow-800 dark:text-yellow-600 line-clamp-3 leading-relaxed">
                                    {res?.content || res?.title || "无内容"}
                                  </p>
                                </div>
                              ))
                          ) : (
                            <div className="shrink-0 w-32 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                              <p className="text-[10px] text-zinc-400">
                                暂无预览内容
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(item.id);
                            setDeleteType("copywriting");
                          }}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors ml-4 shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty States */}
              {!loadingHistory &&
                activeTab === "prompts" &&
                prompts.length === 0 && (
                  <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200">
                    <Grid className="mx-auto w-12 h-12 text-zinc-300 mb-4" />
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                      暂无 Prompt 记录
                    </h3>
                    <p className="text-sm text-zinc-500 mb-6">
                      快去 "提示词实验室" 生成你的第一个 Prompt 吧！
                    </p>
                    <button
                      onClick={() => navigate("/prompt")}
                      className="px-6 py-2 bg-zinc-900 text-white rounded-full font-bold text-sm hover:scale-105 transition-transform"
                    >
                      去生成
                    </button>
                  </div>
                )}

              {!loadingHistory &&
                activeTab === "copywriting" &&
                copywriting.length === 0 && (
                  <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200">
                    <Laptop className="mx-auto w-12 h-12 text-zinc-300 mb-4" />
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                      暂无文案记录
                    </h3>
                    <p className="text-sm text-zinc-500 mb-6">
                      快去 "文案实验室" 创作爆款文案吧！
                    </p>
                    <button
                      onClick={() => navigate("/image-to-text")}
                      className="px-6 py-2 bg-zinc-900 text-white rounded-full font-bold text-sm hover:scale-105 transition-transform"
                    >
                      去创作
                    </button>
                  </div>
                )}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-8 pb-12">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingHistory}
                    className="px-8 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all flex items-center gap-2"
                  >
                    {loadingHistory ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "加载更多"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 4. Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-zinc-900/90 dark:bg-zinc-100/90 backdrop-blur-xl border border-white/20 dark:border-black/10 px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 min-w-[400px]">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500">
                已选中
              </span>
              <span className="text-lg font-black text-white dark:text-zinc-900 leading-none">
                {selectedIds.length}{" "}
                <span className="text-sm font-medium opacity-60">项</span>
              </span>
            </div>

            <div className="h-8 w-px bg-white/10 dark:bg-black/10 mx-2" />

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white/70 dark:text-zinc-500 hover:bg-white/10 dark:hover:bg-black/5 transition-colors"
              >
                {selectedIds.length ===
                  (activeTab === "prompts" ? prompts.length : copywriting.length)
                  ? "取消全选"
                  : "全选"}
              </button>

              {activeTab === "prompts" && (
                <button
                  onClick={handleBulkSubmit}
                  disabled={bulkSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {bulkSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  批量投稿
                </button>
              )}

              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 transition-all active:scale-95"
              >
                <Trash2 size={16} />
                批量删除
              </button>
            </div>

            <button
              onClick={() => {
                setIsManageMode(false);
                setSelectedIds([]);
              }}
              className="p-2 ml-2 text-white/40 hover:text-white dark:text-black/40 dark:hover:text-black transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* 5. Dialogs */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="rounded-3xl max-w-[400px] border-none shadow-2xl overflow-hidden">
          <AlertDialogHeader className="relative z-10">
            <AlertDialogTitle className="text-xl font-bold">
              确认删除记录？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400">
              此操作将永久移除该条解析记录，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-2xl border-zinc-100 hover:bg-zinc-50 font-bold transition-all">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-2xl bg-rose-500 hover:bg-rose-600 text-white border-none font-bold shadow-lg shadow-rose-500/20 transition-all"
            >
              {deleting ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isBulkDeleteModalOpen}
        onOpenChange={setIsBulkDeleteModalOpen}
      >
        <AlertDialogContent className="rounded-3xl max-w-[400px] border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">
              批量删除确认
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              确定要删除选中的{" "}
              <span className="font-bold text-rose-500">
                {selectedIds.length}
              </span>{" "}
              条记录吗？此操作不可逆。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-2xl border-zinc-100 font-bold">
              再想想
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="rounded-2xl bg-rose-500 hover:bg-rose-600 text-white border-none font-bold shadow-lg shadow-rose-500/20"
            >
              {deleting ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                "狠心删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Persona Response Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-100 overflow-hidden transition-opacity duration-300",
          dialogOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => setDialogOpen(false)}
        />

        {/* Drawer */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div
            className={cn(
              "w-screen max-w-[60vw] transform transition-transform duration-300 ease-out",
              dialogOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex h-full flex-col bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl",
                        dialogData?.color === "indigo" &&
                        "bg-indigo-50 dark:bg-indigo-100/10 text-indigo-500",
                        dialogData?.color === "blue" &&
                        "bg-blue-50 dark:bg-blue-100/10 text-blue-500",
                        dialogData?.color === "purple" &&
                        "bg-purple-50 dark:bg-purple-100/10 text-purple-500"
                      )}
                    >
                      {dialogData?.color === "indigo" && <Mail size={20} />}
                      {dialogData?.color === "blue" && (
                        <MessageSquare size={20} />
                      )}
                      {dialogData?.color === "purple" && (
                        <MessageCircle size={20} />
                      )}
                    </div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                      {dialogData?.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setDialogOpen(false)}
                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <div className="flex flex-wrap gap-2">
                  {dialogData?.items.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        navigator.clipboard.writeText(text);
                        toast.success("已复制到剪贴板");
                      }}
                      className={cn(
                        "px-3 py-1.5 text-[11px] rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95",
                        dialogData?.color === "indigo" &&
                        "bg-indigo-50/50 dark:bg-indigo-500/5 text-zinc-600 dark:text-indigo-300 border-indigo-100/50 dark:border-indigo-500/20 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30",
                        dialogData?.color === "blue" &&
                        "bg-blue-50/50 dark:bg-blue-500/5 text-zinc-600 dark:text-blue-300 border-blue-100/50 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/30",
                        dialogData?.color === "purple" &&
                        "bg-purple-50/50 dark:bg-purple-500/5 text-zinc-600 dark:text-purple-300 border-purple-100/50 dark:border-purple-500/20 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:border-purple-200 dark:hover:border-purple-500/30"
                      )}
                      title={text}
                    >
                      {text}
                    </button>
                  ))}
                  {dialogData?.items.length === 0 && (
                    <div className="w-full text-center py-12 text-zinc-400">
                      暂无数据
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-sm hover:scale-[0.98] active:scale-[0.95] transition-all"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Redeem Modal */}
      {redeemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Zap size={20} />
                  </div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                    充值与兑换
                  </h2>
                </div>
                <button
                  onClick={() => setRedeemModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors overflow-hidden"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => {
                    setRedeemType("card");
                    setRedeemCode("");
                  }}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap px-3",
                    redeemType === "card"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  使用礼品卡
                </button>
                <button
                  onClick={() => {
                    setRedeemType("invitation");
                    setRedeemCode("");
                  }}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap px-3",
                    redeemType === "invitation"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  使用兑换码 / 邀请码
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between pl-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {redeemType === "invitation"
                        ? "兑换码 / 邀请码"
                        : "礼品卡号"}
                    </label>
                    <div className="flex items-center gap-3">
                      {redeemType === "card" && !isScanning && (
                        <>
                          <input
                            type="file"
                            id="qr-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageScan}
                          />
                          <button
                            onClick={() =>
                              document.getElementById("qr-upload")?.click()
                            }
                            className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 hover:text-indigo-500 transition-colors uppercase tracking-wider"
                          >
                            <ImageIcon size={12} />
                            图片识别
                          </button>
                          <div className="w-[1px] h-3 bg-zinc-200 dark:bg-zinc-700"></div>
                          <button
                            onClick={() => {
                              setScanError(null);
                              setIsScanning(true);
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                          >
                            <ScanLine size={12} />
                            扫码
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isScanning ? (
                    <div className="relative w-full aspect-square bg-zinc-950 rounded-2xl overflow-hidden border-2 border-indigo-500/30">
                      <div id="reader" className="w-full h-full"></div>
                      <div className="absolute inset-0 pointer-events-none border-[1px] border-indigo-500/20 m-12 rounded-lg animate-pulse"></div>
                      <button
                        onClick={() => setIsScanning(false)}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-md text-white text-[10px] font-bold rounded-full hover:bg-white/20 transition-all border border-white/10"
                      >
                        取消扫码
                      </button>
                    </div>
                  ) : (
                    <input
                      autoFocus
                      placeholder={
                        redeemType === "invitation"
                          ? "输入兑换码或邀请码"
                          : "输入礼品卡上的卡号"
                      }
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      className="w-full h-14 px-5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-300"
                    />
                  )}
                  {scanError && (
                    <p className="text-[10px] text-rose-500 pl-1 font-bold">
                      {scanError}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-[0.98] active:scale-[0.95] disabled:opacity-50 transition-all"
                  >
                    {redeeming ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={18} />
                        <span>立即兑换</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-zinc-400 text-center mt-5 leading-relaxed">
                    {redeemType === "invitation"
                      ? "提示：兑换或邀请成功后，权益将即时应用到您的账户"
                      : "提示：礼品卡兑换成功后，积分将即时存入您的账户余额"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
