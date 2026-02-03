import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8 min-h-[50vh]">
      <LoadingSpinner className="h-10 w-10 text-primary" />
    </div>
  );
}
