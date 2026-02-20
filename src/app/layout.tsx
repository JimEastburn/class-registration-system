import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { GlobalLoadingProvider } from "@/components/providers/GlobalLoadingProvider";
import { GlobalSpinner } from "@/components/ui/global-spinner";
import { Toaster } from "@/components/ui/sonner";

const inter = localFont({
  src: "../../public/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7W0Q5n-wU.woff2",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
});

const geistMono = localFont({
  src: "../../public/fonts/or3nQ6H-1_WfwkMZI_qYFrMdmhHkjkotbA.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  style: "normal",
});

export const viewport: Viewport = {
  viewportFit: "cover",
};

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
        className={`${inter.variable} ${geistMono.variable} antialiased pb-24 md:pb-12`}
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
