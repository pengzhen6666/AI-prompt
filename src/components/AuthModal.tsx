import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { loginUserServerAPI, registerUserServerAPI } from "@/servers/user";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { Logo } from "@/components/Logo";
import { applyInvitationCode, checkInvitationCode } from "@/servers/invitation";
import { useUserStore } from "@/store/userStore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
}

export function AuthModal() {
  const {
    isAuthModalOpen: isOpen,
    closeAuthModal: onClose,
    authModalMode: mode,
    openAuthModal,
    redeemCode,
  } = useUserStore();

  const setMode = (newMode: "login" | "signup") => {
    // 切换到登录模式时不携带邀请码
    if (newMode === "login") {
      openAuthModal(newMode, "");
    } else {
      openAuthModal(newMode, redeemCode);
    }
  };
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation(["common", "auth"]); // Use namespaces
  const navigate = useNavigate();

  // Track processed invitation codes to prevent duplicate calls
  const processedInvitationCodes = useRef<Set<string>>(new Set());

  // Reset processed codes when modal closes
  useEffect(() => {
    if (!isOpen) {
      processedInvitationCodes.current.clear();
    }
  }, [isOpen]);

  // Reset to default mode when opening
  // Note: We might want to sync this with a useEffect if defaultMode changes dynamically outside

  const handleLoginSubmit = async (e: React.FormEvent, formData: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginUserServerAPI({
        email: formData.email,
        password: formData.password,
      });

      if (res.error) {
        if (res.error.message === "Invalid login credentials") {
          toast.error(
            "邮箱或密码错误。请检查您的登录信息并重试。如果您刚注册，请先验证您的邮箱。"
          );
        } else if (res.error.message.includes("Email not confirmed")) {
          toast.error(
            "请在登录前验证您的邮箱地址。请检查您的收件箱以获取验证链接。"
          );
        } else if (
          res.error.message.includes("email_address_invalid") ||
          (res.error as any).code === "email_address_invalid"
        ) {
          toast.error("邮箱不存在");
        } else {
          toast.error(res.error.message);
        }
        return;
      }

      // 如果有邀请码且登录成功，尝试应用兑换码
      if (res.data.user && formData.invitation_code) {
        const code = formData.invitation_code.trim();

        // Check if this code has already been processed in this session
        if (!processedInvitationCodes.current.has(code)) {
          processedInvitationCodes.current.add(code);

          try {
            const redeemRes = await applyInvitationCode(res.data.user.id, code);
            if (redeemRes.error) {
              toast.warning(
                `登录成功，针对兑换码应用失败: ${
                  typeof redeemRes.error === "string"
                    ? redeemRes.error
                    : redeemRes.error.message
                }`
              );
            } else if (redeemRes.data?.success === false) {
              toast.warning(
                `登录成功，但兑换码应用失败: ${
                  redeemRes.data.message || "未知错误"
                }`
              );
            } else {
              toast.success("登录并兑换成功！");
            }
          } catch (err) {
            console.error("兑换失败:", err);
          }
        }
      } else {
        toast.success(t("common:login_success"));
      }

      onClose();
      // Optionally refresh user state handled by Navbar listener
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (
    e: React.FormEvent,
    formData: any,
    setLoading?: (loading: boolean) => void
  ) => {
    e.preventDefault();

    if (formData.password !== formData["confirm-password"]) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading?.(true);

      // 前置校验邀请码
      if (formData.invitation_code) {
        const checkRes = await checkInvitationCode(formData.invitation_code);
        if (checkRes.error) {
          toast.error(`邀请码校验失败: ${checkRes.error}`);
          setLoading?.(false);
          return;
        }
      }

      const res = await registerUserServerAPI({
        password: formData.password,
        email: formData.email,
        username: formData.name,
        invitation_code: formData.invitation_code,
      });
      setLoading?.(false);
      if (res.error) {
        if (
          res.error.message.includes("email_address_invalid") ||
          (res.error as any).code === "email_address_invalid"
        ) {
          toast.error(t("auth:email_address_invalid"));
        } else {
          toast.error(res.error.message);
        }
        return;
      }

      // 如果有邀请码，尝试应用
      if (res.data.user && formData.invitation_code) {
        applyInvitationCode(res.data.user.id, formData.invitation_code).then(
          (inviteRes) => {
            if (inviteRes.error) {
              console.warn("邀请码应用失败:", inviteRes.error);
              // 不通过 toast 报错，以免干扰注册成功主体验，或可根据实际需求调整
            } else {
              console.log("邀请码应用成功");
            }
          }
        );
      }

      if (
        res.data.user &&
        res.data.user.identities &&
        res.data.user.identities.length === 0
      ) {
        toast.warning("此邮箱已注册。请检查您的收件箱以验证您的账户。");
        return;
      }

      toast.success("账户创建成功！请检查您的邮箱以验证您的账户。");
      setMode("login");
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  // Wrapper for LoginForm to handle internal state
  const LoginFormWrapper = () => {
    // We need to manage form state here or pass handlers.
    // However, the original LoginForm handles its own state via onChange BUT expects an external onSubmit.
    // The original LoginForm uses a loose typing for onChange/onSubmit.
    // To minimize rewriting LoginForm entirely, we can just render it.
    // BUT the original LoginForm implementation takes `onChange` and `onSubmit` props.
    // Let's modify LoginForm usage.

    const [formData, setFormData] = useState({
      email: "",
      password: "",
      invitation_code: redeemCode || "",
    });

    return (
      <LoginForm
        loading={loading}
        onSwitchAuth={() => setMode("signup")}
        defaultValues={formData}
        showRedeemCode={!!redeemCode}
        onChange={(e: any) => {
          const { id, value } = e.target;
          setFormData((prev) => ({ ...prev, [id]: value }));
        }}
        onSubmit={(e: any) => handleLoginSubmit(e, formData)}
      />
    );
  };

  const SignupFormWrapper = () => {
    const [formData, setFormData] = useState({
      name: "",
      email: "",
      password: "",
      "confirm-password": "",
      invitation_code: redeemCode || "",
    });
    const [loading, setLoading] = useState(false);
    return (
      <SignupForm
        loading={loading}
        onSwitchAuth={() => setMode("login")}
        defaultValues={formData}
        onChange={(e: any) => {
          const { id, value } = e.target;
          setFormData((prev) => ({ ...prev, [id]: value }));
        }}
        onSubmit={(e: any) => handleSignupSubmit(e, formData, setLoading)}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[440px] p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl"
        showCloseButton={true}
      >
        <div className="relative">
          {mode === "login" ? <LoginFormWrapper /> : <SignupFormWrapper />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
