"use client";

/**
 * 반응형 앱 셸.
 *  - lg 이상: 좌측 고정 사이드바 + 넓은 콘텐츠 영역(최대 1120px)
 *  - lg 미만: 상단바 + 앱과 동일한 하단 탭바(5개)
 * Flutter main_page.dart의 IndexedStack + BottomNavigationBar를 대체한다.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { notificationApi } from "@/lib/api/endpoints";
import { cx, Spinner } from "@/components/ui";
import {
  GUIDE_NAV,
  GUIDE_NAV_SECONDARY,
  USER_NAV,
  USER_NAV_SECONDARY,
  type NavItem,
} from "./nav-config";
import { IconBell, IconLogout } from "./icons";
import { LocaleSwitcher } from "./LocaleSwitcher";

function isActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations("nav");
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cx(
        "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-ink text-white" : "text-ink2 hover:bg-sand",
      )}
    >
      <Icon width={20} height={20} />
      {t(item.labelKey)}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const c = useTranslations("common");
  const { ready, isLoggedIn, isGuide, isGuideMode, setGuideMode, nickname, me, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  // 로그인 안 된 상태면 로그인 화면으로 (앱의 SplashPage 분기와 동일)
  useEffect(() => {
    if (ready && !isLoggedIn) router.replace("/login");
  }, [ready, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    const load = () =>
      notificationApi
        .unreadCount()
        .then((n) => alive && setUnread(Number(n) || 0))
        .catch(() => undefined);
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isLoggedIn, pathname]);

  if (!ready || !isLoggedIn) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  const primary = isGuideMode ? GUIDE_NAV : USER_NAV;
  const secondary = isGuideMode ? GUIDE_NAV_SECONDARY : USER_NAV_SECONDARY;
  const tabs = primary.filter((i) => i.primary);

  return (
    <div className="ambient-bg min-h-dvh">
      {/* ─── 데스크톱 사이드바 ─── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-line bg-white/80 px-4 py-5 backdrop-blur lg:flex">
        <Link href="/home" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-sm font-bold text-white">
            B
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Travel Busan</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {primary.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="my-4 h-px bg-line" />

        <nav className="flex flex-col gap-1">
          {secondary.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-4">
          <LocaleSwitcher />

          {isGuide && (
            <button
              type="button"
              onClick={() => setGuideMode(!isGuideMode)}
              className="flex w-full items-center justify-between rounded-[12px] border border-line px-3 py-2.5 text-[13px] font-medium text-ink2 hover:border-accent"
            >
              {isGuideMode ? t("guideMode") : t("userMode")}
              <span
                className={cx(
                  "relative h-5 w-9 rounded-full transition-colors",
                  isGuideMode ? "bg-accent" : "bg-line",
                )}
              >
                <span
                  className={cx(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                    isGuideMode ? "left-[18px]" : "left-0.5",
                  )}
                />
              </span>
            </button>
          )}

          <div className="flex items-center justify-between gap-2 rounded-[12px] bg-sand px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{nickname ?? c("user")}</p>
              <p className="truncate text-[11px] text-muted">
                {me?.phone_verified ? c("verified") : c("notVerified")}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label={c("logout")}
              className="rounded-md p-1.5 text-ink2 hover:bg-white"
            >
              <IconLogout width={18} height={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── 모바일 상단바 ─── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-white/85 px-4 backdrop-blur lg:hidden">
        <Link href="/home" className="flex shrink-0 items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-accent text-xs font-bold text-white">
            B
          </span>
          <span className="text-sm font-semibold">Travel Busan</span>
        </Link>
        <div className="flex items-center gap-1">
          <LocaleSwitcher compact />
          {isGuide && (
            <button
              type="button"
              onClick={() => setGuideMode(!isGuideMode)}
              className="shrink-0 rounded-full bg-sand px-2.5 py-1.5 text-[11px] font-semibold text-ink2"
            >
              {isGuideMode ? t("guideShort") : t("userShort")}
            </button>
          )}
          <Link
            href="/notifications"
            aria-label={t("notifications")}
            className="relative rounded-md p-2 text-ink2 hover:bg-sand"
          >
            <IconBell width={20} height={20} />
            {unread > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ─── 콘텐츠 ─── */}
      <div className="lg:pl-64">
        {/* 데스크톱 전용 우상단 알림 */}
        <div className="hidden justify-end px-8 pt-5 lg:flex">
          <Link
            href="/notifications"
            className="relative inline-flex items-center gap-2 rounded-[12px] border border-line bg-white px-3 py-2 text-[13px] font-medium text-ink2 hover:border-accent"
          >
            <IconBell width={18} height={18} />
            {t("notifications")}
            {unread > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>

        <main className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-4">
          {children}
        </main>
      </div>

      {/* ─── 모바일 하단 탭바 (앱의 커스텀 BottomNav 대응) ─── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 lg:hidden">
        <div className="flex h-[60px] items-stretch rounded-[12px] bg-nav-bg shadow-lg backdrop-blur">
          {tabs.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-1"
                style={{ color: active ? "#fff" : "rgba(255,255,255,0.45)" }}
              >
                <Icon width={22} height={22} />
                <span className="px-0.5 text-center text-[10px] leading-tight font-medium">
                  {t(item.labelKey)}
                </span>
                <span
                  className={cx(
                    "h-[3px] rounded-full bg-accent transition-all",
                    active ? "w-4" : "w-0",
                  )}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
