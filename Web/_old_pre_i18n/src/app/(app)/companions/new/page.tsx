"use client";

/** Flutter features/companion/ui/companion_create_page.dart 대응 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { companionApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Button,
  Card,
  Chip,
  ErrorState,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { errorMessage, formatPeriod } from "@/lib/utils/format";

const TAG_SUGGESTIONS = [
  "맛집",
  "바다",
  "사진",
  "카페",
  "야경",
  "느긋하게",
  "부지런히",
  "술 한잔",
  "예술",
  "쇼핑",
];

function CompanionCreateInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { me } = useAuth();
  const trips = useAsync(() => plannerApi.list(), []);

  const [itineraryId, setItineraryId] = useState<string>(search.get("itineraryId") ?? "");
  const [title, setTitle] = useState("");
  const [minParticipants, setMin] = useState(2);
  const [maxParticipants, setMax] = useState(4);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [costSharingNote, setCost] = useState("");
  const [description, setDescription] = useState("");
  const [minAge, setMinAge] = useState<string>("");
  const [maxAge, setMaxAge] = useState<string>("");
  const [snsHandle, setSns] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTrip = trips.data?.find((t) => String(t.itineraryId) === itineraryId);

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setCustomTag("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!itineraryId) {
      setError("동행의 기준이 될 일정을 선택해 주세요.");
      return;
    }
    if (minParticipants > maxParticipants) {
      setError("최소 인원이 최대 인원보다 클 수 없습니다.");
      return;
    }
    setLoading(true);
    try {
      const created = await companionApi.create({
        itineraryId: Number(itineraryId),
        title: title.trim(),
        minParticipants,
        maxParticipants,
        preferenceTags: tags,
        costSharingNote: costSharingNote.trim() || undefined,
        description: description.trim() || undefined,
        minAge: minAge ? Number(minAge) : null,
        maxAge: maxAge ? Number(maxAge) : null,
        snsHandle: snsHandle.trim() || undefined,
      });
      router.replace(`/companions/${created.companionId}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // 본인 인증 게이트 — 백엔드 requirePhoneVerified와 동일한 선행 조건
  if (me && !me.phone_verified) {
    return (
      <div>
        <PageHeader title="동행 모집하기" />
        <Card className="border-coral-200 bg-coral-50">
          <p className="text-sm font-semibold">본인 인증이 필요합니다</p>
          <p className="mt-1 text-[13px] text-ink2">
            동행 방 개설은 본인 인증을 마친 사용자만 가능합니다.
          </p>
          <Link href="/verify-phone" className="mt-3 inline-block">
            <Button size="sm">본인 인증하러 가기</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="동행 모집하기"
        description="내 일정을 기준으로 함께 갈 사람을 모집합니다. 승인제로 운영되며 방장이 신청을 직접 수락합니다."
      />

      {trips.loading ? (
        <LoadingBlock />
      ) : trips.error ? (
        <ErrorState message={trips.error} onRetry={trips.reload} />
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Card className="space-y-4">
            <Field label="기준 일정" required hint="동행 참여자에게 이 일정의 코스가 공개됩니다.">
              <Select value={itineraryId} onChange={(e) => setItineraryId(e.target.value)} required>
                <option value="">일정을 선택하세요</option>
                {(trips.data ?? []).map((t) => (
                  <option key={t.itineraryId} value={t.itineraryId}>
                    {t.title} · {formatPeriod(t.startDate, t.endDate)}
                  </option>
                ))}
              </Select>
            </Field>

            {(trips.data ?? []).length === 0 && (
              <p className="text-[13px] text-muted">
                저장된 일정이 없습니다.{" "}
                <Link href="/ai" className="font-semibold text-accent-text hover:underline">
                  AI 플래너
                </Link>
                로 먼저 일정을 만들어 주세요.
              </p>
            )}

            {selectedTrip && (
              <div className="rounded-[12px] bg-sand px-3.5 py-3 text-[13px] text-ink2">
                {selectedTrip.region ?? "부산"} ·{" "}
                {formatPeriod(selectedTrip.startDate, selectedTrip.endDate)} ·{" "}
                {selectedTrip.details.length}개 코스
              </div>
            )}

            <Field label="모집글 제목" required>
              <Input
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 광안리 야경 보면서 맥주 한잔 하실 분"
              />
            </Field>
          </Card>

          <Card className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="최소 인원" required hint="마감 시 이 인원을 못 채우면 방장이 결정합니다.">
                <Input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={minParticipants}
                  onChange={(e) => setMin(Number(e.target.value))}
                />
              </Field>
              <Field label="최대 인원" required>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={maxParticipants}
                  onChange={(e) => setMax(Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="모집 나이 (최소)" hint="비워 두면 연령 무관">
                <Input
                  type="number"
                  min={15}
                  max={100}
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  placeholder="예: 20"
                />
              </Field>
              <Field label="모집 나이 (최대)">
                <Input
                  type="number"
                  min={15}
                  max={100}
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  placeholder="예: 35"
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">취향 태그</p>
              <div className="flex flex-wrap gap-2">
                {TAG_SUGGESTIONS.map((t) => (
                  <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>
                    #{t}
                  </Chip>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="직접 입력"
                />
                <Button type="button" variant="outline" onClick={addCustomTag}>
                  추가
                </Button>
              </div>
              {tags.length > 0 && (
                <p className="mt-2 text-[12px] text-muted">선택됨: {tags.join(", ")}</p>
              )}
            </div>

            <Field label="비용 분담 방식" hint="교통비·숙박비·식비를 어떻게 나눌지 미리 적어 두면 분쟁이 줄어듭니다.">
              <Textarea
                value={costSharingNote}
                onChange={(e) => setCost(e.target.value)}
                placeholder="예: 숙소는 N분의 1, 식비는 각자 부담"
              />
            </Field>

            <Field label="소개">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="어떤 분위기의 여행인지, 어떤 분과 함께하고 싶은지 적어 주세요."
              />
            </Field>

            <Field label="SNS·커뮤니티 아이디" hint="선택 — 여행 분위기를 보여주고 싶을 때">
              <Input
                maxLength={50}
                value={snsHandle}
                onChange={(e) => setSns(e.target.value)}
                placeholder="@instagram_id"
              />
            </Field>
          </Card>

          {error && (
            <p className="rounded-[12px] bg-[#fdeaef] px-3.5 py-2.5 text-[13px] text-[#b21232]">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="lg" loading={loading}>
              모집 시작하기
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
              취소
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function CompanionCreatePage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <CompanionCreateInner />
    </Suspense>
  );
}
