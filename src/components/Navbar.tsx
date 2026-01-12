import { Link, useNavigate, useLocation } from "react-router";
import {
  ScanText,
  ScanSearch,
  Sparkles,
  Menu,
  X,
  Home,
  User as UserIcon,
  LogOut,
  CreditCard,
  Crown,
  Loader2,
  LayoutGrid,
  ChevronDown,
  Video,
  Eraser,
  Wand2,
} from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/types";
import { getUserInfoServerAPI } from "@/servers/user";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { AuthModal } from "@/components/AuthModal";
import { GenerationGuideModal } from "@/components/GenerationGuideModal";
import { Logo } from "./Logo";
// Banana Icon Component
const BananaIcon = ({ className }: { className: string }) => (
  <img src="/favicon.svg" className={className} />
);

interface NavbarProps {
  // 可以保留一个标记，以便特殊页面动态隐藏
  hideNavbar?: boolean;
}

import { useUserStore } from "@/store/userStore";
import { NotificationBanner } from "./NotificationBanner";

const AIToolboxDropdown = () => {
  const { t } = useTranslation(["common"]);
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const tools = [
    {
      id: "image-to-copy",
      icon: <ScanText className="w-5 h-5 text-blue-500" />,
      label: t("common:image_to_copy"),
      path: "/image-to-text",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "pro-prompts",
      icon: <Wand2 className="w-5 h-5 text-purple-500" />,
      label: t("common:pro_prompts"),
      path: "/pro-prompts",
      bgColor: "bg-purple-500/10",
    },
    {
      id: "video-studio",
      icon: <Video className="w-5 h-5 text-orange-500" />,
      label: t("common:video_studio"),
      path: "/video-studio",
      bgColor: "bg-orange-500/10",
    },
    {
      id: "background-removal",
      icon: <Eraser className="w-5 h-5 text-indigo-500" />,
      label: t("common:background_removal"),
      path: "/matting",
      bgColor: "bg-indigo-500/10",
    },
  ];

  const activeTool = tools.find((tool) => location.pathname.startsWith(tool.path));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-linear-to-r from-blue-500 to-cyan-500 rounded-full transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 shadow-lg shadow-blue-500/20 active:scale-95"
      >
        <LayoutGrid className="w-4 h-4 text-white" />
        <span>{activeTool ? activeTool.label : t("common:ai_toolbox")}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 z-50 p-4 animate-in fade-in zoom-in-95 duration-200 origin-top">
            <div className="grid grid-cols-2 gap-3">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    navigate(tool.path);
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-colors group ${location.pathname.startsWith(tool.path)
                      ? "bg-gray-100 dark:bg-zinc-800"
                      : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                    }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl ${tool.bgColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
                  >
                    {tool.icon}
                  </div>
                  <span className="text-[13px] font-bold text-gray-700 dark:text-zinc-200">
                    {tool.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default function Navbar({ hideNavbar }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout, openAuthModal } = useUserStore();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 根据路径自动计算激活状态
  const active =
    location.pathname === "/"
      ? "prompts"
      : location.pathname === "/image-to-text"
        ? "image-to-text"
        : location.pathname === "/prompt"
          ? "prompt"
          : location.pathname === "/generate"
            ? "generate"
            : "";

  const { t } = useTranslation(["home", "common", "blog"]);

  useEffect(() => {
    // 页面跳转时关闭移动端菜单
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const CrownBadge = ({ code }: { code?: string }) => {
    if (!code || code === "free") return null;

    const config = {
      pro: { color: "text-zinc-400 fill-zinc-200", label: "PRO" },
      ultra: { color: "text-yellow-500 fill-yellow-200", label: "ULTRA" },
    }[code as "pro" | "ultra"];

    if (!config) return null;

    return (
      <div className="absolute -top-1.5 -right-1.5 z-10 drop-shadow-sm filter-none animate-in zoom-in-50 duration-300">
        <Crown size={14} className={`${config.color} stroke-[2.5px]`} />
      </div>
    );
  };

  if (hideNavbar) return null;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50  transition-all duration-300 ${scrolled
        ? "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm"
        : "bg-transparent border-none"
        }`}
    >
      <NotificationBanner />
      <>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 cursor-pointer group select-none"
            >
              <div className="p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300 shadow-sm">
                <Logo className="w-5 h-5" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-gray-900 dark:text-zinc-100">
                Lumina <span className="text-yellow-500">AI</span>
              </span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/"
                className={`px-4 py-1.5 text-sm font-bold rounded-full transition-colors ${active === "prompts"
                  ? "bg-black dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-white"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
              >
                Prompts
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/prompt"
              className="hidden sm:block relative group active:translate-y-0 transition-all duration-200"
            >
              <div className="absolute inset-0 bg-linear-to-r from-purple-600 to-indigo-700 blur-[2px] opacity-20 rounded-full"></div>
              <div className="relative flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-linear-to-r from-purple-500 to-indigo-500 rounded-full transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0 shadow-lg shadow-purple-500/20">
                <ScanSearch className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>图生提示词</span>
              </div>
            </Link>

            <div className="hidden sm:block ml-1">
              <AIToolboxDropdown />
            </div>

            <button
              onClick={() => {
                navigate("/generate");
              }}
              className="hidden sm:block relative group ml-1 active:translate-y-0 transition-all duration-200"
            >
              <div className="absolute inset-0 bg-linear-to-r from-amber-600 to-orange-700 blur-[2px] opacity-20 rounded-full"></div>
              <div className="relative flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-linear-to-r from-amber-500 to-orange-500 rounded-full transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0 shadow-lg shadow-amber-500/20">
                <Sparkles className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Nano Banana</span>
              </div>
            </button>

            {/* Theme Toggle & User Actions */}
            <div className="hidden sm:flex items-center gap-2 mr-3 ml-2">
              <ThemeSwitcher />
              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
            </div>

            {user ? (
              <div className="relative flex items-center gap-1 sm:gap-2">
                <div
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9 border border-zinc-200 dark:border-zinc-800">
                      <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium text-sm">
                        {user.email?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <CrownBadge code={profile?.membership_code} />
                  </div>
                </div>

                {/* Desktop User Menu Dropdown */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-100 dark:border-zinc-800 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                      <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                        <p className="text-xs text-zinc-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <UserIcon size={16} className="text-zinc-400" />
                        个人中心
                      </Link>
                      {/* <Link
                      to="/pricing"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <CreditCard size={16} className="text-zinc-400" />
                      定价方案
                    </Link> */}
                      <button
                        disabled={isLoggingOut}
                        onClick={async () => {
                          setIsLoggingOut(true);
                          try {
                            await logout();
                            setIsUserMenuOpen(false);
                            navigate("/");
                          } finally {
                            setIsLoggingOut(false);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoggingOut ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <LogOut size={16} />
                        )}
                        {isLoggingOut ? "正在退出..." : "退出登录"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => {
                    openAuthModal("login");
                  }}
                  className="px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors min-w-[64px] text-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {t("common:login")}
                </button>
                <button
                  onClick={() => {
                    openAuthModal("signup");
                  }}
                  className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-sm font-medium hover:opacity-90 transition-opacity min-w-[90px] text-center shadow-sm hover:shadow-md cursor-pointer"
                >
                  {t("common:signup")}
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu Dropdown (Optimized: Popover Style) */}
          {isMobileMenuOpen && (
            <>
              {/* Background Overlay */}
              <div
                className="sm:hidden fixed inset-0 z-40 bg-black/5"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="sm:hidden absolute top-full right-4 mt-2 w-72 bg-white dark:bg-zinc-900 z-50 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex flex-col p-4 gap-3">
                  {/* User Profile Header (Mobile) - Restored */}
                  {user && (
                    <div className="flex items-center gap-3 px-4 py-4 mb-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-800">
                          <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold">
                            {user.email?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <CrownBadge code={profile?.membership_code} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {user.email?.split("@")[0]}
                        </span>
                        <span className="text-xs text-zinc-500 truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  )}

                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                  >
                    <Home size={18} className="text-zinc-400" />
                    <span>首页 (Prompts)</span>
                  </Link>

                  {/* Theme Switcher - Mobile */}
                  <ThemeSwitcher showLabel />

                  <Link
                    to="/prompt"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-linear-to-r from-purple-500 to-indigo-500 text-white font-bold shadow-md"
                  >
                    <ScanSearch size={18} />
                    <span>图生提示词</span>
                  </Link>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/image-to-text"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-500/10"
                    >
                      <ScanText size={20} />
                      <span className="text-[11px] font-bold">图生文案</span>
                    </Link>
                    <Link
                      to="/pro-prompts"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/5 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-500/10"
                    >
                      <Wand2 size={20} />
                      <span className="text-[11px] font-bold">专业提示词</span>
                    </Link>
                    <Link
                      to="/prompt?tab=video"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-orange-50 dark:bg-orange-500/5 text-orange-600 dark:text-orange-400 border border-orange-100/50 dark:border-orange-500/10"
                    >
                      <Video size={20} />
                      <span className="text-[11px] font-bold">视频工作室</span>
                    </Link>
                    <Link
                      to="/matting"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-500/10"
                    >
                      <Eraser size={20} />
                      <span className="text-[11px] font-bold">背景移除</span>
                    </Link>
                  </div>

                  <Link
                    to="/generate"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 text-white font-bold shadow-md"
                  >
                    <Sparkles size={18} />
                    <span>Nano Banana</span>
                  </Link>

                  {!user ? (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => {
                          openAuthModal("login");
                          setIsMobileMenuOpen(false);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-bold text-center"
                      >
                        {t("common:login")}
                      </button>
                      <button
                        onClick={() => {
                          openAuthModal("signup");
                          setIsMobileMenuOpen(false);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold text-center"
                      >
                        {t("common:signup")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link
                        to="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                      >
                        <UserIcon size={18} className="text-zinc-400" />
                        <span>个人中心</span>
                      </Link>
                      {/* <Link
                      to="/pricing"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                    >
                      <CreditCard size={18} className="text-zinc-400" />
                      <span>定价方案</span>
                    </Link> */}
                      <button
                        disabled={isLoggingOut}
                        onClick={async () => {
                          setIsLoggingOut(true);
                          try {
                            await logout();
                            setIsMobileMenuOpen(false);
                            navigate("/");
                          } finally {
                            setIsLoggingOut(false);
                          }
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        {isLoggingOut ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <LogOut size={18} />
                        )}
                        <span>{isLoggingOut ? "正在退出..." : "退出登录"}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </>
      <AuthModal />
      <GenerationGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </nav>
  );
}
