"use client";

/**
 * Flutter features/guider/ui/guide_registration_page.dart + guide_register_step_page.dart 대응.
 * 3단계 가이드 등록: 활동 지역 → 언어·경력 → 소개·전문 분야
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { guiderApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Button,
  Card,
  Chip,
  Field,
  Input,
  PageHeader,
  Textarea,
  cx,
} from "@/components/ui";
import type { LanguageScore } from "@/lib/api/types";
import { errorMessage } from "@/lib/utils/format";
import { IconPlus } from "@/components/layout/icons";

const REGIONS = [
  "해운대구",
  "수영구",
  "남구",
  "중구",
  "서구",
  "동구",
  "영도구",
  "사하구",
  "부산진구",
  "동래구",
  "금정구",
  "북구",
  "사상구",
  "연제구",
  "기장군",
  "강서구",
];

const LANGUAGES = ["한국어", "영어", "일본어", "중국어", "스페인어", "프랑스어", "베트남어"];

const EXPERIENCE = ["1년 미만", "1~3년", "3~5년", "5년 이상"];

const SPECIALTIES = [
  "맛집",
  "역사·문화",
  "사진",
  "야경",
  "액티비티",
  "쇼핑",
  "카페",
  "가족여행",
  "자연",
  "축제",
];

const STEPS = ["활동 지역", "언어·경력", "소개·전문 분야"];

export default function GuideRegisterPage() {
  const router = useRouter();
  const { userId, fetchMe } = useAuth();

  const [step, setStep] = useState(0);
  const [activeRegions, setRegions] = useState<string[]>([]);
  const [availableLanguages, setLanguages] = useState<string[]>(["한국어"]);
  const [experiencePeriod, setExperience] = useState(EXPERIENCE[0]);
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
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="가이드 등록"
        description="프로필을 등록하면 가이드 상품을 만들고 사용자 요청에 입찰할 수 있습니다."
      />

      {/* 단계 표시 */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
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
                {i + 1}. {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Card className="space-y-5">
        {step === 0 && (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink2">
              활동 가능 지역 <span className="text-accent">*</span>
            </p>
            <p className="mb-3 text-[12px] text-muted">여러 곳을 선택할 수 있습니다.</p>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <Chip
                  key={r}
                  active={activeRegions.includes(r)}
                  onClick={() => toggle(activeRegions, setRegions, r)}
                >
                  {r}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">
                가능한 언어 <span className="text-accent">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <Chip
                    key={l}
                    active={availableLanguages.includes(l)}
                    onClick={() => toggle(availableLanguages, setLanguages, l)}
                  >
                    {l}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">
                가이드 경력 <span className="text-accent">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE.map((e) => (
                  <Chip key={e} active={experiencePeriod === e} onClick={() => setExperience(e)}>
                    {e}
                  </Chip>
                ))}
              </div>
            </div>

            <Field label="어학 성적" hint="선택 — 인증 점수에 반영됩니다.">
              <div className="flex gap-2">
                <Input
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  placeholder="시험명 (예: TOEIC)"
                />
                <Input
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="점수 (예: 900)"
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
            <Field label="자기소개" required hint="최대 500자">
              <Textarea
                maxLength={500}
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                placeholder="어떤 가이드인지, 어떤 여행을 안내하는지 소개해 주세요."
                className="min-h-32"
              />
            </Field>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">
                전문 분야 <span className="text-accent">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <Chip
                    key={s}
                    active={specialties.includes(s)}
                    onClick={() => toggle(specialties, setSpecialties, s)}
                  >
                    {s}
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
            이전
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              다음
            </Button>
          ) : (
            <Button type="button" disabled={!canNext} loading={loading} onClick={() => void submit()}>
              가이드 등록 완료
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
