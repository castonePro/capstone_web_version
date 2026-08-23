"use client";

/** Flutter features/planner_detail/ui/planner_detail_page.dart 대응 — 내 일정 목록 */
import Link from "next/link";
import { useState } from "react";
import { bidApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { Button, EmptyState, ErrorState, LoadingBlock, Modal, PageHeader } from "@/components/ui";
import { ItineraryCard } from "@/components/cards";
import { errorMessage } from "@/lib/utils/format";

export default function TripsPage() {
  const { data, loading, error, reload } = useAsync(() => plannerApi.list(), []);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function remove(id: number) {
    setBusy(id);
    try {
      await plannerApi.remove(id);
      setConfirmDelete(null);
      reload();
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  /** 앱의 '역으로 제안하기' — 내 일정을 가이드 마켓에 올린다 */
  async function proposeToGuides(id: number) {
    setBusy(id);
    try {
      await bidApi.createUserBid(id);
      setToast("가이드에게 일정을 제안했습니다. 입찰 현황에서 확인하세요.");
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="내 여행"
        description="AI로 만든 일정과 저장한 코스를 모아 봅니다."
        action={
          <Link href="/ai">
            <Button size="sm">새 일정 만들기</Button>
          </Link>
        }
      />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-3 font-semibold text-accent-text"
          >
            닫기
          </button>
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="저장된 일정이 없습니다"
          description="AI 플래너로 첫 일정을 만들어 보세요."
          action={
            <Link href="/ai">
              <Button size="sm">AI 플래너 열기</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.map((it) => (
            <ItineraryCard
              key={it.itineraryId}
              itinerary={it}
              action={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busy === it.itineraryId}
                    onClick={() => void proposeToGuides(it.itineraryId)}
                  >
                    가이드에게 제안
                  </Button>
                  <Link href={`/companions/new?itineraryId=${it.itineraryId}`}>
                    <Button size="sm" variant="secondary">
                      동행 모집
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(it.itineraryId)}
                  >
                    삭제
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="일정을 삭제할까요?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              취소
            </Button>
            <Button
              variant="danger"
              loading={busy === confirmDelete}
              onClick={() => confirmDelete !== null && void remove(confirmDelete)}
            >
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink2">
          삭제한 일정은 되돌릴 수 없습니다. 이 일정으로 만든 동행 모집글이 있다면 함께 확인해
          주세요.
        </p>
      </Modal>
    </div>
  );
}
