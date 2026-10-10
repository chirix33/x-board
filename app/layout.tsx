import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { RegisterServiceWorker } from "@/components/register-service-worker";
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
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-page pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] font-sans text-ink">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
