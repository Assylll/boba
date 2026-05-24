import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Boba POS — Касса",
  description: "Система кассы для магазина баблти",
};

const displayFont = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const bodyFont = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="font-body text-gray-900 antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
