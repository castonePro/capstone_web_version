"use client";

/** Flutter features/guide/ui/guide_register_page.dart(상품 등록/수정 폼) 대응 */
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Chip, Field, Input, Textarea } from "@/components/ui";
import { useFormat } from "@/lib/i18n/useFormat";
import type { GuideProduct, GuideProductRequest, GuideSchedule } from "@/lib/api/types";
import { IconPlus } from "@/components/layout/icons";

/**
 * 가이드가 구사 가능한 언어 목록.
 * 값은 백엔드 available_languages에 저장되는 한국어 문자열 그대로 두고(기존 데이터 호환),
 * 화면에는 사용자의 언어로 번역해 보여 준다.
 */
const LANGUAGE_OPTIONS = [
  { value: "한국어", key: "ko" },
  { value: "영어", key: "en" },
  { value: "일본어", key: "ja" },
  { value: "중국어", key: "zh" },
  { value: "베트남어", key: "vi" },
  { value: "인도네시아어", key: "id" },
] as const;

function useList(initial: string[]) {
  const [items, setItems] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  return {
    items,
    draft,
    setDraft,
    add() {
      const v = draft.trim();
      if (!v || items.includes(v)) return;
      setItems((p) => [...p, v]);
      setDraft("");
    },
    remove(v: string) {
      setItems((p) => p.filter((x) => x !== v));
    },
  };
}

