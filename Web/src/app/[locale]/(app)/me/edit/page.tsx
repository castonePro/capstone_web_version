"use client";

/**
 * Flutter features/profile/ui/profile_edit_page.dart 대응.
 * PUT /api/v1/users/me 가 추가되어(2026-09) 닉네임을 수정할 수 있다.
 * 이메일 · 나이대 · 성별은 본인 인증/가입 시 정해지는 값이라 여기서는 계속 조회 전용이다.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
import { userApi } from "@/lib/api/endpoints";
import { Badge, Button, Card, Field, Input, LoadingBlock, PageHeader } from "@/components/ui";
import { IconBack } from "@/components/layout/icons";

export default function ProfileEditPage() {
  const t = useTranslations("me");
  const c = useTranslations("common");
  const f = useFormat();
  const { me, fetchMe } = useAuth();

  const [nickname, setNickname] = useState(me?.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) return <LoadingBlock />;

  const dirty = nickname.trim() !== me.nickname && nickname.trim().length > 0;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await userApi.update({ nickname: nickname.trim() });
      await fetchMe();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

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
          <Input
            value={nickname}
            placeholder={t("nicknamePlaceholder")}
            onChange={(e) => {
              setNickname(e.target.value);
              setSaved(false);
            }}
            maxLength={100}
          />
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

        {error && (
          <p className="rounded-[12px] bg-coral-50 px-3.5 py-3 text-[12px] leading-relaxed text-ink2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={!dirty || saving} loading={saving}>
            {t("saveCta")}
          </Button>
          {saved && <span className="text-[12px] text-ink2">{t("saveSuccess")}</span>}
        </div>
      </Card>
    </div>
  );
}
