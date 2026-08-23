"use client";

/**
 * Flutter features/ai/ai_planner_page.dart + ai_planner_provider.dart 대응.
 * 대화형 AI 플래너 — 생성된 일정을 확인하고 그대로 저장한다.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { plannerApi } from "@/lib/api/endpoints";
import type { GeneratedPlan } from "@/lib/api/types";
import {
  Button,
  Card,
  Chip,
  PageHeader,
  Spinner,
  Tag,
  Textarea,
  cx,
} from "@/components/ui";
import { errorMessage, formatMinutes, formatTime } from "@/lib/utils/format";
import { IconSend, IconSparkle } from "@/components/layout/icons";

const INTERESTS = ["레저", "맛집", "산책", "바다/해변", "문화/공연"];

const EXAMPLES = [
  "부산 1박2일 맛집 투어 일정 추천해줘",
  "2박3일 여행 추천해줘",
  "커플 여행 추천",
  "부산 핫플 추천",
];

interface Message {
  role: "ai" | "user";
  content: string;
  plan?: GeneratedPlan;
}

const GREETING: Message = {
  role: "ai",
  content:
    "안녕하세요! 부산 여행 플래너입니다. 어떤 여행을 원하시는지 알려주시면 동선까지 계산해 일정을 짜드릴게요.",
};

function isPlan(v: unknown): v is GeneratedPlan {
  return (
    typeof v === "object" &&
    v !== null &&
    "generated_courses" in v &&
    Array.isArray((v as GeneratedPlan).generated_courses)
  );
}

export default function AiPlannerPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function toggleInterest(label: string) {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label],
    );
  }

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || loading) return;
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setInput("");
    setLoading(true);
    try {
      const res = await plannerApi.generate(prompt, interests);
      if (res.status === "success" && isPlan(res.data)) {
        setMessages((m) => [
          ...m,
          {
            role: "ai",
            content: `'${res.data && typeof res.data === "object" ? (res.data as GeneratedPlan).title : ""}' 일정을 만들었어요. 확인해 보시고 마음에 들면 저장하세요.`,
            plan: res.data as GeneratedPlan,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "ai",
            content:
              typeof res.data === "string"
                ? res.data
                : "일정을 만들지 못했어요. 요청을 조금 더 구체적으로 적어 주세요.",
          },
        ]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", content: errorMessage(e) }]);
    } finally {
      setLoading(false);
    }
  }

  async function savePlan(plan: GeneratedPlan, idx: number) {
    setSavingIdx(idx);
    try {
      // 백엔드 PlannerSaveRequest {status, data}에서 data가 ItinerarySaveDto다.
      const itineraryId = await plannerApi.save(plan);
      router.push(`/trips/${itineraryId}`);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", content: errorMessage(e) }]);
    } finally {
      setSavingIdx(null);
    }
  }

  const isInitial = messages.length === 1 && !loading;

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col lg:min-h-[calc(100dvh-7rem)]">
      <PageHeader
        title="AI 여행 플래너"
        description="원하는 여행을 말로 설명하면 부산 장소 데이터를 근거로 동선까지 계산해 일정을 만들어 드립니다."
      />

      {/* ─── 대화 영역 ─── */}
      <div className="flex-1 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cx("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "ai" && (
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#6600ff]/10 text-[#6600ff]">
                <IconSparkle width={18} height={18} />
              </span>
            )}
            <div className={cx("max-w-[min(46rem,85%)] space-y-3", m.role === "user" && "text-right")}>
              <div
                className={cx(
                  "inline-block rounded-[14px] px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
                  m.role === "user"
                    ? "bg-ink text-white"
                    : "border border-line bg-card text-ink2",
                )}
              >
                {m.content}
              </div>
              {m.plan && (
                <PlanPreview
                  plan={m.plan}
                  saving={savingIdx === i}
                  onSave={() => savePlan(m.plan!, i)}
                />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#6600ff]/10 text-[#6600ff]">
              <IconSparkle width={18} height={18} />
            </span>
            <Spinner size={16} />
            부산 장소 데이터를 찾아 일정을 짜고 있어요… (최대 1~2분)
          </div>
        )}

        {isInitial && (
          <div className="pt-2">
            <p className="mb-2 text-[13px] font-semibold text-ink2">이렇게 물어보세요</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((q) => (
                <Chip key={q} onClick={() => void send(q)}>
                  {q}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ─── 입력 영역 ─── */}
      <div className="sticky bottom-24 mt-6 space-y-3 lg:bottom-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {INTERESTS.map((label) => (
            <Chip key={label} active={interests.includes(label)} onClick={() => toggleInterest(label)}>
              {label}
            </Chip>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 rounded-[14px] border border-line bg-white p-2 shadow-sm"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="어떤 여행을 원하시나요? (예: 2박3일 바다 보면서 맛집 위주로)"
            className="min-h-11 resize-none border-0 focus:border-0"
          />
          <Button type="submit" size="md" loading={loading} className="shrink-0 px-3">
            <IconSend width={18} height={18} />
          </Button>
        </form>
      </div>
    </div>
  );
}

function PlanPreview({
  plan,
  saving,
  onSave,
}: {
  plan: GeneratedPlan;
  saving: boolean;
  onSave: () => void;
}) {
  const days = [...new Set(plan.generated_courses.map((c) => c.day_number))].sort((a, b) => a - b);

  return (
    <Card className="text-left">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">{plan.title}</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            {plan.region} · {plan.start_date} ~ {plan.end_date}
          </p>
        </div>
        <Button size="sm" loading={saving} onClick={onSave}>
          내 여행에 저장
        </Button>
      </div>

      <div className="mt-4 space-y-5">
        {days.map((day) => (
          <div key={day}>
            <p className="mb-2 text-[13px] font-semibold text-accent-text">DAY {day}</p>
            <ol className="space-y-2 border-l border-line pl-4">
              {plan.generated_courses
                .filter((c) => c.day_number === day)
                .map((c, i) => (
                  <li key={`${day}-${i}`} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[13px] font-semibold tabular-nums text-ink">
                        {formatTime(c.start_time)}
                      </span>
                      <span className="text-sm font-medium">{c.place}</span>
                      <span className="text-[11px] text-muted">
                        {formatMinutes(c.duration_minutes)}
                      </span>
                    </div>
                    {c.description && (
                      <p className="mt-0.5 text-[13px] leading-relaxed text-ink2">{c.description}</p>
                    )}
                    {c.category_type?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.category_type.map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}