function ListEditor({
  label,
  hint,
  list,
  placeholder,
}: {
  label: string;
  hint?: string;
  list: ReturnType<typeof useList>;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <Input
          value={list.draft}
          onChange={(e) => list.setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              list.add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={list.add} className="shrink-0 px-3">
          <IconPlus width={16} height={16} />
        </Button>
      </div>
      {list.items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {list.items.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => list.remove(v)}
              className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-[13px] text-ink2 hover:bg-coral-100"
            >
              {v}
              <span className="text-muted">✕</span>
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

export function GuideProductForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: GuideProduct;
  submitLabel: string;
  onSubmit: (body: GuideProductRequest) => Promise<void>;
}) {
  const t = useTranslations("guideProducts");
  const lang = useTranslations("languages");
  const f = useFormat();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [region, setRegion] = useState(initial?.region ?? "부산광역시");
  const [durationMinutes, setDuration] = useState(initial?.durationMinutes ?? 180);
  const [maxCapacity, setCapacity] = useState(initial?.maxCapacity ?? 4);
  const [pricePerPerson, setPrice] = useState<number>(Number(initial?.pricePerPerson ?? 50000));
  const [hasCar, setHasCar] = useState(initial?.hasCar ?? false);
  const [languages, setLanguages] = useState<string[]>(initial?.availableLanguages ?? ["한국어"]);
  const [meetingPoint, setMeetingPoint] = useState(initial?.meetingPoint ?? "");
  const [meetingPointDesc, setMeetingDesc] = useState(initial?.meetingPointDesc ?? "");

  const included = useList(initial?.includedItems ?? []);
  const excluded = useList(initial?.excludedItems ?? []);
  const materials = useList(initial?.relatedMaterials ?? []);

  const [schedules, setSchedules] = useState<GuideSchedule[]>([
    { startTime: "10:00", endTime: "12:00", title: "", description: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSchedule(i: number, patch: Partial<GuideSchedule>) {
    setSchedules((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (languages.length === 0) {
      setError(t("errorNoLanguage"));
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        region: region.trim(),
        durationMinutes,
        maxCapacity,
        pricePerPerson,
        hasCar,
        availableLanguages: languages,
        meetingPoint: meetingPoint.trim(),
        meetingPointDesc: meetingPointDesc.trim() || undefined,
        includedItems: included.items,
        excludedItems: excluded.items,
        relatedMaterials: materials.items,
        schedules: schedules.filter((s) => s.title.trim()),
      });
    } catch (err) {
      setError(f.apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      <Card className="space-y-4">
        <Field label={t("productTitle")} required>
          <Input
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("productTitlePlaceholder")}
          />
        </Field>
        <Field label={t("productDescription")} required>
          <Textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("productDescriptionPlaceholder")}
            className="min-h-32"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("region")} required>
            <Input required value={region} onChange={(e) => setRegion(e.target.value)} />
          </Field>
          <Field label={t("price")} required>
            <Input
              type="number"
              min={0}
              step={1000}
              required
              value={pricePerPerson}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </Field>
          <Field label={t("durationMinutes")} required>
            <Input
              type="number"
              min={30}
              step={30}
              required
              value={durationMinutes}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </Field>
          <Field label={t("maxCapacity")} required>
            <Input
              type="number"
              min={1}
              max={50}
              required
              value={maxCapacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[13px] font-medium text-ink2">
          <input
            type="checkbox"
            checked={hasCar}
            onChange={(e) => setHasCar(e.target.checked)}
            className="accent-[#ff4b26]"
          />
          {t("hasCarLabel")}
        </label>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink2">
            {t("availableLanguages")} <span className="text-accent">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                active={languages.includes(opt.value)}
                onClick={() =>
                  setLanguages((prev) =>
                    prev.includes(opt.value)
                      ? prev.filter((x) => x !== opt.value)
                      : [...prev, opt.value],
                  )
                }
              >
                {lang(opt.key)}
              </Chip>
            ))}
          </div>
        </div>

        <Field label={t("meetingPoint")} required>
          <Input
            required
            maxLength={255}
            value={meetingPoint}
            onChange={(e) => setMeetingPoint(e.target.value)}
            placeholder={t("meetingPointPlaceholder")}
          />
        </Field>
        <Field label={t("meetingPointDesc")}>
          <Textarea
            value={meetingPointDesc}
            onChange={(e) => setMeetingDesc(e.target.value)}
            placeholder={t("meetingPointDescPlaceholder")}
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <ListEditor
          label={t("included")}
          list={included}
          placeholder={t("includedPlaceholder")}
        />
        <ListEditor
          label={t("excluded")}
          list={excluded}
          placeholder={t("excludedPlaceholder")}
        />
        <ListEditor
          label={t("materials")}
          list={materials}
          placeholder={t("materialsPlaceholder")}
        />
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-ink2">{t("timeline")}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setSchedules((p) => [
                ...p,
                { startTime: "13:00", endTime: "14:00", title: "", description: "" },
              ])
            }
          >
            {t("addStep")}
          </Button>
        </div>

        {schedules.map((s, i) => (
          <div key={i} className="rounded-[12px] border border-line p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted">
                {t("step", { n: i + 1 })}
              </span>
              {schedules.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSchedules((p) => p.filter((_, idx) => idx !== i))}
                  className="text-[12px] text-muted hover:text-[#b21232]"
                >
                  {t("removeStep")}
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("startTime")}>
                <Input
                  type="time"
                  value={s.startTime}
                  onChange={(e) => updateSchedule(i, { startTime: e.target.value })}
                />
              </Field>
              <Field label={t("endTime")}>
                <Input
                  type="time"
                  value={s.endTime}
                  onChange={(e) => updateSchedule(i, { endTime: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-3 space-y-3">
              <Field label={t("stepPlace")}>
                <Input
                  value={s.title}
                  onChange={(e) => updateSchedule(i, { title: e.target.value })}
                  placeholder={t("stepPlacePlaceholder")}
                />
              </Field>
              <Field label={t("stepContent")}>
                <Textarea
                  value={s.description}
                  onChange={(e) => updateSchedule(i, { description: e.target.value })}
                  placeholder={t("stepContentPlaceholder")}
                />
              </Field>
            </div>
          </div>
        ))}
      </Card>

      {error && (
        <p className="rounded-[12px] bg-[#fdeaef] px-3.5 py-2.5 text-[13px] text-[#b21232]">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
