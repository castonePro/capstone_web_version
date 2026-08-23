"use client";

/** Flutter features/profile/ui/my_page.dart 대응 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { userApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
import { Avatar, Badge, Button, Card, LoadingBlock, PageHeader, Rating } from "@/components/ui";

const MENU = [
  { href: "/companions/my", key: "myCompanions" },
  { href: "/me/bids", key: "myBids" },
  { href: "/trips", key: "myTrips" },
  { href: "/payments", key: "payments" },
  { href: "/me/reports", key: "reports" },
  { href: "/guide-conversion", key: "guideConversion" },
  { href: "/recent", key: "recent" },
] as const;

export default function MyPage() {
  const t = useTranslations("me");
  const c = useTranslations("common");
  const f = useFormat();
  const { me, nickname, isGuide, logout } = useAuth();
  const summary = useAsync(() => userApi.companionSummary(), []);

  if (!me) return <LoadingBlock />;

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("title")} />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={me.profile_image_url} name={nickname} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold">{me.nickname}</p>
              {me.phone_verified ? (
                <Badge tone="teal">{c("verifiedBadge")}</Badge>
              ) : (
                <Badge tone="warn">{c("notVerified")}</Badge>
              )}
              {isGuide && <Badge tone="accent">{t("guideBadge")}</Badge>}
            </div>
            <p className="mt-0.5 text-[13px] text-muted">{me.email}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {me.birth_year || me.gender
                ? f.profileMeta(me.birth_year, me.gender)
                : t("noProfileInfo")}
            </p>
          </div>
          <Link href="/me/edit">
            <Button size="sm" variant="outline">
              {t("editProfile")}
            </Button>
          </Link>
        </div>

        {!me.phone_verified && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-coral-50 px-3.5 py-3">
            <p className="text-[13px] text-ink2">{t("verifyNotice")}</p>
            <Link href="/verify-phone">
              <Button size="sm">{t("verifyCta")}</Button>
            </Link>
          </div>
        )}

        {me.sanction_level !== "NONE" && (
          <div className="mt-4 rounded-[12px] bg-[#fdeaef] px-3.5 py-3">
            <p className="text-[13px] font-semibold text-[#b21232]">
              {t("sanctionTitle", { level: f.sanction(me.sanction_level) })}
            </p>
            <p className="mt-0.5 text-[12px] text-ink2">
              {t("noShowCount", { count: me.no_show_count })}
              {me.restricted_until &&
                ` · ${t("restrictedUntil", { date: f.dateTime(me.restricted_until) })}`}
            </p>
          </div>
        )}
      </Card>

      {/* 동행 이력 요약 */}
      <Card className="mb-5">
        <h2 className="mb-3 text-base font-semibold">{t("companionHistory")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[12px] text-muted">{t("asHost")}</p>
            <p className="mt-0.5 text-xl font-semibold">{me.companion_host_count}</p>
          </div>
          <div>
            <p className="text-[12px] text-muted">{t("asParticipant")}</p>
            <p className="mt-0.5 text-xl font-semibold">{me.companion_join_count}</p>
          </div>
          <div>
            <p className="text-[12px] text-muted">{t("averageRating")}</p>
            <p className="mt-0.5 text-xl font-semibold">
              {summary.data?.averageRating != null
                ? Number(summary.data.averageRating).toFixed(1)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-muted">{t("operationRating")}</p>
            <p className="mt-0.5 text-xl font-semibold">
              {summary.data?.operationAverageRating != null
                ? Number(summary.data.operationAverageRating).toFixed(1)
                : "-"}
            </p>
          </div>
        </div>
        {summary.data && (
          <p className="mt-3 flex items-center gap-2 text-[12px] text-muted">
            {t("basedOnReviews", { count: summary.data.reviewCount })}
            <Rating value={summary.data.averageRating} />
          </p>
        )}
      </Card>

      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="h-full transition-colors hover:border-accent">
              <p className="text-sm font-semibold">{t(`menu.${m.key}.label`)}</p>
              <p className="mt-0.5 text-[12px] text-muted">{t(`menu.${m.key}.desc`)}</p>
            </Card>
          </Link>
        ))}
      </div>

      {!isGuide && (
        <Card className="mb-5">
          <p className="text-sm font-semibold">{t("becomeGuideTitle")}</p>
          <p className="mt-1 text-[13px] text-ink2">{t("becomeGuideBody")}</p>
          <Link href="/guide/register" className="mt-3 inline-block">
            <Button size="sm" variant="outline">
              {t("becomeGuideCta")}
            </Button>
          </Link>
        </Card>
      )}

      <Button variant="ghost" onClick={logout}>
        {c("logout")}
      </Button>
    </div>
  );
}
