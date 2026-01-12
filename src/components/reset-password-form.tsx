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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

export function ResetPasswordForm({
  className,
  loading,
  userEmail,
  ...props
}: React.ComponentProps<"div"> & { loading?: boolean; userEmail?: string }) {
  const { t } = useTranslation("auth");

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("reset_password_title")}</CardTitle>
          <CardDescription>
            {userEmail ? (
              <>
                {t("reset_password_for")} <strong>{userEmail}</strong>
              </>
            ) : (
              t("reset_password_desc")
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="new-password">
                  {t("new_password")}
                </FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <FieldDescription>{t("password_length")}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  {t("confirm_password")}
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("update_password")}
                </Button>
                <FieldDescription className="text-center">
                  {t("remember_password")} <a href="/login">{t("login")}</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        {t("agreement")} <a href="#">{t("terms")}</a> {t("and")}{" "}
        <a href="#">{t("privacy")}</a>.
      </FieldDescription>
    </div>
  );
}
