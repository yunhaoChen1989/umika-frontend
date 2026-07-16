import type { Metadata } from "next";

import { GlobalChrome } from "@/components/layout/global-chrome";
import { RuntimeTranslator } from "@/components/layout/runtime-translator";
import { getCurrentLocale } from "@/lib/i18n-server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Umika Sushi",
  description: "Online ordering, loyalty rewards, and fresh sushi pickup from Umika Sushi.",
  metadataBase: new URL("https://umikasushi.ca"),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();

  return (
    <html lang={locale === "zh" ? "zh-CN" : locale === "ko" ? "ko" : "en"}>
      <body className="min-h-screen font-sans antialiased">
        <GlobalChrome locale={locale}>{children}</GlobalChrome>
        <RuntimeTranslator locale={locale} />
      </body>
    </html>
  );
}
