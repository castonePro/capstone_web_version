"use client";

/** Flutter features/guideconversion/ui/guide_conversion_page.dart 대응 — 예비 가이드 → 정식 가이드 전환 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { guideConversionApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useFormat } from "@/lib/i18n/useFormat";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  Textarea,
  cx,
} from "@/components/ui";

function Requirement({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cx(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
          ok ? "bg-[#e7f6ec] text-[#136c33]" : "bg-sand text-muted",
        )}
      >
        {ok ? "✓" : "–"}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        <p className="text-[12px] text-muted">{detail}</p>
      </div>
    </li>
  );
}

export default function GuideConversionPage() {
  const t = useTranslations("guideConversion");
  const f = useFormat();
  const status = useAsync(() => guideConversionApi.status(), []);
  const applications = useAsync(() => guideConversionApi.myApplications(), []);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function apply() {
    setBusy(true);
    try {
      await guideConversionApi.apply(message.trim() || undefined);
      setMessage("");
      setToast(t("toastApplied"));
      status.reload();
      applications.reload();
    } catch (e) {
      setToast(f.apiError(e));
    } finally {
      setBusy(false);
    }
  }

  if (status.loading) return <LoadingBlock />;
  if (status.error) return <ErrorState error={status.error} onRetry={status.reload} />;
  const s = status.data;
  if (!s) return null;

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("title")} description={t("description")} />

      {toast && (
        <div className="mb-4 rounded-[12px] border border-line bg-sand px-4 py-3 text-[13px] text-ink2">
          {toast}
        </div>
      )}

      {s.alreadyGuide ? (
        <Card className="mb-6 border-[#bfe6cd] bg-[#e7f6ec]">
          <p className="text-sm font-semibold text-[#136c33]">{t("alreadyGuideTitle")}</p>
          <p className="mt-1 text-[13px] text-ink2">{t("alreadyGuideBody")}</p>
          <Link href="/guide/products" className="mt-3 inline-block">
            <Button size="sm">{t("goToProducts")}</Button>
          </Link>
        </Card>
      ) : (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{t("requirements")}</h2>
            {s.preliminaryGuide && <Badge tone="accent">{t("preliminaryBadge")}</Badge>}
          </div>
          <ul className="space-y-3">
            <Requirement
              label={t("reqHost")}
              ok={s.meetsHostRequirement}
              detail={t("currentCount", { count: s.companionHostCount })}
            />
            <Requirement
              label={t("reqJoin")}
              ok={s.meetsJoinRequirement}
              detail={t("currentCount", { count: s.companionJoinCount })}
            />
            <Requirement
              label={t("reqRating")}
              ok={s.meetsRatingRequirement}
              detail={
                s.operationAverageRating != null
                  ? t("currentScore", { score: Number(s.operationAverageRating).toFixed(1) })
                  : t("noRatingYet")
              }
            />
          </ul>

          <div className="mt-5 border-t border-line pt-4">
            {s.latestApplication?.status === "PENDING" ? (
              <p className="text-[13px] text-ink2">{t("pendingNotice")}</p>
            ) : (
              <>
                <Field label={t("messageLabel")} hint={t("messageHint")}>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("messagePlaceholder")}
                    disabled={!s.eligible}
                  />
                </Field>
                <Button
                  className="mt-3"
                  disabled={!s.eligible}
                  loading={busy}
                  onClick={() => void apply()}
                >
                  {s.eligible ? t("applyCta") : t("notEligibleCta")}
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">{t("history")}</h2>
        {applications.loading ? (
          <LoadingBlock />
        ) : (applications.data ?? []).length === 0 ? (
          <EmptyState title={t("noHistory")} />
        ) : (
          <div className="space-y-3">
            {applications.data!.map((a) => (
              <Card key={a.applicationId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge
                      tone={
                        a.status === "APPROVED"
                          ? "success"
                          : a.status === "REJECTED"
                            ? "danger"
                            : "accent"
                      }
                    >
                      {t(`applicationStatus.${a.status}`)}
                    </Badge>
                    <p className="mt-2 text-[13px] text-ink2">{a.message || t("noMessage")}</p>
                  </div>
                  <p className="shrink-0 text-[12px] text-muted">{f.dateFull(a.appliedAt)}</p>
                </div>
                {a.reviewNote && (
                  <p className="mt-3 rounded-[12px] bg-sand px-3 py-2.5 text-[13px] text-ink2">
                    {t("reviewNote", { note: a.reviewNote })}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {!s.alreadyGuide && s.latestApplication?.status === "APPROVED" && (
        <Card className="mt-6 border-coral-200 bg-coral-50">
          <p className="text-sm font-semibold">{t("approvedTitle")}</p>
          <p className="mt-1 text-[13px] text-ink2">{t("approvedBody")}</p>
          <Link href="/guide/register" className="mt-3 inline-block">
            <Button size="sm">{t("registerProfile")}</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
