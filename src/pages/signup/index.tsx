import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { SignupForm } from "@/components/signup-form";
import { useState } from "react";
import { toast } from "sonner";
import { registerUserServerAPI } from "@/servers/user";

export default function SignupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    ["confirm-password"]: "",
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
        <SignupForm
          loading={loading}
          onChange={(e) => {
            const { id, value } = e.target as EventTarget & {
              id: string;
              value: string;
            };
            setFormData((prev) => ({ ...prev, [id]: value }));
          }}
          onSubmit={(e) => {
            e.preventDefault();
            console.log(formData, "formData");

            if (formData.password !== formData["confirm-password"]) {
              toast.error('"Passwords do not match"');
              return;
            }
            setLoading(true);
            registerUserServerAPI({
              password: formData.password,
              email: formData.email,
              username: formData.name,
            })
              .then((res) => {
                console.log(res);
                if (res.error) {
                  toast.error(res.error.message);
                  return;
                }

                // 如果 identities 为空数组，说明用户已注册但未验证邮箱
                if (
                  res.data.user &&
                  res.data.user.identities &&
                  res.data.user.identities.length === 0
                ) {
                  toast.warning(
                    "此邮箱已注册。请检查您的收件箱以验证您的账户。"
                  );
                  return;
                }

                // 注册成功
                toast.success("账户创建成功！请检查您的邮箱以验证您的账户。");
                navigate("/login");
              })
              .finally(() => {
                setLoading(false);
              });
          }}
        />
      </div>
    </div>
  );
}
