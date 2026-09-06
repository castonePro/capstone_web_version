"use client";

/**
 * Flutter features/chat/chat_room_page.dart 대응 — 1:1 채팅.
 * STOMP: 구독 /topic/chat/{roomId}, 전송 /app/chat/{roomId}
 *
 * 다국어: 상대 메시지에 "번역 보기"가 붙는다 — 외국인 여행자와 한국 가이드가
 * 각자 모국어로 쓰고 읽을 수 있게 하는 게 이 앱에서 번역이 가장 중요한 지점이다.
 */
import { use, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { chatApi } from "@/lib/api/endpoints";
import { connectStomp, type StompConnection } from "@/lib/ws/stomp";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
import { Avatar, Button, ErrorState, Input, LoadingBlock, Modal, cx } from "@/components/ui";
import { TranslatableText } from "@/components/TranslatableText";
import type { ChatMessage } from "@/lib/api/types";
import { IconBack, IconSend } from "@/components/layout/icons";

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const t = useTranslations("chat");
  const c = useTranslations("common");
  const f = useFormat();
  const { userId } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "connecting",
  );
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const connRef = useRef<StompConnection | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

function normalizeChatMessage(raw: unknown): ChatMessage {
  if (!raw || typeof raw !== "object") {
    return {
      messageId: `${Date.now()}-${Math.random()}`,
      roomId: "",
      senderId: "",
      senderNickname: "",
      content: "",
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }
  const r = raw as Record<string, unknown>;
  return {
    messageId: String(r.messageId ?? r.message_id ?? r.id ?? `${Date.now()}-${Math.random()}`),
    roomId: String(r.roomId ?? r.room_id ?? ""),
    senderId: String(r.senderId ?? r.sender_id ?? ""),
    senderNickname: String(r.senderNickname ?? r.sender_nickname ?? ""),
    content: String(r.content ?? ""),
    isRead: Boolean(r.isRead ?? r.is_read ?? false),
    createdAt: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
  };
}

  useEffect(() => {
    let alive = true;
    chatApi
      .messages(roomId)
      .then((res) => alive && setMessages(Array.isArray(res) ? res.map(normalizeChatMessage) : []))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [roomId]);

  useEffect(() => {
    const conn = connectStomp<unknown>({
      topic: `/topic/chat/${roomId}`,
      onMessage: (msg) => {
        const item = normalizeChatMessage(msg);
        setMessages((prev) =>
          prev.some((m) => m.messageId === item.messageId) ? prev : [...prev, item],
        );
      },
      onStatus: setStatus,
    });
    connRef.current = conn;
    return () => conn.disconnect();
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const content = input.trim();
    if (!content || !userId) return;
    connRef.current?.send(`/app/chat/${roomId}`, { content, senderId: userId });
    setInput("");
  }

  async function leave() {
    setLeaving(true);
    try {
      await chatApi.leave(roomId);
      router.replace("/chat");
    } catch (e) {
      setError(e);
      setLeaving(false);
    }
  }

  const peerName = messages.find((m) => m.senderId !== userId)?.senderNickname ?? t("peer");

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col lg:h-[calc(100dvh-8rem)]">
      <header className="mb-3 flex items-center justify-between gap-3">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
        >
          <IconBack width={18} height={18} />
          {peerName}
        </Link>
        <div className="flex items-center gap-3">
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
            {status === "connected" ? t("live") : t("connecting")}
          </span>
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="text-[12px] font-medium text-muted hover:text-[#b21232]"
          >
            {t("leave")}
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-[12px] border border-line bg-white p-4">
        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorState error={error} />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">{t("empty")}</p>
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
                  <p className="mt-0.5 text-[11px] text-muted">
                    {f.relative(m.createdAt)}
                    {mine && m.isRead && ` · ${t("read")}`}
                  </p>
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

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={t("leaveConfirmTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              {c("cancel")}
            </Button>
            <Button variant="danger" loading={leaving} onClick={() => void leave()}>
              {t("leave")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink2">{t("leaveConfirmBody")}</p>
      </Modal>
    </div>
  );
}
