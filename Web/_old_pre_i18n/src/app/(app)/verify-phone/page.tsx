"use client";

/**
 * Flutter features/verification/ui/phone_verification_page.dart 대응.
 * 번호 입력 → 인증번호 발송 → 인증번호·생년·성별 입력 → 완료.
 * 백엔드가 MockPhoneVerificationProvider라 devCode를 응답에 실어 준다.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { verificationApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";
import { errorMessage } from "@/lib/utils/format";

const GENDERS = [
  { value: "MALE", label: "남성" },
  { value: "FEMALE", label: "여성" },
  { value: "OTHER", label: "기타" },
];

export default function VerifyPhonePage() {
  const router = useRouter();
  const { me, fetchMe } = useAuth();

  // 백엔드 UserDto.MeResponse에는 전화번호가 없다(비공개). 항상 새로 입력받는다.
  const [phoneNumber, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [birthYear, setBirthYear] = useState<string>(String(me?.birth_year ?? ""));
  const [gender, setGender] = useState<string>(me?.gender ?? "MALE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await verificationApi.sendCode(phoneNumber.trim());
      setVerificationId(res.verificationId);
      setDevCode(res.devCode);
      if (res.devCode) setCode(res.devCode);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!verificationId) return;
    setLoading(true);
    setError(null);
    try {
      await verificationApi.confirmCode({
        verificationId,
        code: code.trim(),
        phoneNumber: phoneNumber.trim(),
        birthYear: Number(birthYear),
        gender,
      });
      await fetchMe();
      router.replace("/me");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (me?.phone_verified) {
    return (
      <div className="max-w-xl">
        <PageHeader title="본인 인증" />
        <Card className="border-[#bfe6cd] bg-[#e7f6ec]">
          <p className="text-sm font-semibold text-[#136c33]">본인 인증이 완료되었습니다</p>
          <p className="mt-1 text-[13px] text-ink2">
            이제 동행 방을 열고 참여 신청을 할 수 있습니다.
          </p>
          <Button size="sm" className="mt-3" onClick={() => router.push("/companions")}>
            동행 찾아보기
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="본인 인증"
        description="동행 방 개설과 참여 신청은 본인 인증을 마친 사용자만 가능합니다."
      />

      <Card className="space-y-5">
        <Field label="휴대폰 번호" required>
          <div className="flex gap-2">
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              disabled={!!verificationId}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              loading={loading && !verificationId}
              disabled={!phoneNumber.trim() || !!verificationId}
              onClick={() => void sendCode()}
            >
              인증번호 발송
            </Button>
          </div>
        </Field>

        {verificationId && (
          <>
            {devCode && (
              <div className="rounded-[12px] bg-sand px-3.5 py-3 text-[13px] text-ink2">
                <Badge tone="warn">개발용</Badge>{" "}
                <span className="ml-1">
                  Mock 인증 공급자라 실제 SMS가 가지 않습니다. 인증번호는{" "}
                  <strong className="font-semibold">{devCode}</strong> 입니다.
                </span>
              </div>
            )}

            <Field label="인증번호" required>
              <Input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6자리"
              />
            </Field>

            <Field label="출생연도" required hint="정확한 나이는 공개되지 않고 나이대만 표시됩니다.">
              <Input
                type="number"
                min={1930}
                max={new Date().getFullYear()}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="1998"
              />
            </Field>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink2">
                성별 <span className="text-accent">*</span>
              </p>
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <Chip key={g.value} active={gender === g.value} onClick={() => setGender(g.value)}>
                    {g.label}
                  </Chip>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              loading={loading}
              disabled={!code.trim() || !birthYear}
              onClick={() => void confirm()}
            >
              인증 완료
            </Button>
          </>
        )}

        {error && (
          <p className="rounded-[12px] bg-[#fdeaef] px-3.5 py-2.5 text-[13px] text-[#b21232]">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
