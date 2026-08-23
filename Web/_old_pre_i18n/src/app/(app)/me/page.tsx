"use client";

/** Flutter features/profile/ui/my_page.dart 대응 */
import Link from "next/link";
import { userApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/hooks/useAsync";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Avatar,
  Badge,
  Button,
  Card,
  LoadingBlock,
  PageHeader,
  Rating,
} from "@/components/ui";
import { SANCTION_LABEL, formatAgeBand, formatDateTime, formatGender } from "@/lib/utils/format";

const MENU = [
  { href: "/companions/my", label: "내 동행", description: "내가 연 방 · 참여한 동행" },
  { href: "/me/bids", label: "내 제안 현황", description: "가이드에게 올린 일정과 지원 가이드" },
  { href: "/trips", label: "내 여행", description: "저장한 일정" },
  { href: "/payments", label: "결제 내역", description: "수수료 · 보증금 · 부스트" },
  { href: "/me/reports", label: "내 신고 내역", description: "접수한 신고와 처리 상태" },
  { href: "/guide-conversion", label: "가이드 전환", description: "예비 가이드 · 정식 전환 신청" },
  { href: "/recent", label: "최근 본", description: "이 브라우저에 저장된 기록" },
];

export default function MyPage() {
  const { me, nickname, isGuide, logout } = useAuth();
  const summary = useAsync(() => userApi.companionSummary(), []);

  if (!me) return <LoadingBlock />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="마이페이지" />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={me.profile_image_url} name={nickname} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold">{me.nickname}</p>
              {me.phone_verified ? (
                <Badge tone="teal">본인 인증</Badge>
              ) : (
                <Badge tone="warn">미인증</Badge>
              )}
              {isGuide && <Badge tone="accent">가이드</Badge>}
            </div>
            <p className="mt-0.5 text-[13px] text-muted">{me.email}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {[formatAgeBand(me.birth_year), formatGender(me.gender)].filter(Boolean).join(" · ") ||
                "생년·성별 미등록"}
            </p>
          </div>
          <Link href="/me/edit">
            <Button size="sm" variant="outline">
              프로필 수정
            </Button>
          </Link>
        </div>

        {!me.phone_verified && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-coral-50 px-3.5 py-3">
            <p className="text-[13px] text-ink2">
              본인 인증을 마쳐야 동행 방 개설·참여 신청을 할 수 있습니다.
            </p>
            <Link href="/verify-phone">
              <Button size="sm">인증하기</Button>
            </Link>
          </div>
        )}

        {me.sanction_level !== "NONE" && (
          <div className="mt-4 rounded-[12px] bg-[#fdeaef] px-3.5 py-3">
            <p className="text-[13px] font-semibold text-[#b21232]">
              제재 상태 · {SANCTION_LABEL[me.sanction_level]}
            </p>
            <p className="mt-0.5 text-[12px] text-ink2">
              노쇼 {me.no_show_count}회
              {me.restricted_until && ` · ${formatDateTime(me.restricted_until)}까지 이용 제한`}
            </p>
          </div>
        )}
      </Card>

      {/* 동행 이력 요약 */}
      <Card className="mb-5">
        <h2 className="mb-3 text-base font-semibold">동행 이력</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[12px] text-muted">방장</p>
            <p className="mt-0.5 text-xl font-semibold">{me.companion_host_count}회</p>
          </div>
          <div>
            <p className="text-[12px] text-muted">참여</p>
            <p className="mt-0.5 text-xl font-semibold">{me.companion_join_count}회</p>
          </div>
          <div>
            <p className="text-[12px] text-muted">평균 평점</p>
            <p className="mt-0.5 text-xl font-semibold">
              {summary.data?.averageRating != null
                ? Number(summary.data.averageRating).toFixed(1)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-muted">운영 평가</p>
            <p className="mt-0.5 text-xl font-semibold">
              {summary.data?.operationAverageRating != null
                ? Number(summary.data.operationAverageRating).toFixed(1)
                : "-"}
            </p>
          </div>
        </div>
        {summary.data && (
          <p className="mt-3 text-[12px] text-muted">
            공개된 리뷰 {summary.data.reviewCount}건 기준 ·{" "}
            <Rating value={summary.data.averageRating} />
          </p>
        )}
      </Card>

      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="h-full transition-colors hover:border-accent">
              <p className="text-sm font-semibold">{m.label}</p>
              <p className="mt-0.5 text-[12px] text-muted">{m.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      {!isGuide && (
        <Card className="mb-5">
          <p className="text-sm font-semibold">가이드로 활동하고 싶으신가요?</p>
          <p className="mt-1 text-[13px] text-ink2">
            프로필을 등록하면 상품을 만들고 사용자 요청에 입찰할 수 있습니다.
          </p>
          <Link href="/guide/register" className="mt-3 inline-block">
            <Button size="sm" variant="outline">
              가이드 등록하기
            </Button>
          </Link>
        </Card>
      )}

      <Button variant="ghost" onClick={logout}>
        로그아웃
      </Button>
    </div>
  );
}
