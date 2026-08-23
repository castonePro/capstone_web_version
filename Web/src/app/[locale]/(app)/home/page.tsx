"use client";

/** Flutter features/main/home_screen.dart 대응 — 퀵메뉴 + 인기 장소 + 카테고리 추천 */
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PLACE_CATEGORIES, companionApi, placeApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFormat } from "@/lib/i18n/useFormat";
import { Badge, Button, Card, Chip, EmptyState, SectionTitle, Spinner } from "@/components/ui";
import { CompanionCard, PlaceCard } from "@/components/cards";
import {
  IconCompass,
  IconMapPin,
  IconSparkle,
  IconUsers,
  IconLuggage,
} from "@/components/layout/icons";

const QUICK_MENU = [
  { href: "/ai", key: "aiPlanner", icon: IconSparkle },
  { href: "/companions", key: "companions", icon: IconUsers },
  { href: "/guides", key: "guides", icon: IconCompass },
  { href: "/places", key: "places", icon: IconMapPin },
  { href: "/trips", key: "trips", icon: IconLuggage },
] as const;

export default function HomePage() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const cat = useTranslations("placeCategories");
  const f = useFormat();
  const locale = useLocale();
  const { nickname, me, isGuideMode } = useAuth();
  const [category, setCategory] = useState<string>(PLACE_CATEGORIES[0]);

  const popular = useAsync(() => placeApi.popular(locale), [locale]);
  const recommend = useAsync(() => placeApi.recommend(category, locale), [category, locale]);
  const companions = useAsync(() => companionApi.explore(), []);
  const trips = useAsync(() => plannerApi.list(), []);

  const upcoming = (trips.data ?? [])
    .filter((tr) => !tr.startDate || new Date(tr.startDate).getTime() >= Date.now() - 86400000)
    .slice(0, 2);

  return (
    <div className="space-y-10">
      {/* ─── 인사 + 인증 배너 ─── */}
      <section>
        <p className="text-sm text-muted">{isGuideMode ? nav("guideMode") : t("greetingSub")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("greeting", { name: nickname ?? t("traveler") })}
        </h1>

        {me && !me.phone_verified && (
          <Card className="mt-4 border-coral-200 bg-coral-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{t("verifyTitle")}</p>
                <p className="mt-0.5 text-[13px] text-ink2">{t("verifyBody")}</p>
              </div>
              <Link href="/verify-phone">
                <Button size="sm">{t("verifyCta")}</Button>
              </Link>
            </div>
          </Card>
        )}

        {me && me.sanction_level !== "NONE" && (
          <Card className="mt-3 border-[#f3c9d3] bg-[#fdeaef]">
            <p className="text-sm font-semibold text-[#b21232]">
              {t("sanctionTitle", { level: f.sanction(me.sanction_level) })}
            </p>
            <p className="mt-0.5 text-[13px] text-ink2">
              {t("sanctionBody", { count: me.no_show_count })}
            </p>
          </Card>
        )}
      </section>

      {/* ─── 퀵메뉴 ─── */}
      <section>
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {QUICK_MENU.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-[12px] border border-line bg-card px-2 py-4 transition-colors hover:border-accent"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-sand text-ink">
                <Icon width={20} height={20} />
              </span>
              <span className="text-center text-[11px] leading-tight font-medium text-ink2 sm:text-[13px]">
                {nav(key)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 다가오는 내 여행 ─── */}
      {upcoming.length > 0 && (
        <section>
          <SectionTitle
            action={
              <Link href="/trips" className="text-[13px] font-semibold text-accent-text hover:underline">
                {t("viewAll")}
              </Link>
            }
          >
            {t("upcomingTrips")}
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((tr) => (
              <Link
                key={tr.itineraryId}
                href={`/trips/${tr.itineraryId}`}
                className="rounded-[12px] border border-line bg-card p-4 transition-colors hover:border-accent"
              >
                <p className="truncate text-[15px] font-semibold">{tr.title}</p>
                <p className="mt-1 text-[13px] text-muted">{f.period(tr.startDate, tr.endDate)}</p>
                <Badge tone="neutral" className="mt-3">
                  {t("courseCount", { count: tr.details.length })}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── 인기 여행지 ─── */}
      <section>
        <SectionTitle
          action={
            <Link href="/places" className="text-[13px] font-semibold text-accent-text hover:underline">
              {t("more")}
            </Link>
          }
        >
          {t("popularPlaces")}
        </SectionTitle>
        {popular.loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : popular.data && popular.data.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {popular.data.map((p) => (
              <PlaceCard key={p.placeId} place={p} />
            ))}
          </div>
        ) : (
          <EmptyState title={t("noPopular")} />
        )}
      </section>

      {/* ─── 카테고리별 추천 ─── */}
      <section>
        <SectionTitle>{t("byCategory")}</SectionTitle>
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {PLACE_CATEGORIES.map((c) => (
            <Chip key={c} active={c === category} onClick={() => setCategory(c)}>
              {cat(c)}
            </Chip>
          ))}
        </div>
        {recommend.loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : recommend.data && recommend.data.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {recommend.data.map((p) => (
              <PlaceCard key={p.placeId} place={p} />
            ))}
          </div>
        ) : (
          <EmptyState title={t("noPlacesInCategory")} />
        )}
      </section>

      {/* ─── 모집중인 동행 ─── */}
      <section>
        <SectionTitle
          action={
            <Link
              href="/companions"
              className="text-[13px] font-semibold text-accent-text hover:underline"
            >
              {t("viewAll")}
            </Link>
          }
        >
          {t("recruitingCompanions")}
        </SectionTitle>
        {companions.loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : companions.data && companions.data.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {companions.data.slice(0, 4).map((c) => (
              <CompanionCard key={c.companionId} companion={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("noCompanions")}
            description={t("noCompanionsBody")}
            action={
              <Link href="/companions/new">
                <Button size="sm">{t("createCompanion")}</Button>
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
