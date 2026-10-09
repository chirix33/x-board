import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "X Board",
  applicationName: "X Board",
  description: "Move copied text and images between your machines.",
  appleWebApp: {
    capable: true,
    title: "X Board",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#5C4F4A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-page font-sans text-ink">{children}</body>
    </html>
  );
}
