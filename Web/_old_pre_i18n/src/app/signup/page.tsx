"use client";

/** Flutter features/auth/signup_page.dart 대응 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button, Field, Input } from "@/components/ui";
import { errorMessage } from "@/lib/utils/format";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 다릅니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상으로 설정해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const message = await signup(email.trim(), password, nickname.trim());
      setDone(message || "회원가입이 완료되었습니다.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ambient-bg flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/login" className="mb-8 inline-flex items-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-accent text-lg font-bold text-white">
            B
          </span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">회원가입</h1>
        <p className="mt-1.5 text-sm text-muted">이메일로 시작하세요</p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <Field label="이메일" required>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="닉네임" required hint="동행·채팅에서 다른 사람에게 보이는 이름입니다.">
            <Input
              required
              maxLength={100}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="부산러버"
            />
          </Field>
          <Field label="비밀번호" required hint="8자 이상">
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="비밀번호 확인" required>
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </Field>

          {error && (
            <p className="rounded-[12px] bg-[#fdeaef] px-3.5 py-2.5 text-[13px] text-[#b21232]">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded-[12px] bg-[#e7f6ec] px-3.5 py-2.5 text-[13px] text-[#136c33]">
              {done} 로그인 화면으로 이동합니다…
            </p>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full">
            가입하기
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-semibold text-accent-text hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
