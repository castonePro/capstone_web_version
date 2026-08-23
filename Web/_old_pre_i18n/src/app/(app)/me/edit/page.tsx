"use client";

/**
 * Flutter features/profile/ui/profile_edit_page.dart 대응.
 * 백엔드에 프로필 수정 API(PUT /users/me)가 아직 없어, 현재는 조회 전용 화면이다.
 * 앱에서도 동일하게 서버 반영이 되지 않는 상태 — API가 생기면 이 화면만 연결하면 된다.
 */
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Badge, Button, Card, Field, Input, LoadingBlock, PageHeader } from "@/components/ui";
import { formatAgeBand, formatGender } from "@/lib/utils/format";
import { IconBack } from "@/components/layout/icons";

export default function ProfileEditPage() {
  const { me } = useAuth();
  if (!me) return <LoadingBlock />;

  return (
    <div className="max-w-xl">
      <Link
        href="/me"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink2 hover:text-accent-text"
      >
        <IconBack width={18} height={18} />
        마이페이지
      </Link>

      <PageHeader title="프로필" description="현재 계정에 등록된 정보입니다." />

      <Card className="space-y-4">
        <Field label="닉네임">
          <Input value={me.nickname} readOnly disabled />
        </Field>
        <Field label="이메일">
          <Input value={me.email} readOnly disabled />
        </Field>
        <Field label="나이대 · 성별" hint="본인 인증 시 입력한 정보입니다.">
          <Input
            value={
              [formatAgeBand(me.birth_year), formatGender(me.gender)].filter(Boolean).join(" · ") ||
              "미등록"
            }
            readOnly
            disabled
          />
        </Field>

        <div className="flex items-center justify-between rounded-[12px] bg-sand px-3.5 py-3">
          <span className="text-[13px] font-medium text-ink2">본인 인증</span>
          {me.phone_verified ? (
            <Badge tone="teal">인증 완료</Badge>
          ) : (
            <Link href="/verify-phone">
              <Button size="sm">인증하기</Button>
            </Link>
          )}
        </div>

        <p className="rounded-[12px] bg-coral-50 px-3.5 py-3 text-[12px] leading-relaxed text-ink2">
          닉네임·프로필 사진 변경 API가 백엔드에 아직 없어 이 화면에서는 수정할 수 없습니다.
          <br />
          <code className="text-[11px]">PUT /api/v1/users/me</code>가 추가되면 이 폼만 연결하면
          됩니다.
        </p>
      </Card>
    </div>
  );
}
