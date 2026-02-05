"use client";

import { usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function DashboardLoading() {
    const pathname = usePathname();

    if (pathname === "/admin") {
        return null;
    }

    return (
        <div className="flex h-full w-full items-center justify-center p-8 bg-background/50">
            <LoadingSpinner className="h-10 w-10 text-primary" />
        </div>
    );
}
