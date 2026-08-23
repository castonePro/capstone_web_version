"use client";

/**
 * Flutter features/guider/ui/guide_registration_page.dart + guide_register_step_page.dart 대응.
 * 3단계 가이드 등록: 활동 지역 → 언어·경력 → 소개·전문 분야
 *
 * 저장 값(지역·언어·전문 분야)은 백엔드 배열 컬럼에 한국어 문자열로 들어간다.
 * 화면 라벨만 번역하고 값은 그대로 유지해서 기존 데이터·검색과 호환된다.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { guiderApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
import { Button, Card, Chip, Field, Input, PageHeader, Textarea, cx } from "@/components/ui";
import type { LanguageScore } from "@/lib/api/types";
import { IconPlus } from "@/components/layout/icons";

const REGIONS = [
  { value: "해운대구", key: "haeundae" },
  { value: "수영구", key: "suyeong" },
  { value: "남구", key: "nam" },
  { value: "중구", key: "jung" },
  { value: "서구", key: "seo" },
  { value: "동구", key: "dong" },
  { value: "영도구", key: "yeongdo" },
  { value: "사하구", key: "saha" },
  { value: "부산진구", key: "busanjin" },
  { value: "동래구", key: "dongnae" },
  { value: "금정구", key: "geumjeong" },
  { value: "북구", key: "buk" },
  { value: "사상구", key: "sasang" },
  { value: "연제구", key: "yeonje" },
  { value: "기장군", key: "gijang" },
  { value: "강서구", key: "gangseo" },
] as const;

const LANGUAGES = [
  { value: "한국어", key: "ko" },
  { value: "영어", key: "en" },
  { value: "일본어", key: "ja" },
  { value: "중국어", key: "zh" },
  { value: "베트남어", key: "vi" },
  { value: "인도네시아어", key: "id" },
] as const;

const EXPERIENCE = [
  { value: "1년 미만", key: "under1" },
  { value: "1~3년", key: "y1to3" },
  { value: "3~5년", key: "y3to5" },
  { value: "5년 이상", key: "over5" },
] as const;

const SPECIALTIES = [
  { value: "맛집", key: "food" },
  { value: "역사·문화", key: "history" },
  { value: "사진", key: "photo" },
  { value: "야경", key: "nightview" },
  { value: "액티비티", key: "activity" },
  { value: "쇼핑", key: "shopping" },
  { value: "카페", key: "cafe" },
  { value: "가족여행", key: "family" },
  { value: "자연", key: "nature" },
  { value: "축제", key: "festival" },
] as const;

export default function GuideRegisterPage() {
  const router = useRouter();
  const t = useTranslations("guideRegister");
  const regionT = useTranslations("busanDistricts");
  const langT = useTranslations("languages");
  const specT = useTranslations("specialties");
  const f = useFormat();
  const { userId, fetchMe } = useAuth();

  const STEP_KEYS = ["regions", "languages", "profile"] as const;

  const [step, setStep] = useState(0);
  const [activeRegions, setRegions] = useState<string[]>([]);
  const [availableLanguages, setLanguages] = useState<string[]>(["한국어"]);
  const [experiencePeriod, setExperience] = useState<string>(EXPERIENCE[0].value);
  const [languageScores, setScores] = useState<LanguageScore[]>([]);
  const [exam, setExam] = useState("");
  const [score, setScore] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function addScore() {
    if (!exam.trim() || !score.trim()) return;
    setScores((p) => [...p, { exam: exam.trim(), score: score.trim() }]);
    setExam("");
    setScore("");
  }

  const canNext =
    step === 0
      ? activeRegions.length > 0
      : step === 1
        ? availableLanguages.length > 0 && !!experiencePeriod
        : introduction.trim().length > 0 && specialties.length > 0;

  async function submit() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await guiderApi.register(userId, {
        activeRegions,
        availableLanguages,
        experiencePeriod,
        languageScores,
        introduction: introduction.trim(),
        specialties,
      });
      await fetchMe();
      router.replace("/guide/products");
    } catch (e) {
      setError(f.apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("title")} description={t("description")} />

      {/* 단계 표시 */}
      <div className="mb-6 flex items-center gap-2">
        {STEP_KEYS.map((key, i) => (
          <div key={key} className="flex flex-1 items-center gap-2">
            <div className="flex-1">
              <div
                className={cx(
                  "h-1 rounded-full transition-colors",
                  i <= step ? "bg-accent" : "bg-line",
                )}
              />
              <p
                className={cx(
                  "mt-1.5 text-[12px] font-medium",
                  i === step ? "text-ink" : "text-muted",
                )}
              >
                {i + 1}. {t(`steps.${key}`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Card className="space-y-5">
        {step === 0 && (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink2">
              {t("activeRegions")} <span className="text-accent">*</span>
            </p>
            <p className="mb-3 text-[12px] text-muted">{t("activeRegionsHint")}</p>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <Chip
                  key={r.value}
                  active={activeRegions.includes(r.value)}
                  onClick={() => toggle(activeRegions, setRegions, r.value)}
                >
                  {regionT(r.key)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">
                {t("availableLanguages")} <span className="text-accent">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <Chip
                    key={l.value}
                    active={availableLanguages.includes(l.value)}
                    onClick={() => toggle(availableLanguages, setLanguages, l.value)}
                  >
                    {langT(l.key)}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">
                {t("experience")} <span className="text-accent">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE.map((e) => (
                  <Chip
                    key={e.value}
                    active={experiencePeriod === e.value}
                    onClick={() => setExperience(e.value)}
                  >
                    {t(`experienceOptions.${e.key}`)}
                  </Chip>
                ))}
              </div>
            </div>

            <Field label={t("languageScores")} hint={t("languageScoresHint")}>
              <div className="flex gap-2">
                <Input
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  placeholder={t("examPlaceholder")}
                />
                <Input
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder={t("scorePlaceholder")}
                />
                <Button type="button" variant="outline" onClick={addScore} className="shrink-0 px-3">
                  <IconPlus width={16} height={16} />
                </Button>
              </div>
              {languageScores.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {languageScores.map((s, i) => (
                    <button
                      key={`${s.exam}-${i}`}
                      type="button"
                      onClick={() => setScores((p) => p.filter((_, idx) => idx !== i))}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-[13px] text-ink2 hover:bg-coral-100"
                    >
                      {s.exam} {s.score}
                      <span className="text-muted">✕</span>
                    </button>
                  ))}
                </div>
              )}
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label={t("introduction")} required hint={t("introductionHint")}>
              <Textarea
                maxLength={500}
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                placeholder={t("introductionPlaceholder")}
                className="min-h-32"
              />
            </Field>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">
                {t("specialties")} <span className="text-accent">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <Chip
                    key={s.value}
                    active={specialties.includes(s.value)}
                    onClick={() => toggle(specialties, setSpecialties, s.value)}
                  >
                    {specT(s.key)}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="rounded-[12px] bg-[#fdeaef] px-3.5 py-2.5 text-[13px] text-[#b21232]">
            {error}
          </p>
        )}

        <div className="flex justify-between gap-2 border-t border-line pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            {t("previous")}
          </Button>
          {step < STEP_KEYS.length - 1 ? (
            <Button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              {t("next")}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canNext}
              loading={loading}
              onClick={() => void submit()}
            >
              {t("finish")}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
