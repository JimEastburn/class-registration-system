import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function CreateClassLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <LoadingSpinner className="h-8 w-8 text-primary" />
    </div>
  );
}
