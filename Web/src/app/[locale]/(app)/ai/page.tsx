"use client";

/**
 * 대화형 AI 플래너 — 멀티턴.
 *
 * 예전에는 화면만 채팅이고 엔진은 단발이었다. 매 요청이 독립적이라
 * "3일차를 좀 더 여유롭게"라고 하면 앞 일정과 무관한 새 일정이 나왔다.
 *
 * 지금은 서버에 대화 세션이 있고, 일정은 세션이 들고 있는 최신본 하나가 전부다.
 * 수정 요청은 전체 재생성이 아니라 변경 연산으로 처리되므로 건드리지 않은 날은
 * 그대로 유지되고, 바뀐 코스에는 "수정됨" 표시가 붙는다.
 *
 * 세션 id는 localStorage에 둔다. 새로고침해도 대화와 일정이 살아난다.
 */
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { plannerApi } from "@/lib/api/endpoints";
import type { GeneratedPlan } from "@/lib/api/types";
import { useFormat } from "@/lib/i18n/useFormat";
import { Button, Card, Chip, PageHeader, Spinner, Tag, Textarea, cx } from "@/components/ui";
import { IconSend, IconSparkle } from "@/components/layout/icons";

const INTEREST_KEYS = ["leisure", "food", "walk", "beach", "culture"] as const;
const EXAMPLE_KEYS = ["ex1", "ex2", "ex3", "ex4"] as const;
const SESSION_STORAGE_KEY = "planner_session_id";

interface Message {
  role: "ai" | "user";
  content: string;
  plan?: GeneratedPlan;
  /** 이번 턴에 추가·수정된 코스의 place_id */
  changed?: number[];
}

