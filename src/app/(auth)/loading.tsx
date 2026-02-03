import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function AuthLoading() {
    return (
        <div className="flex w-full items-center justify-center py-12">
            <LoadingSpinner className="h-10 w-10 text-white" />
        </div>
    );
}
