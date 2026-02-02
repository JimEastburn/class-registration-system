import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { GlobalLoadingProvider } from "@/components/providers/GlobalLoadingProvider";
import { GlobalSpinner } from "@/components/ui/global-spinner";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Class Registration System",
  description: "Register for classes, manage enrollments, and process payments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-24 md:pb-12`}
      >
        <GlobalLoadingProvider>
          {children}
          <Footer />
          <GlobalSpinner />
          <Toaster />
        </GlobalLoadingProvider>
      </body>
    </html>
  );
}
