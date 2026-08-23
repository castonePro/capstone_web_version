"use client";

/**
 * Flutter features/profile/ui/profile_edit_page.dart 대응.
 * 백엔드에 프로필 수정 API(PUT /users/me)가 아직 없어, 현재는 조회 전용 화면이다.
 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
import { Badge, Button, Card, Field, Input, LoadingBlock, PageHeader } from "@/components/ui";
import { IconBack } from "@/components/layout/icons";

export default function ProfileEditPage() {
  const t = useTranslations("me");
  const c = useTranslations("common");
  const f = useFormat();
  const { me } = useAuth();
  if (!me) return <LoadingBlock />;

  return (
    <div className="max-w-xl">
      <Link
        href="/me"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
      >
        <IconBack width={18} height={18} />
        {t("title")}
      </Link>

      <PageHeader title={t("profile")} description={t("profileDescription")} />

      <Card className="space-y-4">
        <Field label={t("nickname")}>
          <Input value={me.nickname} readOnly disabled />
        </Field>
        <Field label={t("email")}>
          <Input value={me.email} readOnly disabled />
        </Field>
        <Field label={t("ageAndGender")} hint={t("ageAndGenderHint")}>
          <Input
            value={
              me.birth_year || me.gender
                ? f.profileMeta(me.birth_year, me.gender)
                : t("notRegistered")
            }
            readOnly
            disabled
          />
        </Field>

        <div className="flex items-center justify-between rounded-[12px] bg-sand px-3.5 py-3">
          <span className="text-[13px] font-medium text-ink2">{t("phoneVerification")}</span>
          {me.phone_verified ? (
            <Badge tone="teal">{c("verifiedBadge")}</Badge>
          ) : (
            <Link href="/verify-phone">
              <Button size="sm">{t("verifyCta")}</Button>
            </Link>
          )}
        </div>

        <p className="rounded-[12px] bg-coral-50 px-3.5 py-3 text-[12px] leading-relaxed text-ink2">
          {t("noEditApiNotice")}
          <br />
          <code className="text-[11px]">PUT /api/v1/users/me</code>
        </p>
      </Card>
    </div>
  );
}
