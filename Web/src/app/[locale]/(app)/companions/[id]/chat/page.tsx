"use client";

/**
 * Flutter features/companion/ui/companion_chat_page.dart 대응 — 동행 그룹 채팅.
 * STOMP: 구독 /topic/companion-chat/{id}, 전송 /app/companion-chat/{id}
 *
 * 다국어: 상대 메시지에 "번역 보기"가 붙는다 (TranslatableText).
 */
import { use, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { companionApi } from "@/lib/api/endpoints";
import { connectStomp, type StompConnection } from "@/lib/ws/stomp";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
import { Avatar, Button, ErrorState, Input, LoadingBlock, cx } from "@/components/ui";
import { TranslatableText } from "@/components/TranslatableText";
import type { CompanionChatMessage } from "@/lib/api/types";
import { IconBack, IconSend } from "@/components/layout/icons";

export default function CompanionChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("chat");
  const tc = useTranslations("companions");
  const f = useFormat();
  const { userId } = useAuth();

  const [messages, setMessages] = useState<CompanionChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "connecting",
  );
  const connRef = useRef<StompConnection | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

function normalizeCompanionChatMessage(raw: unknown): CompanionChatMessage {
  if (!raw || typeof raw !== "object") {
    return {
      messageId: `${Date.now()}-${Math.random()}`,
      companionId: "",
      senderId: "",
      senderNickname: "",
      content: "",
      createdAt: new Date().toISOString(),
    };
  }
  const r = raw as Record<string, unknown>;
  return {
    messageId: String(r.messageId ?? r.message_id ?? r.id ?? `${Date.now()}-${Math.random()}`),
    companionId: String(r.companionId ?? r.companion_id ?? ""),
    senderId: String(r.senderId ?? r.sender_id ?? ""),
    senderNickname: String(r.senderNickname ?? r.sender_nickname ?? ""),
    content: String(r.content ?? ""),
    createdAt: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
  };
}

  useEffect(() => {
    let alive = true;
    companionApi
      .chatMessages(id)
      .then((res) => alive && setMessages(Array.isArray(res) ? res.map(normalizeCompanionChatMessage) : []))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const conn = connectStomp<unknown>({
      topic: `/topic/companion-chat/${id}`,
      onMessage: (msg) => {
        const item = normalizeCompanionChatMessage(msg);
        setMessages((prev) =>
          prev.some((m) => m.messageId === item.messageId) ? prev : [...prev, item],
        );
      },
      onStatus: setStatus,
    });
    connRef.current = conn;
    return () => conn.disconnect();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const content = input.trim();
    if (!content || !userId) return;
    connRef.current?.send(`/app/companion-chat/${id}`, { content, senderId: userId });
    setInput("");
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col lg:h-[calc(100dvh-8rem)]">
      <header className="mb-3 flex items-center justify-between gap-3">
        <Link
          href={`/companions/${id}`}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
        >
          <IconBack width={18} height={18} />
          {tc("detailTitle")}
        </Link>
        <span
          className={cx(
            "inline-flex items-center gap-1.5 text-[12px]",
            status === "connected" ? "text-[#136c33]" : "text-muted",
          )}
        >
          <span
            className={cx(
              "h-1.5 w-1.5 rounded-full",
              status === "connected" ? "bg-[#25a35a]" : "bg-muted",
            )}
          />
          {status === "connected"
            ? t("connected")
            : status === "connecting"
              ? t("connecting")
              : t("disconnected")}
        </span>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-[12px] border border-line bg-white p-4">
        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorState error={error} />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">{t("emptyGroup")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === userId;
            return (
              <div
                key={m.messageId}
                className={cx("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}
              >
                {!mine && <Avatar name={m.senderNickname} size={32} />}
                <div className={cx("max-w-[75%]", mine && "text-right")}>
                  {!mine && (
                    <p className="mb-0.5 text-[11px] font-medium text-muted">{m.senderNickname}</p>
                  )}
                  <div
                    className={cx(
                      "inline-block rounded-[14px] px-3.5 py-2.5 text-sm",
                      mine ? "bg-accent text-white" : "bg-sand text-ink2",
                    )}
                  >
                    {mine ? (
                      <span className="whitespace-pre-line">{m.content}</span>
                    ) : (
                      <TranslatableText text={m.content} />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">{f.relative(m.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("inputPlaceholder")}
          disabled={status !== "connected"}
        />
        <Button type="submit" className="shrink-0 px-4" disabled={status !== "connected"}>
          <IconSend width={18} height={18} />
        </Button>
      </form>
    </div>
  );
}
