"use client";

/** Flutter features/auth/signup_page.dart 대응 */
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button, Field, Input } from "@/components/ui";
import { useFormat } from "@/lib/i18n/useFormat";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

export default function SignupPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const f = useFormat();
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
      setError(t("passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      const message = await signup(email.trim(), password, nickname.trim());
      setDone(message || t("signupDone"));
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(f.apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ambient-bg flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/login" className="inline-flex items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-accent text-lg font-bold text-white">
              B
            </span>
          </Link>
          <LocaleSwitcher compact />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("signupTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted">{t("signupSubtitle")}</p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <Field label={t("email")} required>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label={t("nickname")} required hint={t("nicknameHint")}>
            <Input
              required
              maxLength={100}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t("nicknamePlaceholder")}
            />
          </Field>
          <Field label={t("password")} required hint={t("passwordHint")}>
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label={t("passwordConfirm")} required>
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
              {done} {t("redirectingToLogin")}
            </p>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full">
            {t("signupSubmit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-accent-text hover:underline">
            {t("loginTitle")}
          </Link>
        </p>
      </div>
    </div>
  );
}
