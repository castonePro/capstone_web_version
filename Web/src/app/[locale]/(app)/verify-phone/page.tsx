"use client";

/**
 * Flutter features/verification/ui/phone_verification_page.dart 대응.
 * 번호 입력 → 인증번호 발송 → 인증번호·생년·성별 입력 → 완료.
 * 백엔드가 MockPhoneVerificationProvider라 devCode를 응답에 실어 준다.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { verificationApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
import { Badge, Button, Card, Chip, Field, Input, PageHeader } from "@/components/ui";

const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

export default function VerifyPhonePage() {
  const router = useRouter();
  const t = useTranslations("verify");
  const f = useFormat();
  const { me, fetchMe } = useAuth();

  // 백엔드 UserDto.MeResponse에는 전화번호가 없다(비공개). 항상 새로 입력받는다.
  const [phoneNumber, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [birthYear, setBirthYear] = useState<string>(String(me?.birth_year ?? ""));
  const [gender, setGender] = useState<string>(me?.gender ?? "MALE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await verificationApi.sendCode(phoneNumber.trim());
      setVerificationId(res.verificationId);
      setDevCode(res.devCode);
      if (res.devCode) setCode(res.devCode);
    } catch (e) {
      setError(f.apiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!verificationId) return;
    setLoading(true);
    setError(null);
    try {
      await verificationApi.confirmCode({
        verificationId,
        code: code.trim(),
        phoneNumber: phoneNumber.trim(),
        birthYear: Number(birthYear),
        gender,
      });
      await fetchMe();
      router.replace("/me");
    } catch (e) {
      setError(f.apiError(e));
    } finally {
      setLoading(false);
    }
  }

  if (me?.phone_verified) {
    return (
      <div className="max-w-xl">
        <PageHeader title={t("title")} />
        <Card className="border-[#bfe6cd] bg-[#e7f6ec]">
          <p className="text-sm font-semibold text-[#136c33]">{t("doneTitle")}</p>
          <p className="mt-1 text-[13px] text-ink2">{t("doneBody")}</p>
          <Button size="sm" className="mt-3" onClick={() => router.push("/companions")}>
            {t("browseCompanions")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <PageHeader title={t("title")} description={t("description")} />

      <Card className="space-y-5">
        <Field label={t("phoneNumber")} required>
          <div className="flex gap-2">
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              disabled={!!verificationId}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              loading={loading && !verificationId}
              disabled={!phoneNumber.trim() || !!verificationId}
              onClick={() => void sendCode()}
            >
              {t("sendCode")}
            </Button>
          </div>
        </Field>

        {verificationId && (
          <>
            {devCode && (
              <div className="rounded-[12px] bg-sand px-3.5 py-3 text-[13px] text-ink2">
                <Badge tone="warn">{t("devBadge")}</Badge>{" "}
                <span className="ml-1">{t("devCodeNotice", { code: devCode })}</span>
              </div>
            )}

            <Field label={t("code")} required>
              <Input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("codePlaceholder")}
              />
            </Field>

            <Field label={t("birthYear")} required hint={t("birthYearHint")}>
              <Input
                type="number"
                min={1930}
                max={new Date().getFullYear()}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="1998"
              />
            </Field>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">
                {t("gender")} <span className="text-accent">*</span>
              </p>
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <Chip key={g} active={gender === g} onClick={() => setGender(g)}>
                    {f.gender(g)}
                  </Chip>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              loading={loading}
              disabled={!code.trim() || !birthYear}
              onClick={() => void confirm()}
            >
              {t("confirm")}
            </Button>
          </>
        )}

        {error && (
          <p className="rounded-[12px] bg-[#fdeaef] px-3.5 py-2.5 text-[13px] text-[#b21232]">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
