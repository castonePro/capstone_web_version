import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // 정적 파일·API 라우트·Next 내부 경로를 제외한 모든 경로에 언어 prefix를 적용한다.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
