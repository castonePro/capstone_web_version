import type { ComponentType, SVGProps } from "react";
import {
  IconBell,
  IconBox,
  IconCard,
  IconChat,
  IconCompass,
  IconFolder,
  IconGavel,
  IconHistory,
  IconHome,
  IconLuggage,
  IconMapPin,
  IconShield,
  IconSparkle,
  IconUser,
  IconUsers,
} from "./icons";

export interface NavItem {
  href: string;
  /** messages/*.json 의 nav.<key> 를 가리킨다 */
  labelKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** 모바일 하단 탭에도 노출할지 (앱의 5개 탭 구성과 동일하게 유지) */
  primary?: boolean;
}

/**
 * 유저 모드 — Flutter main_page.dart의 _kUserNavItems와 동일한 순서·라벨.
 * 앱에서 홈 화면 퀵메뉴/상단바로 빠져 있던 항목(동행·가이드·여행지·알림·마이)은
 * 데스크톱 사이드바에 함께 노출한다. (넓은 화면을 쓰는 웹의 이점)
 */
export const USER_NAV: NavItem[] = [
  { href: "/home", labelKey: "home", icon: IconHome, primary: true },
  { href: "/trips", labelKey: "trips", icon: IconLuggage, primary: true },
  { href: "/ai", labelKey: "ai", icon: IconSparkle, primary: true },
  { href: "/chat", labelKey: "chat", icon: IconChat, primary: true },
  { href: "/recent", labelKey: "recent", icon: IconHistory, primary: true },
];

export const USER_NAV_SECONDARY: NavItem[] = [
  { href: "/companions", labelKey: "companions", icon: IconUsers },
  { href: "/guides", labelKey: "guides", icon: IconCompass },
  { href: "/places", labelKey: "places", icon: IconMapPin },
  { href: "/companions/my", labelKey: "myCompanions", icon: IconShield },
  { href: "/payments", labelKey: "payments", icon: IconCard },
  { href: "/notifications", labelKey: "notifications", icon: IconBell },
  { href: "/me", labelKey: "me", icon: IconUser },
];

/** 가이드 모드 — _kGuideNavItems와 동일 */
export const GUIDE_NAV: NavItem[] = [
  { href: "/home", labelKey: "home", icon: IconHome, primary: true },
  { href: "/ai", labelKey: "aiPlanner", icon: IconSparkle, primary: true },
  { href: "/guide/portfolio", labelKey: "portfolio", icon: IconFolder, primary: true },
  { href: "/guide/bids", labelKey: "bids", icon: IconGavel, primary: true },
  { href: "/guide/products", labelKey: "products", icon: IconBox, primary: true },
];

export const GUIDE_NAV_SECONDARY: NavItem[] = [
  { href: "/chat", labelKey: "chat", icon: IconChat },
  { href: "/companions", labelKey: "companions", icon: IconUsers },
  { href: "/notifications", labelKey: "notifications", icon: IconBell },
  { href: "/me", labelKey: "me", icon: IconUser },
];
