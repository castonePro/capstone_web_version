"use client";

/** Flutter features/main/home_screen.dart 대응 — 퀵메뉴 + 인기 장소 + 카테고리 추천 */
import Link from "next/link";
import { useState } from "react";
import { PLACE_CATEGORIES, companionApi, placeApi, plannerApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Badge, Button, Card, Chip, EmptyState, SectionTitle, Spinner } from "@/components/ui";
import { CompanionCard, PlaceCard } from "@/components/cards";
import { formatPeriod } from "@/lib/utils/format";
import {
  IconCompass,
  IconMapPin,
  IconSparkle,
  IconUsers,
  IconLuggage,
} from "@/components/layout/icons";

const QUICK_MENU = [
  { href: "/ai", label: "AI 플래너", icon: IconSparkle },
  { href: "/companions", label: "동행 찾기", icon: IconUsers },
  { href: "/guides", label: "가이드", icon: IconCompass },
  { href: "/places", label: "여행지", icon: IconMapPin },
  { href: "/trips", label: "내 여행", icon: IconLuggage },
];

export default function HomePage() {
  const { nickname, me, isGuideMode } = useAuth();
  const [category, setCategory] = useState<string>(PLACE_CATEGORIES[0]);

  const popular = useAsync(() => placeApi.popular(), []);
  const recommend = useAsync(() => placeApi.recommend(category), [category]);
  const companions = useAsync(() => companionApi.explore(), []);
  const trips = useAsync(() => plannerApi.list(), []);

  const upcoming = (trips.data ?? [])
    .filter((t) => !t.startDate || new Date(t.startDate).getTime() >= Date.now() - 86400000)
    .slice(0, 2);

  return (
    <div className="space-y-10">
      {/* ─── 인사 + 인증 배너 ─── */}
      <section>
        <p className="text-sm text-muted">
          {isGuideMode ? "가이드 모드" : "오늘도 좋은 여행 되세요"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {nickname ?? "여행자"}님, 부산 어디로 가볼까요?
        </h1>

        {me && !me.phone_verified && (
          <Card className="mt-4 border-coral-200 bg-coral-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">본인 인증이 필요합니다</p>
                <p className="mt-0.5 text-[13px] text-ink2">
                  동행 방 개설과 참여 신청은 본인 인증을 마쳐야 이용할 수 있습니다.
                </p>
              </div>
              <Link href="/verify-phone">
                <Button size="sm">인증하기</Button>
              </Link>
            </div>
          </Card>
        )}

        {me && me.sanction_level !== "NONE" && (
          <Card className="mt-3 border-[#f3c9d3] bg-[#fdeaef]">
            <p className="text-sm font-semibold text-[#b21232]">
              현재 계정에 제재가 적용되어 있습니다 ({me.sanction_level})
            </p>
            <p className="mt-0.5 text-[13px] text-ink2">
              노쇼 {me.no_show_count}회 기록. 자세한 내용은 마이페이지에서 확인하세요.
            </p>
          </Card>
        )}
      </section>

      {/* ─── 퀵메뉴 ─── */}
      <section>
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {QUICK_MENU.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-[12px] border border-line bg-card px-2 py-4 transition-colors hover:border-accent"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-sand text-ink">
                <Icon width={20} height={20} />
              </span>
              <span className="text-center text-[11px] font-medium text-ink2 sm:text-[13px]">
                {label}
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
                전체 보기
              </Link>
            }
          >
            다가오는 내 여행
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((t) => (
              <Link
                key={t.itineraryId}
                href={`/trips/${t.itineraryId}`}
                className="rounded-[12px] border border-line bg-card p-4 transition-colors hover:border-accent"
              >
                <p className="truncate text-[15px] font-semibold">{t.title}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {formatPeriod(t.startDate, t.endDate)}
                </p>
                <Badge tone="neutral" className="mt-3">
                  {t.details.length}개 코스
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
              더 보기
            </Link>
          }
        >
          인기 여행지
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
          <EmptyState title="아직 인기 장소 데이터가 없습니다" />
        )}
      </section>

      {/* ─── 카테고리별 추천 ─── */}
      <section>
        <SectionTitle>카테고리별 추천</SectionTitle>
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {PLACE_CATEGORIES.map((c) => (
            <Chip key={c} active={c === category} onClick={() => setCategory(c)}>
              {c}
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
          <EmptyState title="이 카테고리에는 아직 장소가 없습니다" />
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
              전체 보기
            </Link>
          }
        >
          모집중인 동행
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
            title="모집중인 동행이 없습니다"
            description="내 일정으로 동행을 직접 모집해 보세요."
            action={
              <Link href="/companions/new">
                <Button size="sm">동행 모집하기</Button>
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
