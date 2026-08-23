"use client";

/**
 * Flutter의 features/auth/provider/auth_provider.dart 대응.
 * - 로그인/회원가입/로그아웃
 * - 내 프로필(fetchMe) — 본인 인증 상태·나이대·성별·제재 상태
 * - 가이드 모드 토글 (isGuideMode) — 앱과 동일하게 is_guide인 사용자만 켤 수 있다
 */

import { useRouter } from "@/i18n/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AuthStorage, setUnauthorizedHandler } from "@/lib/api/client";
import { authApi, userApi } from "@/lib/api/endpoints";
import type { MeResponse } from "@/lib/api/types";

interface AuthContextValue {
  ready: boolean;
  isLoggedIn: boolean;
  userId: string | null;
  nickname: string | null;
  isGuide: boolean;
  me: MeResponse | null;
  isGuideMode: boolean;
  setGuideMode: (on: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname: string) => Promise<string>;
  logout: () => void;
  fetchMe: () => Promise<MeResponse | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GUIDE_MODE_KEY = "guide_mode";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isGuide, setIsGuide] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isGuideMode, setIsGuideMode] = useState(false);

  // 최초 마운트 시 localStorage에서 세션 복원 (앱의 SplashPage 역할)
  useEffect(() => {
    setToken(AuthStorage.getToken());
    setUserId(AuthStorage.getUserId());
    setNickname(AuthStorage.getNickname());
    const guide = AuthStorage.isGuide();
    setIsGuide(guide);
    try {
      setIsGuideMode(guide && window.localStorage.getItem(GUIDE_MODE_KEY) === "true");
    } catch {
      /* noop */
    }
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    AuthStorage.clear();
    try {
      window.localStorage.removeItem(GUIDE_MODE_KEY);
    } catch {
      /* noop */
    }
    setToken(null);
    setUserId(null);
    setNickname(null);
    setIsGuide(false);
    setIsGuideMode(false);
    setMe(null);
    router.replace("/login");
  }, [router]);

  // 401이 뜨면 세션을 정리하고 로그인 화면으로 (Dio 인터셉터와 동일한 동작)
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUserId(null);
      setNickname(null);
      setIsGuide(false);
      setIsGuideMode(false);
      setMe(null);
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  const fetchMe = useCallback(async () => {
    if (!AuthStorage.getToken()) return null;
    try {
      const data = await userApi.me();
      setMe(data);
      setNickname(data.nickname);
      setIsGuide(data.is_guide);
      AuthStorage.saveUserData(data.user_id, data.nickname, data.is_guide);
      return data;
    } catch {
      return null;
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      const d = res.data;
      AuthStorage.saveToken(d.access_token);
      AuthStorage.saveUserData(d.user_id, d.nickname, d.is_guide);
      setToken(d.access_token);
      setUserId(d.user_id);
      setNickname(d.nickname);
      setIsGuide(d.is_guide);
      await fetchMe();
    },
    [fetchMe],
  );

  const signup = useCallback(async (email: string, password: string, nick: string) => {
    const res = await authApi.signup(email, password, nick);
    return res.message;
  }, []);

  const setGuideMode = useCallback(
    (on: boolean) => {
      if (on && !isGuide) return; // 가이드가 아니면 켤 수 없다
      setIsGuideMode(on);
      try {
        window.localStorage.setItem(GUIDE_MODE_KEY, String(on));
      } catch {
        /* noop */
      }
    },
    [isGuide],
  );

  // 로그인된 상태면 프로필을 한 번 당겨온다
  useEffect(() => {
    if (token) void fetchMe();
  }, [token, fetchMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isLoggedIn: !!token,
      userId,
      nickname,
      isGuide,
      me,
      isGuideMode,
      setGuideMode,
      login,
      signup,
      logout,
      fetchMe,
    }),
    [
      ready,
      token,
      userId,
      nickname,
      isGuide,
      me,
      isGuideMode,
      setGuideMode,
      login,
      signup,
      logout,
      fetchMe,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
