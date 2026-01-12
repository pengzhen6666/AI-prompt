import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export function SignupForm({
  className,
  onSwitchAuth,
  loading,
  onChange,
  onSubmit,
  defaultValues,
  ...otherProps
}: React.ComponentProps<"div"> & {
  onSwitchAuth?: () => void;
  loading?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (e: React.FormEvent) => void;
  defaultValues?: {
    name?: string;
    email?: string;
    password?: string;
    "confirm-password"?: string;
    invitation_code?: string;
  };
}) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();

  const inputClasses =
    "h-11 border-zinc-200 dark:border-zinc-800 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-400 dark:focus-visible:border-zinc-600 transition-colors";

  return (
    <div className={cn("p-6 sm:p-8", className)} {...otherProps}>
      <div className="flex flex-col gap-2 mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("create_account_title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("create_account_desc")}
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="name">{t("full_name")}</FieldLabel>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              required
              className={inputClasses}
              onChange={onChange}
              defaultValue={defaultValues?.name}
            />
          </Field>
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
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  className={inputClasses}
                  onChange={onChange}
                  defaultValue={defaultValues?.password}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  {t("confirm_password")}
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  className={inputClasses}
                  onChange={onChange}
                  defaultValue={defaultValues?.["confirm-password"]}
                />
              </Field>
            </div>
            <FieldDescription className="mt-1.5">
              {t("password_length")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="invitation_code">
              {t("invitation_code")}
            </FieldLabel>
            <Input
              id="invitation_code"
              type="text"
              placeholder={t("invitation_code_placeholder")}
              className={inputClasses}
              onChange={onChange}
              defaultValue={defaultValues?.invitation_code}
            />
          </Field>

          <Field>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-medium transition-all active:scale-[0.98]"
            >
              {loading ? "Creating..." : t("create_account_btn")}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t("already_have_account")}{" "}
              <button
                type="button"
                onClick={() =>
                  onSwitchAuth ? onSwitchAuth() : navigate("/login")
                }
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                {t("sign_in")}
              </button>
            </p>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
