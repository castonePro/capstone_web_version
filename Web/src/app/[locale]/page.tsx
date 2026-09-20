"use client";

/** Flutter의 SplashPage 대응 — 토큰 유무로 홈/로그인 분기 */
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Spinner } from "@/components/ui";

export default function RootPage() {
  const router = useRouter();
  const { ready, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!ready) return;
    router.replace(isLoggedIn ? "/home" : "/login");
  }, [ready, isLoggedIn, router]);

  return (
    <div className="ambient-bg flex min-h-dvh flex-col items-center justify-center gap-4">
      <img src="/images/brand/logo.png" alt="Travel Busan" className="h-14 w-14 rounded-[16px] object-cover" />
      <p className="text-sm font-semibold tracking-tight">Travel Busan</p>
      <Spinner size={22} />
    </div>
  );
}
