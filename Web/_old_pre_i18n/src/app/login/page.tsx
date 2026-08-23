"use client";

/** Flutter features/auth/login_page.dart 대응 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button, Field, Input } from "@/components/ui";
import { errorMessage } from "@/lib/utils/format";

export default function LoginPage() {
  const router = useRouter();
  const { login, ready, isLoggedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && isLoggedIn) router.replace("/home");
  }, [ready, isLoggedIn, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/home");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ambient-bg grid min-h-dvh lg:grid-cols-2">
      {/* 데스크톱 좌측 소개 패널 — 모바일에서는 숨긴다 */}
      <section className="hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-accent font-bold text-white">
            B
          </span>
          <span className="text-base font-semibold tracking-tight">Travel Busan</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight">
            부산 여행,
            <br />
            혼자여도 함께여도.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink2">
            AI가 동선까지 계산해 코스를 짜고, 같은 일정으로 떠날 동행을 찾고, 검증된 로컬 가이드와
            연결됩니다.
          </p>
          <ul className="mt-8 space-y-3 text-[13px] text-ink2">
            <li className="flex gap-2">
              <span className="text-accent">•</span> RAG 기반 AI 여행 플래너
            </li>
            <li className="flex gap-2">
              <span className="text-accent">•</span> 본인 인증 기반 동행 매칭
            </li>
            <li className="flex gap-2">
              <span className="text-accent">•</span> 가이드 상품·역제안 입찰
            </li>
          </ul>
        </div>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Travel Busan</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-accent text-lg font-bold text-white">
              B
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">로그인</h2>
          <p className="mt-1.5 text-sm text-muted">계정으로 계속하기</p>

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
            <Field label="비밀번호" required>
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p className="rounded-[12px] bg-[#fdeaef] px-3.5 py-2.5 text-[13px] text-[#b21232]">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              로그인
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            아직 계정이 없나요?{" "}
            <Link href="/signup" className="font-semibold text-accent-text hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
