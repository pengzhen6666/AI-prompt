import { Route, Routes } from "react-router";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import Home from "@/pages/home";
import Test from "@/pages/test";
import Legal from "@/pages/legal";
import Background from "@/pages/background";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import GeneratePage from "@/pages/generate";
import ImageToTextPage from "@/pages/image-to-text";
import Profile from "@/pages/profile";
import Pricing from "@/pages/pricing";
import Prompt from "@/pages/prompt";
import StylePage from "@/pages/style";
import FaceStylePage from "@/pages/face-style";
import ActionStylePage from "@/pages/action-style";
import VideoStudio from "@/pages/video-studio";
import ProPrompts from "@/pages/pro-prompts";
import MattingPage from "@/pages/matting";
import Navbar from "@/components/Navbar";
import Snowflakes from "@/components/Snowflakes";
import ForgotPassword from "@/pages/forgot-password";
import { analytics } from "@/lib/analytics";
import { Feedback } from "@/components/Feedback";
import { DebugMode } from "@/components/DebugMode";

import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import { applyInvitationCode } from "@/servers/invitation";

export default function App() {
  const initAuth = useUserStore((state) => state.initAuth);
  const user = useUserStore((state) => state.user);
  const location = useLocation();
  const openAuthModal = useUserStore((state) => state.openAuthModal);
  const initialized = useUserStore((state) => state.initialized);
  const fetchProfile = useUserStore((state) => state.fetchProfile);

  // PV Tracking
  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe();
  }, [initAuth]);

  // URL Redeem Code Auto-Signup
  useEffect(() => {
    if (!initialized || user) return;

    const params = new URLSearchParams(location.search);
    const redeemCode = params.get("redeem_code");
    const invitationCode = params.get("invitation_code");

    if (redeemCode || invitationCode) {
      if (redeemCode) {
        openAuthModal("login", redeemCode);
      } else if (invitationCode) {
        openAuthModal("signup", invitationCode);
      }

      // Cleanup URL parameters
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete("redeem_code");
      newParams.delete("invitation_code");
      const newSearch = newParams.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, [location.search, user, initialized, openAuthModal]);

  // Authenticated Auto-Redeem
  const processedCodes = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initialized || !user) return;

    const params = new URLSearchParams(location.search);
    const redeemCode = params.get("redeem_code");

    if (redeemCode && !processedCodes.current.has(redeemCode)) {
      processedCodes.current.add(redeemCode);

      // Cleanup URL parameters immediately to prevent double processing on re-render
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete("redeem_code");
      const newSearch = newParams.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState({}, "", newUrl);

      const handleAutoRedeem = async () => {
        try {
          const res = await applyInvitationCode(user.id, redeemCode);
          if (res.error) {
            toast.error(
              typeof res.error === "string"
                ? res.error
                : res.error.message || "兑换失败"
            );
          } else if (res.data?.success === false) {
            toast.error(res.data.message || "兑换失败");
          } else {
            toast.success("兑换成功！");
            // Refresh user profile/balance
            await fetchProfile(user);
          }
        } catch (error) {
          console.error("Auto redeem error:", error);
          toast.error("自动兑换失败");
        }
      };

      handleAutoRedeem();
    }
  }, [location.search, user, initialized, fetchProfile]);

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-rose-100 selection:text-rose-900 transition-colors duration-300"
      style={{
        backgroundImage:
          "radial-gradient(var(--dot-color) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <Navbar />
      <Snowflakes />
      <Feedback />
      <DebugMode />
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/test" element={<Test />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/background" element={<Background />} />
          <Route path="/matting" element={<MattingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route
            path="/image-to-text"
            element={<ImageToTextPage userFromApp={user} />}
          />
          <Route path="/prompt" element={<Prompt userFromApp={user} />} />
          <Route path="/style" element={<StylePage />} />
          <Route path="/face-style" element={<FaceStylePage />} />
          <Route path="/action-style" element={<ActionStylePage />} />
          <Route path="/video-studio" element={<VideoStudio />} />
          <Route path="/pro-prompts" element={<ProPrompts />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </div>
    </div>
  );
}
