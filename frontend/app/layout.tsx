import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-pretendard" });

export const metadata: Metadata = {
  title: "TagBuy - 인플루언서 마케팅 플랫폼",
  description: "에스크로 0.5% + PG 실비, 10분 만에 정산받는 인플루언서 마케팅 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
