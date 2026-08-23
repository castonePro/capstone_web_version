"use client";

/** Flutter features/planner_detail/ui/planner_detail_page.dart 대응 — 내 일정 목록 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { bidApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
import { Button, EmptyState, ErrorState, LoadingBlock, Modal, PageHeader } from "@/components/ui";
import { ItineraryCard } from "@/components/cards";

export default function TripsPage() {
  const t = useTranslations("trips");
  const c = useTranslations("common");
  const f = useFormat();
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
      setToast(f.apiError(e));
    } finally {
      setBusy(null);
    }
  }

  /** 앱의 '역으로 제안하기' — 내 일정을 가이드 마켓에 올린다 */
  async function proposeToGuides(id: number) {
    setBusy(id);
    try {
      await bidApi.createUserBid(id);
      setToast(t("proposedToast"));
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Link href="/ai">
            <Button size="sm">{t("createNew")}</Button>
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
            {c("close")}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Link href="/ai">
              <Button size="sm">{t("openAiPlanner")}</Button>
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
                    {t("proposeToGuides")}
                  </Button>
                  <Link href={`/companions/new?itineraryId=${it.itineraryId}`}>
                    <Button size="sm" variant="secondary">
                      {t("recruitCompanion")}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(it.itineraryId)}
                  >
                    {c("delete")}
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
        title={t("deleteConfirmTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              {c("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={busy === confirmDelete}
              onClick={() => confirmDelete !== null && void remove(confirmDelete)}
            >
              {c("delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink2">{t("deleteConfirmBody")}</p>
      </Modal>
    </div>
  );
}
