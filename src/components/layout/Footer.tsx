"use client";

import { usePathname } from "next/navigation";

export function Footer() {
    const pathname = usePathname();

    // Hide footer on login and register pages
    if (pathname === "/login" || pathname === "/register") {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-200 p-2 text-center text-sm text-muted-foreground z-50 backdrop-blur-sm">
            For help, please text Jim Eastburn{" "}
            <a
                href="sms:+15126896860"
                className="text-blue-600 hover:underline font-medium"
            >
                (512) 689-6860
            </a>
            <span className="mx-6 text-gray-300">|</span>
            <a
                href="/AAC - 2025-26 Community Code of Conduct.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
            >
                Code of Conduct
            </a>
        </div>
    );
}
