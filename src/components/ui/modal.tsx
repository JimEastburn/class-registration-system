'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.back();
    }
  };

  return (
    <Dialog defaultOpen={true} open={true} onOpenChange={handleOpenChange}>
      <DialogOverlay className="bg-black/40" />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {children}
      </DialogContent>
    </Dialog>
  );
}
