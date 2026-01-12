import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export function LoginForm({
  className,
  loading,
  onSwitchAuth,
  onChange,
  onSubmit,
  defaultValues,
  showRedeemCode,
  ...otherProps
}: React.ComponentProps<"div"> & {
  loading?: boolean;
  onSwitchAuth?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (e: React.FormEvent) => void;
  defaultValues?: {
    email?: string;
    password?: string;
    invitation_code?: string;
  };
  showRedeemCode?: boolean;
}) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();

  const inputClasses =
    "h-11 border-zinc-200 dark:border-zinc-800 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-400 dark:focus-visible:border-zinc-600 transition-colors";

  return (
    <div className={cn("p-6 sm:p-8", className)} {...otherProps}>
      <div className="flex flex-col gap-2 mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("welcome_back")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("login_desc")}</p>
      </div>

      <form onSubmit={onSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              className={inputClasses}
              onChange={onChange}
              defaultValue={defaultValues?.email}
            />
          </Field>
          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
              <a
                href="/forgot-password"
                className="ml-auto text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                {t("forgot_password")}
              </a>
            </div>
            <Input
              id="password"
              type="password"
              required
              className={inputClasses}
              onChange={onChange}
              defaultValue={defaultValues?.password}
            />
          </Field>
          {showRedeemCode && (
            <Field>
              <FieldLabel htmlFor="invitation_code">
                {t("redemption_code")}
              </FieldLabel>
              <Input
                id="invitation_code"
                type="text"
                placeholder={t("redemption_code_placeholder")}
                className={inputClasses}
                onChange={onChange}
                defaultValue={defaultValues?.invitation_code}
              />
            </Field>
          )}
          <Field>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-medium transition-all active:scale-[0.98]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("login")}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t("no_account")}{" "}
              <button
                type="button"
                onClick={() =>
                  onSwitchAuth ? onSwitchAuth() : navigate("/signup")
                }
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                {t("signup")}
              </button>
            </p>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