/** localStorage는 프라이빗 모드나 차단 설정에서 던질 수 있어 항상 감싼다. */
function readStoredSessionId(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}
function storeSessionId(id: string) {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    /* 저장 못 해도 이번 세션 동안은 메모리 상태로 동작한다 */
  }
}
function clearStoredSessionId() {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export default function AiPlannerPage() {
  const router = useRouter();
  const t = useTranslations("ai");
  const locale = useLocale();
  const f = useFormat();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: "ai", content: t("greeting") }]);
  const [input, setInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ─── 이전 대화 복구 ───
  useEffect(() => {
    const saved = readStoredSessionId();
    if (!saved) return;

    setRestoring(true);
    plannerApi
      .getSession(saved)
      .then((history) => {
        setSessionId(history.sessionId);

        const restored: Message[] = [{ role: "ai", content: t("greeting") }];
        for (const m of history.messages) {
          if (!m.content?.trim()) continue;
          restored.push({ role: m.role === "assistant" ? "ai" : "user", content: m.content });
        }
        // 서버는 최신 일정 하나만 보관한다. 마지막 AI 응답에 붙여 준다.
        if (history.plan) {
          for (let i = restored.length - 1; i >= 0; i--) {
            if (restored[i].role === "ai") {
              restored[i] = { ...restored[i], plan: history.plan };
              break;
            }
          }
        }
        setMessages(restored);
      })
      .catch(() => {
        // 만료됐거나 사라진 세션이면 조용히 새로 시작한다
        clearStoredSessionId();
      })
      .finally(() => setRestoring(false));
    // 최초 1회만 복구한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function toggleInterest(label: string) {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label],
    );
  }

  function startNewChat() {
    clearStoredSessionId();
    setSessionId(null);
    setMessages([{ role: "ai", content: t("greeting") }]);
    setInterests([]);
    setInput("");
  }

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || loading || restoring) return;

    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setInput("");
    setLoading(true);
    try {
      let id = sessionId;
      if (!id) {
        const created = await plannerApi.createSession(locale);
        id = created.sessionId;
        setSessionId(id);
        storeSessionId(id);
      }

      const turn = await plannerApi.sendMessage(id, prompt, interests, locale);
      const showsPlan = (turn.intent === "NEW_PLAN" || turn.intent === "MODIFY") && !!turn.plan;

      // reply는 모델이 사용자 언어로 쓴다. 비어 있을 때만 화면 문구로 대체한다.
      const content =
        turn.reply?.trim() ||
        (turn.plan ? t("planReady", { title: turn.plan.title }) : t("planFailed"));

      setMessages((m) => [
        ...m,
        {
          role: "ai",
          content,
          plan: showsPlan ? (turn.plan as GeneratedPlan) : undefined,
          changed: turn.intent === "MODIFY" ? turn.changedPlaceIds : undefined,
        },
      ]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", content: f.apiError(e) }]);
    } finally {
      setLoading(false);
    }
  }

  async function savePlan(plan: GeneratedPlan, idx: number) {
    setSavingIdx(idx);
    try {
      // 생성 응답을 그대로 되돌려준다. place_id가 들어 있어 서버가 이름 재조회 없이 연결한다.
      const itineraryId = await plannerApi.save(plan);
      router.push(`/trips/${itineraryId}`);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", content: f.apiError(e) }]);
    } finally {
      setSavingIdx(null);
    }
  }

  const isInitial = messages.length === 1 && !loading && !restoring;
  const hasPlan = messages.some((m) => m.plan);

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col lg:min-h-[calc(100dvh-7rem)]">
      <PageHeader title={t("title")} description={t("description")} />

      {sessionId && !isInitial && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" variant="ghost" onClick={startNewChat} disabled={loading}>
            {t("newChat")}
          </Button>
        </div>
      )}

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
            <div
              className={cx("max-w-[min(46rem,85%)] space-y-3", m.role === "user" && "text-right")}
            >
              <div
                className={cx(
                  "inline-block rounded-[14px] px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
                  m.role === "user" ? "bg-ink text-white" : "border border-line bg-card text-ink2",
                )}
              >
                {m.content}
              </div>
              {m.plan && (
                <PlanPreview
                  plan={m.plan}
                  changed={m.changed}
                  saving={savingIdx === i}
                  onSave={() => savePlan(m.plan!, i)}
                />
              )}
            </div>
          </div>
        ))}

        {(loading || restoring) && (
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#6600ff]/10 text-[#6600ff]">
              <IconSparkle width={18} height={18} />
            </span>
            <Spinner size={16} />
            {restoring ? t("restoring") : hasPlan ? t("working") : t("generating")}
          </div>
        )}

        {isInitial && (
          <div className="pt-2">
            <p className="mb-2 text-[13px] font-semibold text-ink2">{t("tryAsking")}</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_KEYS.map((k) => (
                <Chip key={k} onClick={() => void send(t(`examples.${k}`))}>
                  {t(`examples.${k}`)}
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
          {INTEREST_KEYS.map((k) => {
            const label = t(`interests.${k}`);
            return (
              <Chip
                key={k}
                active={interests.includes(label)}
                onClick={() => toggleInterest(label)}
              >
                {label}
              </Chip>
            );
          })}
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
            placeholder={t("inputPlaceholder")}
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
  changed,
  saving,
  onSave,
}: {
  plan: GeneratedPlan;
  changed?: number[];
  saving: boolean;
  onSave: () => void;
}) {
  const t = useTranslations("ai");
  const tt = useTranslations("trips");
  const f = useFormat();
  const days = [...new Set(plan.generated_courses.map((c) => c.day_number))].sort((a, b) => a - b);
  const changedSet = new Set(changed ?? []);

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
          {t("saveToTrips")}
        </Button>
      </div>

      <div className="mt-4 space-y-5">
        {days.map((day) => (
          <div key={day}>
            <p className="mb-2 text-[13px] font-semibold text-accent-text">
              {tt("day", { n: day })}
            </p>
            <ol className="space-y-2 border-l border-line pl-4">
              {plan.generated_courses
                .filter((c) => c.day_number === day)
                .map((c, i) => {
                  const isChanged = c.place_id != null && changedSet.has(c.place_id);
                  return (
                    <li key={`${day}-${i}`} className="relative">
                      <span
                        className={cx(
                          "absolute -left-[21px] top-1.5 h-2 w-2 rounded-full",
                          isChanged ? "bg-[#6600ff]" : "bg-accent",
                        )}
                      />
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[13px] font-semibold tabular-nums text-ink">
                          {f.time(c.start_time)}
                        </span>
                        <span className="text-sm font-medium">{c.place}</span>
                        <span className="text-[11px] text-muted">
                          {f.minutes(c.duration_minutes)}
                        </span>
                        {isChanged && (
                          <span className="rounded-full bg-[#6600ff]/10 px-2 py-0.5 text-[11px] font-semibold text-[#6600ff]">
                            {t("updated")}
                          </span>
                        )}
                      </div>
                      {c.description && (
                        <p className="mt-0.5 text-[13px] leading-relaxed text-ink2">
                          {c.description}
                        </p>
                      )}
                      {c.category_type?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.category_type.map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}
