"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar, Badge, Card, Tag, cx, type BadgeTone } from "@/components/ui";
import { useFormat } from "@/lib/i18n/useFormat";
import type {
  Companion,
  CompanionStatus,
  GuideProduct,
  Itinerary,
  TravelPlace,
} from "@/lib/api/types";

const STATUS_TONE: Record<CompanionStatus, BadgeTone> = {
  RECRUITING: "accent",
  UNDER_MINIMUM: "warn",
  CONFIRMED: "teal",
  IN_PROGRESS: "teal",
  COMPLETED: "success",
  CANCELED: "neutral",
};

export function CompanionStatusBadge({ status }: { status: CompanionStatus }) {
  const f = useFormat();
  return <Badge tone={STATUS_TONE[status]}>{f.companionStatus(status)}</Badge>;
}

/* ────────────────────────── 여행지 카드 ────────────────────────── */

export function PlaceCard({ place }: { place: TravelPlace }) {
  const tPlace = useTranslations("places");
  return (
    <Link
      href={`/places/${place.placeId}`}
      className="group block overflow-hidden rounded-[12px] border border-line bg-card transition-colors hover:border-accent"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-sand">
        {place.firstImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.firstImage}
            alt={place.title ?? ""}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted">{tPlace("noImage")}</div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-ink">{place.title ?? tPlace("noName")}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted">{place.addr1 ?? tPlace("noAddress")}</p>
        {place.cat2 && <Tag className="mt-2">{place.cat2}</Tag>}
      </div>
    </Link>
  );
}

/* ────────────────────────── 동행 카드 ────────────────────────── */

export function CompanionCard({ companion: c }: { companion: Companion }) {
  const tComp = useTranslations("companions");
  const cm = useTranslations("common");
  const f = useFormat();
  const full = c.approvedCount >= c.maxParticipants;
  return (
    <Link
      href={`/companions/${c.companionId}`}
      className={cx(
        "block rounded-[12px] border bg-card p-4 transition-colors hover:border-accent",
        c.boosted ? "border-coral-300" : "border-line",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <CompanionStatusBadge status={c.status} />
            {c.boosted && <Badge tone="accent">{tComp("boosted")}</Badge>}
            {c.hostPhoneVerified && <Badge tone="teal">{cm("verifiedBadge")}</Badge>}
          </div>
          <h3 className="mt-2 truncate text-[15px] font-semibold text-ink">{c.title}</h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {c.region ?? cm("busan")} · {c.itineraryTitle}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[13px] font-semibold text-ink">
            {tComp("participantsOf", { current: c.approvedCount, max: c.maxParticipants })}
          </p>
          <p className="text-[11px] text-muted">{tComp("minParticipants", { count: c.minParticipants })}</p>
        </div>
      </div>

      <p className="mt-3 text-[13px] text-ink2">{f.period(c.startDate, c.endDate)}</p>

      {c.preferenceTags && c.preferenceTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.preferenceTags.slice(0, 5).map((tag) => (
            <Tag key={tag}>#{tag}</Tag>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar src={c.hostProfileImageUrl} name={c.hostNickname} size={28} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{c.hostNickname}</p>
            <p className="truncate text-[11px] text-muted">
              {f.profileMeta(c.hostBirthYear, c.hostGender)}
            </p>
          </div>
        </div>
        {full && <Badge tone="neutral">{tComp("full")}</Badge>}
      </div>
    </Link>
  );
}

/* ────────────────────────── 가이드 상품 카드 ────────────────────────── */

export function GuideProductCard({
  product: p,
  href,
  footer,
}: {
  product: GuideProduct;
  href?: string;
  footer?: React.ReactNode;
}) {
  const tGuide = useTranslations("guides");
  const f = useFormat();

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={p.isPublished ? "success" : "neutral"}>
              {p.isPublished ? tGuide("published") : tGuide("unpublished")}
            </Badge>
            {p.hasCar && <Badge tone="teal">{tGuide("hasCar")}</Badge>}
          </div>
          <h3 className="mt-2 truncate text-[15px] font-semibold text-ink">{p.title}</h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {tGuide("byGuide", { region: p.region, name: p.guideName })}
          </p>
        </div>
        <p className="shrink-0 text-right text-[15px] font-semibold text-ink">
          {f.price(p.pricePerPerson)}
          <span className="block text-[11px] font-normal text-muted">{tGuide("perPerson")}</span>
        </p>
      </div>

      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink2">{p.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag>{f.minutes(p.durationMinutes)}</Tag>
        <Tag>{tGuide("maxCapacity", { count: p.maxCapacity })}</Tag>
        {p.availableLanguages?.slice(0, 3).map((l) => <Tag key={l}>{l}</Tag>)}
      </div>

      {footer && <div className="mt-4 border-t border-line pt-3">{footer}</div>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[12px] border border-line bg-card p-4 transition-colors hover:border-accent"
      >
        {body}
      </Link>
    );
  }
  return <Card>{body}</Card>;
}

/* ────────────────────────── 일정 카드 ────────────────────────── */

export function ItineraryCard({
  itinerary: it,
  action,
}: {
  itinerary: Itinerary;
  action?: React.ReactNode;
}) {
  const tTrip = useTranslations("trips");
  const cm = useTranslations("common");
  const f = useFormat();
  const days = new Set(it.details.map((d) => d.dayNumber)).size;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">{it.title}</h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {it.region ?? cm("busanCity")} · {f.period(it.startDate, it.endDate)}
          </p>
        </div>
        <Badge tone="neutral">
          {tTrip("daysAndSpots", { days: days || 1, spots: it.details.length })}
        </Badge>
      </div>

      {it.details.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
          {it.details
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .slice(0, 6)
            .map((d) => (
              <Tag key={d.detailId} className="whitespace-nowrap">
                {d.placeName}
              </Tag>
            ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Link
          href={`/trips/${it.itineraryId}`}
          className="text-[13px] font-semibold text-accent-text hover:underline"
        >
          {tTrip("viewDetail")}
        </Link>
        <span className="grow" />
        {action}
      </div>
    </Card>
  );
}
