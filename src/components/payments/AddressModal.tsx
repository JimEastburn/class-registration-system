'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfileAddress } from '@/lib/actions/profile';
import { Loader2, MapPin } from 'lucide-react';

interface AddressModalProps {
  open: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

/**
 * Modal dialog that collects a billing address before proceeding to checkout.
 * Shown only when the user's profile is missing address fields.
 */
export function AddressModal({ open, onComplete, onCancel }: AddressModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      addressLine1: formData.get('addressLine1') as string,
      addressLine2: (formData.get('addressLine2') as string) || undefined,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip: formData.get('zip') as string,
    };

    startTransition(async () => {
      const result = await updateProfileAddress(data);
      if (result.success) {
        onComplete();
      } else {
        setError(result.error || 'Failed to save address');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <DialogTitle>Billing Address</DialogTitle>
          </div>
          <DialogDescription>
            Please provide your billing address to continue with checkout.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Street Address *</Label>
            <Input
              id="addressLine1"
              name="addressLine1"
              placeholder="123 Main St"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Apt, Suite, etc.</Label>
            <Input
              id="addressLine2"
              name="addressLine2"
              placeholder="Apt 4B (optional)"
            />
          </div>

          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3 space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                name="city"
                placeholder="Austin"
                required
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                name="state"
                placeholder="TX"
                maxLength={2}
                required
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="zip">ZIP *</Label>
              <Input
                id="zip"
                name="zip"
                placeholder="78701"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save & Continue'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
