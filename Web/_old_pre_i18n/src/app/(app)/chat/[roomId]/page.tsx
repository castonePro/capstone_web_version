"use client";

/**
 * Flutter features/chat/chat_room_page.dart 대응 — 1:1 채팅.
 * STOMP: 구독 /topic/chat/{roomId}, 전송 /app/chat/{roomId}
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { chatApi } from "@/lib/api/endpoints";
import { connectStomp, type StompConnection } from "@/lib/ws/stomp";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Avatar,
  Button,
  ErrorState,
  Input,
  LoadingBlock,
  Modal,
  cx,
} from "@/components/ui";
import type { ChatMessage } from "@/lib/api/types";
import { errorMessage, formatRelative } from "@/lib/utils/format";
import { IconBack, IconSend } from "@/components/layout/icons";

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const { userId } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "connecting",
  );
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const connRef = useRef<StompConnection | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    chatApi
      .messages(roomId)
      .then((res) => alive && setMessages(res))
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [roomId]);

  useEffect(() => {
    const conn = connectStomp<ChatMessage>({
      topic: `/topic/chat/${roomId}`,
      onMessage: (msg) =>
        setMessages((prev) =>
          prev.some((m) => m.messageId === msg.messageId) ? prev : [...prev, msg],
        ),
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
      setError(errorMessage(e));
      setLeaving(false);
    }
  }

  const peerName =
    messages.find((m) => m.senderId !== userId)?.senderNickname ?? "대화 상대";

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
            {status === "connected" ? "실시간" : "연결 중…"}
          </span>
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="text-[12px] font-medium text-muted hover:text-[#b21232]"
          >
            나가기
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-[12px] border border-line bg-white p-4">
        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorState message={error} />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">
            아직 메시지가 없습니다. 먼저 인사를 건네 보세요.
          </p>
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
                      "inline-block rounded-[14px] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                      mine ? "bg-accent text-white" : "bg-sand text-ink2",
                    )}
                  >
                    {m.content}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {formatRelative(m.createdAt)}
                    {mine && m.isRead && " · 읽음"}
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
          placeholder="메시지를 입력하세요"
          disabled={status !== "connected"}
        />
        <Button type="submit" className="shrink-0 px-4" disabled={status !== "connected"}>
          <IconSend width={18} height={18} />
        </Button>
      </form>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="채팅방을 나갈까요?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              취소
            </Button>
            <Button variant="danger" loading={leaving} onClick={() => void leave()}>
              나가기
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink2">나가면 이 대화는 목록에서 사라집니다.</p>
      </Modal>
    </div>
  );
}
