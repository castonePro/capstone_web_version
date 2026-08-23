"use client";

/** Flutter features/chat/chat_room_list_page.dart 대응 */
import Link from "next/link";
import { chatApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { formatRelative } from "@/lib/utils/format";

export default function ChatListPage() {
  const { userId } = useAuth();
  const { data, loading, error, reload } = useAsync(() => chatApi.rooms(), []);

  return (
    <div>
      <PageHeader title="채팅" description="가이드와의 1:1 대화 목록입니다." />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="대화가 없습니다"
          description="가이드 탐색에서 문의하기를 누르면 대화가 시작됩니다."
          action={
            <Link href="/guides">
              <Button size="sm">가이드 찾기</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {data!.map((room) => {
            // 내가 사용자면 상대는 가이드, 내가 가이드면 상대는 사용자
            const iAmUser = room.userId === userId;
            const peer = iAmUser ? room.guideNickname : room.userNickname;
            return (
              <Link key={room.roomId} href={`/chat/${room.roomId}`} className="block">
                <Card className="transition-colors hover:border-accent">
                  <div className="flex items-center gap-3">
                    <Avatar name={peer} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{peer}</p>
                        {room.isClosed && <Badge tone="neutral">종료됨</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-muted">
                        {room.lastMessage || "메시지가 없습니다"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-muted">{formatRelative(room.createdAt)}</p>
                      {room.unreadCount > 0 && (
                        <span className="mt-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
