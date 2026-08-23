"use client";

/** Flutter features/payment/ui/my_payments_page.dart 대응 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { paymentApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
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

const TONE: Record<PaymentStatus, BadgeTone> = {
  PENDING: "accent",
  PAID: "success",
  REFUNDED: "teal",
  FORFEITED: "danger",
  FAILED: "danger",
};

export default function PaymentsPage() {
  const t = useTranslations("payments");
  const f = useFormat();
  const { data, loading, error, reload } = useAsync(() => paymentApi.myPayments(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function pay(paymentId: string) {
    setBusy(paymentId);
    try {
      await paymentApi.pay(paymentId);
      setToast(t("toastPaid"));
      reload();
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(null);
    }
  }

  const pending = (data ?? []).filter((p) => p.status === "PENDING");

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("title")} description={t("description")} />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      {pending.length > 0 && (
        <Card className="mb-5 border-coral-200 bg-coral-50">
          <p className="text-sm font-semibold">{t("pendingTitle", { count: pending.length })}</p>
          <p className="mt-1 text-[13px] text-ink2">{t("pendingBody")}</p>
        </Card>
      )}

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title={t("emptyTitle")} />
      ) : (
        <div className="space-y-3">
          {data!.map((p) => (
            <Card key={p.paymentId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral">{f.paymentType(p.type)}</Badge>
                    <Badge tone={TONE[p.status]}>{f.paymentStatus(p.status)}</Badge>
                  </div>
                  <Link
                    href={`/companions/${p.companionId}`}
                    className="mt-2 block truncate text-[15px] font-semibold hover:text-accent-text"
                  >
                    {p.companionTitle}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {t("createdAt", { date: f.dateTime(p.createdAt) })}
                    {p.paidAt && ` · ${t("paidAt", { date: f.dateTime(p.paidAt) })}`}
                    {p.resolvedAt && ` · ${t("resolvedAt", { date: f.dateTime(p.resolvedAt) })}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[17px] font-semibold">{f.price(p.amount)}</p>
                  {p.status === "PENDING" && (
                    <Button
                      size="sm"
                      className="mt-2"
                      loading={busy === p.paymentId}
                      onClick={() => void pay(p.paymentId)}
                    >
                      {t("payNow")}
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
