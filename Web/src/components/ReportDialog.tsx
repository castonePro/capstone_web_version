"use client";

/** Flutter features/report/ui/report_dialog.dart 대응 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Modal, Select, Textarea } from "@/components/ui";
import { reportApi } from "@/lib/api/endpoints";
import type { ReportReason } from "@/lib/api/types";
import { useFormat } from "@/lib/i18n/useFormat";

const REASONS: ReportReason[] = [
  "NO_SHOW",
  "HARASSMENT",
  "INAPPROPRIATE_BEHAVIOR",
  "FRAUD",
  "OTHER",
];

export function ReportDialog({
  open,
  onClose,
  reportedUserId,
  reportedUserNickname,
  companionId,
}: {
  open: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserNickname?: string;
  companionId?: string;
}) {
  const t = useTranslations("report");
  const c = useTranslations("common");
  const f = useFormat();

  const [reason, setReason] = useState<ReportReason>("NO_SHOW");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await reportApi.submit({
        reportedUserId,
        reasonCategory: reason,
        ...(companionId ? { companionId } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setDone(true);
    } catch (e) {
      setError(f.apiError(e));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setDone(false);
    setDescription("");
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={done ? t("doneTitle") : t("title")}
      footer={
        done ? (
          <Button onClick={close}>{c("ok")}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              {c("cancel")}
            </Button>
            <Button variant="danger" loading={loading} onClick={submit}>
              {t("submit")}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-sm leading-relaxed text-ink2">{t("doneBody")}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-muted">
            {reportedUserNickname
              ? t("introNamed", { name: reportedUserNickname })
              : t("intro")}
          </p>
          <Field label={t("reasonLabel")} required>
            <Select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {f.reportReason(r)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("detailLabel")} hint={t("detailHint")}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("detailPlaceholder")}
            />
          </Field>
          {error && <p className="text-[13px] text-[#b21232]">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
