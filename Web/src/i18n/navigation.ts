import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * 언어 prefix를 자동으로 붙여 주는 래퍼.
 *
 * 앞으로 페이지에서는 next/link · next/navigation 대신 여기서 가져다 쓴다.
 *   import { Link, useRouter, usePathname } from "@/i18n/navigation";
 *
 * <Link href="/companions"> 라고 써도 실제로는 /en/companions 로 이동한다.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
