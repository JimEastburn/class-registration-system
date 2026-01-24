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
            For help, please email{" "}
            <a
                href="mailto:communitysupport@austinaac.org"
                className="text-blue-600 hover:underline font-medium"
            >
                communitysupport@austinaac.org
            </a>
        </div>
    );
}
