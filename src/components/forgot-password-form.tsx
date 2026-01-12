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

export function ForgotPasswordForm({
  className,
  loading,
  ...props
}: React.ComponentProps<"div"> & { loading?: boolean }) {
  const { t } = useTranslation("auth");

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {t("forgot_password_title")}
          </CardTitle>
          <CardDescription>{t("forgot_password_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("send_reset_link")}
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
