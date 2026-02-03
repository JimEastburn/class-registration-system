import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function DashboardLoading() {
    return (
        <div className="flex h-full w-full items-center justify-center p-8 bg-background/50">
            <LoadingSpinner className="h-10 w-10 text-primary" />
        </div>
    );
}
