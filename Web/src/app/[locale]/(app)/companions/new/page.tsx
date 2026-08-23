"use client";

/** Flutter features/companion/ui/companion_create_page.dart 대응 */
import { Suspense, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { companionApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
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

/** 취향 태그 추천값 — 화면 표시용이며 저장은 선택된 문자열 그대로 들어간다 */
const TAG_KEYS = [
  "food",
  "sea",
  "photo",
  "cafe",
  "nightview",
  "relaxed",
  "packed",
  "drinks",
  "art",
  "shopping",
] as const;

function CompanionCreateInner() {
  const router = useRouter();
  const search = useSearchParams();
  const t = useTranslations("companions");
  const c = useTranslations("common");
  const f = useFormat();
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

  const selectedTrip = trips.data?.find((x) => String(x.itineraryId) === itineraryId);

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  }

  function addCustomTag() {
    const tag = customTag.trim();
    if (!tag || tags.includes(tag)) return;
    setTags((prev) => [...prev, tag]);
    setCustomTag("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!itineraryId) {
      setError(t("errorNoItinerary"));
      return;
    }
    if (minParticipants > maxParticipants) {
      setError(t("errorMinOverMax"));
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
      setError(f.apiError(err));
    } finally {
      setLoading(false);
    }
  }

  // 본인 인증 게이트 — 백엔드 requirePhoneVerified와 동일한 선행 조건
  if (me && !me.phone_verified) {
    return (
      <div>
        <PageHeader title={t("create")} />
        <Card className="border-coral-200 bg-coral-50">
          <p className="text-sm font-semibold">{t("verifyRequiredTitle")}</p>
          <p className="mt-1 text-[13px] text-ink2">{t("verifyRequiredBody")}</p>
          <Link href="/verify-phone" className="mt-3 inline-block">
            <Button size="sm">{t("goVerify")}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("create")} description={t("createDescription")} />

      {trips.loading ? (
        <LoadingBlock />
      ) : trips.error ? (
        <ErrorState error={trips.error} onRetry={trips.reload} />
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Card className="space-y-4">
            <Field label={t("baseItinerary")} required hint={t("baseItineraryHint")}>
              <Select value={itineraryId} onChange={(e) => setItineraryId(e.target.value)} required>
                <option value="">{t("selectItinerary")}</option>
                {(trips.data ?? []).map((x) => (
                  <option key={x.itineraryId} value={x.itineraryId}>
                    {x.title} · {f.period(x.startDate, x.endDate)}
                  </option>
                ))}
              </Select>
            </Field>

            {(trips.data ?? []).length === 0 && (
              <p className="text-[13px] text-muted">
                {t("noItineraries")}{" "}
                <Link href="/ai" className="font-semibold text-accent-text hover:underline">
                  {t("aiPlannerLink")}
                </Link>
              </p>
            )}

            {selectedTrip && (
              <div className="rounded-[12px] bg-sand px-3.5 py-3 text-[13px] text-ink2">
                {selectedTrip.region ?? c("busan")} ·{" "}
                {f.period(selectedTrip.startDate, selectedTrip.endDate)} ·{" "}
                {t("courseCount", { count: selectedTrip.details.length })}
              </div>
            )}

            <Field label={t("postTitle")} required>
              <Input
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("postTitlePlaceholder")}
              />
            </Field>
          </Card>

          <Card className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("minParticipantsLabel")} required hint={t("minParticipantsHint")}>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={minParticipants}
                  onChange={(e) => setMin(Number(e.target.value))}
                />
              </Field>
              <Field label={t("maxParticipantsLabel")} required>
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
              <Field label={t("minAgeLabel")} hint={t("ageHint")}>
                <Input
                  type="number"
                  min={15}
                  max={100}
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  placeholder="20"
                />
              </Field>
              <Field label={t("maxAgeLabel")}>
                <Input
                  type="number"
                  min={15}
                  max={100}
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  placeholder="35"
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">{t("preferenceTags")}</p>
              <div className="flex flex-wrap gap-2">
                {TAG_KEYS.map((k) => {
                  const label = t(`tagOptions.${k}`);
                  return (
                    <Chip key={k} active={tags.includes(label)} onClick={() => toggleTag(label)}>
                      #{label}
                    </Chip>
                  );
                })}
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
                  placeholder={t("customTagPlaceholder")}
                />
                <Button type="button" variant="outline" onClick={addCustomTag}>
                  {c("add")}
                </Button>
              </div>
              {tags.length > 0 && (
                <p className="mt-2 text-[12px] text-muted">
                  {t("selectedTags", { tags: tags.join(", ") })}
                </p>
              )}
            </div>

            <Field label={t("costSharing")} hint={t("costSharingHint")}>
              <Textarea
                value={costSharingNote}
                onChange={(e) => setCost(e.target.value)}
                placeholder={t("costSharingPlaceholder")}
              />
            </Field>

            <Field label={t("intro")}>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("introPlaceholder")}
              />
            </Field>

            <Field label={t("snsHandle")} hint={t("snsHandleHint")}>
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
              {t("startRecruiting")}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
              {c("cancel")}
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
