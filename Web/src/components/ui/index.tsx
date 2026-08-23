"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/i18n/useFormat";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ────────────────────────── Button ────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-press disabled:bg-coral-200",
  secondary: "bg-sand text-ink hover:bg-coral-100",
  ghost: "bg-transparent text-ink2 hover:bg-sand",
  outline:
    "bg-transparent text-ink border border-line hover:border-accent hover:text-accent-text",
  danger: "bg-[#d4183d] text-white hover:bg-[#b21232]",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-60",
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      )}
    >
      {loading && <Spinner size={16} className="border-current" />}
      {children}
    </button>
  );
}

/* ────────────────────────── Card ────────────────────────── */

export function Card({
  className,
  children,
  as: As = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "article" | "section" | "li";
}) {
  return (
    <As
      className={cx(
        "rounded-[12px] border border-line bg-card p-4",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

/* ────────────────────────── Form ────────────────────────── */

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-ink2">
        {label}
        {required && <span className="text-accent">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-[12px] border border-line bg-white px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-muted outline-none transition-colors " +
  "focus:border-accent disabled:bg-sand disabled:text-muted";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(inputBase, className)} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(inputBase, "min-h-24 resize-y", className)} />;
}

export function Select({
  className,
  children,
  ...rest
}: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...rest} className={cx(inputBase, "appearance-none", className)}>
      {children}
    </select>
  );
}

/* ────────────────────────── Chip / Badge ────────────────────────── */

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cx(
        "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-ink text-white"
          : "bg-sand text-ink2 hover:bg-coral-100",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md bg-sand px-2 py-0.5 text-[11px] font-medium text-ink2",
        className,
      )}
    >
      {children}
    </span>
  );
}

const BADGE_TONE = {
  neutral: "bg-sand text-ink2",
  accent: "bg-coral-100 text-coral-700",
  teal: "bg-teal-50 text-teal-700",
  success: "bg-[#e7f6ec] text-[#136c33]",
  warn: "bg-[#fff4e0] text-[#8a5b00]",
  danger: "bg-[#fdeaef] text-[#b21232]",
} as const;

export type BadgeTone = keyof typeof BADGE_TONE;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        BADGE_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ────────────────────────── Feedback ────────────────────────── */

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cx(
        "inline-block animate-spin rounded-full border-2 border-line border-t-accent",
        className,
      )}
    />
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
      <Spinner size={26} />
      {label ?? t("loading")}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-line px-6 py-14 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/**
 * 에러 표시. `error`에 잡힌 예외를 그대로 넘기면 언어에 맞는 문구로 바꿔 준다.
 * (백엔드가 내려준 errorCode가 있으면 messages/*.json의 errors.<code>를 쓴다)
 */
export function ErrorState({
  error,
  message,
  onRetry,
}: {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
}) {
  const t = useTranslations("common");
  const f = useFormat();
  return (
    <div className="rounded-[12px] border border-[#f3c9d3] bg-[#fdeaef] px-4 py-4 text-sm text-[#b21232]">
      <p className="font-semibold">{t("errorTitle")}</p>
      <p className="mt-1 text-[13px]">{message ?? f.apiError(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}

/* ────────────────────────── Modal ────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const tClose = useTranslations("common");
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cx(
          "fade-up max-h-[88vh] w-full overflow-y-auto rounded-t-[20px] bg-white p-5 sm:rounded-[16px]",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tClose("close")}
            className="-m-1 rounded-md p-1 text-muted hover:bg-sand"
          >
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────── Avatar / Rating ────────────────────────── */

export function Avatar({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand font-semibold text-ink2"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

export function Rating({ value, count }: { value: number | null | undefined; count?: number }) {
  const t = useTranslations("common");
  if (value == null) {
    return <span className="text-[13px] text-muted">{t("noRating")}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink">
      <span className="text-accent">★</span>
      {Number(value).toFixed(1)}
      {count != null && <span className="font-normal text-muted">({count})</span>}
    </span>
  );
}

/** 1.0~5.0 별점 입력 */
export function RatingInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[13px] text-ink2">{label}</span>}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={String(n)}
            onClick={() => onChange(n)}
            className={cx(
              "text-2xl leading-none transition-transform hover:scale-110",
              n <= value ? "text-accent" : "text-line",
            )}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-[13px] font-semibold text-ink">{value.toFixed(1)}</span>
    </div>
  );
}
