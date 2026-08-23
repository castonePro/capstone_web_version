"use client";

/**
 * 언어 전환. 현재 경로를 유지한 채 언어 prefix만 바꾼다.
 * (/en/companions/abc → /ja/companions/abc)
 */
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { cx, Spinner } from "@/components/ui";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function change(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    startTransition(() => {
      // pathname은 이미 언어 prefix가 제거된 값이라 그대로 넘기면 된다.
      // 동적 세그먼트([id] 등)는 params로 채워 준다.
      router.replace(
        // @ts-expect-error — 동적 라우트의 params 타입은 런타임에만 알 수 있다
        { pathname, params },
        { locale: next },
      );
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={localeNames[locale]}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-[12px] border border-line bg-white font-medium text-ink2 transition-colors hover:border-accent",
          compact ? "px-2.5 py-1.5 text-[12px]" : "w-full justify-between px-3 py-2.5 text-[13px]",
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <GlobeIcon />
          {compact ? locale.toUpperCase() : localeNames[locale]}
        </span>
        {pending ? <Spinner size={12} /> : <span className="text-muted">▾</span>}
      </button>

      {open && (
        <>
          {/* 바깥 클릭으로 닫기 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            className={cx(
              "absolute z-50 mt-1 min-w-44 overflow-hidden rounded-[12px] border border-line bg-white py-1 shadow-lg",
              compact ? "right-0" : "left-0 bottom-full mb-1",
            )}
          >
            {locales.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l === locale}
                  onClick={() => change(l)}
                  lang={l}
                  className={cx(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors",
                    l === locale
                      ? "bg-sand font-semibold text-ink"
                      : "text-ink2 hover:bg-sand",
                  )}
                >
                  {localeNames[l]}
                  {l === locale && <span className="text-accent">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </svg>
  );
}
