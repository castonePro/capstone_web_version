import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // TourAPI 이미지(tong.visitkorea.or.kr 등)를 그대로 <img>로 쓰기 때문에
    // next/image 최적화는 사용하지 않는다.
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
