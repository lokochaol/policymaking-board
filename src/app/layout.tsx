import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  variable: "--font-noto",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen",
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ステークホルダー会議室",
  description: "社会のさまざまな立場のAIが、ひとつの議題を話し合う会議室。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${notoSans.variable} ${zenMaru.variable} antialiased`}>{children}</body>
    </html>
  );
}
