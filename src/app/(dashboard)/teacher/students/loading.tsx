import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Loading() {
    return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <LoadingSpinner className="h-8 w-8 text-primary" />
        </div>
    );
}
