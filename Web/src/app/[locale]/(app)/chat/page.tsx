"use client";

/** Flutter features/chat/chat_room_list_page.dart 대응 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { chatApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
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

export default function ChatListPage() {
  const t = useTranslations("chat");
  const nav = useTranslations("nav");
  const f = useFormat();
  const { userId } = useAuth();
  const { data, loading, error, reload } = useAsync(() => chatApi.rooms(), []);

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Link href="/guides">
              <Button size="sm">{nav("guides")}</Button>
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
                        {room.isClosed && <Badge tone="neutral">{t("closed")}</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-muted">
                        {room.lastMessage || t("noMessages")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-muted">{f.relative(room.createdAt)}</p>
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
