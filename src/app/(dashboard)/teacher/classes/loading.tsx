import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Loading() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center p-8">
      <LoadingSpinner className="text-primary h-10 w-10" />
    </div>
  );
}
