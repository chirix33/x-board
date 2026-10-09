import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const clarityCity = localFont({
  src: "../fonts/ClarityCity.woff2",
  variable: "--font-clarity-city",
  weight: "400 600",
  display: "swap",
});

export const metadata: Metadata = {
  title: "X Board",
  description: "Move copied text and images between your machines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${clarityCity.variable} h-full antialiased`}>
      <meta name="apple-mobile-web-app-title" content="X Board" />
      <body className="min-h-dvh bg-page font-sans text-ink">{children}</body>
    </html>
  );
}
