import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { useTranslation } from "react-i18next";

import { LoginForm } from "@/components/login-form";
import { useState } from "react";
import { loginUserServerAPI } from "@/servers/user";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10 relative">
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <button
          onClick={() => navigate("/")}
          className="group flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {t("back")}
        </button>
      </div>
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <LanguageSwitcher />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md text-primary">
            <Logo className="size-6" />
          </div>
          Lumina
        </a>
        <LoginForm
          onChange={(e) => {
            const { id, value } = e.target as EventTarget & {
              id: string;
              value: string;
            };
            setFormData((prev) => ({ ...prev, [id]: value }));
          }}
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            loginUserServerAPI({
              email: formData.email,
              password: formData.password,
            })
              .then((res) => {
                console.log(res);
                if (res.error) {
                  // 针对不同错误提供更友好的提示
                  if (res.error.message === "Invalid login credentials") {
                    toast.error(
                      "邮箱或密码错误。请检查您的登录信息并重试。如果您刚注册，请先验证您的邮箱。"
                    );
                  } else if (
                    res.error.message.includes("Email not confirmed")
                  ) {
                    toast.error(
                      "请在登录前验证您的邮箱地址。请检查您的收件箱以获取验证链接。"
                    );
                  } else {
                    toast.error(res.error.message);
                  }
                  return;
                }
                toast.success(t("login_success"));
                navigate("/");
              })
              .finally(() => {
                setLoading(false);
              });
          }}
          loading={loading}
        />
      </div>
    </div>
  );
}
