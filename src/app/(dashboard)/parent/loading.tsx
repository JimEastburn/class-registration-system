import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ParentDashboardLoading() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <LoadingSpinner className="text-primary h-8 w-8" />
    </div>
  );
}
