"use client";

/** Flutter features/payment/ui/my_payments_page.dart 대응 */
import Link from "next/link";
import { useState } from "react";
import { paymentApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  type BadgeTone,
} from "@/components/ui";
import type { PaymentStatus } from "@/lib/api/types";
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_TYPE_LABEL,
  errorMessage,
  formatDateTime,
  formatPrice,
} from "@/lib/utils/format";

const TONE: Record<PaymentStatus, BadgeTone> = {
  PENDING: "accent",
  PAID: "success",
  REFUNDED: "teal",
  FORFEITED: "danger",
  FAILED: "danger",
};

export default function PaymentsPage() {
  const { data, loading, error, reload } = useAsync(() => paymentApi.myPayments(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function pay(paymentId: string) {
    setBusy(paymentId);
    try {
      await paymentApi.pay(paymentId);
      setToast("결제가 완료되었습니다. (Mock PG — 즉시 승인)");
      reload();
    } catch (e) {
      setToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const pending = (data ?? []).filter((p) => p.status === "PENDING");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="결제 내역"
        description="참여 수수료·보증금·모집글 부스트 결제 이력입니다. 현재는 Mock PG로 즉시 승인됩니다."
      />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      {pending.length > 0 && (
        <Card className="mb-5 border-coral-200 bg-coral-50">
          <p className="text-sm font-semibold">결제 대기 {pending.length}건</p>
          <p className="mt-1 text-[13px] text-ink2">
            결제를 완료해야 동행 참여·부스트가 확정됩니다.
          </p>
        </Card>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="결제 내역이 없습니다" />
      ) : (
        <div className="space-y-3">
          {data!.map((p) => (
            <Card key={p.paymentId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral">{PAYMENT_TYPE_LABEL[p.type]}</Badge>
                    <Badge tone={TONE[p.status]}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
                  </div>
                  <Link
                    href={`/companions/${p.companionId}`}
                    className="mt-2 block truncate text-[15px] font-semibold hover:text-accent-text"
                  >
                    {p.companionTitle}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-muted">
                    생성 {formatDateTime(p.createdAt)}
                    {p.paidAt && ` · 결제 ${formatDateTime(p.paidAt)}`}
                    {p.resolvedAt && ` · 처리 ${formatDateTime(p.resolvedAt)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[17px] font-semibold">{formatPrice(p.amount)}</p>
                  {p.status === "PENDING" && (
                    <Button
                      size="sm"
                      className="mt-2"
                      loading={busy === p.paymentId}
                      onClick={() => void pay(p.paymentId)}
                    >
                      결제하기
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
