/**
 * 루트 레이아웃 — 실제 <html>/<body>는 [locale]/layout.tsx가 담당한다.
 * Next.js가 app/layout.tsx를 요구하기 때문에 통과용으로만 남겨 둔다.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
