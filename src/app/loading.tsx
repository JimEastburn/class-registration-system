import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Loading() {
  return (
    <div className="bg-background/50 flex h-screen w-full items-center justify-center backdrop-blur-sm">
      <LoadingSpinner className="text-primary h-12 w-12" />
    </div>
  );
}
