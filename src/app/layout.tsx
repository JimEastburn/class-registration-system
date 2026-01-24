import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-12`}
      >
        {children}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-200 p-2 text-center text-sm text-muted-foreground z-50 backdrop-blur-sm">
          For help, please email communitysupport@austinaac.org
        </div>
      </body>
    </html>
  );
}
