'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Link, Loader2, UserCheck, AlertCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { linkStudentByEmail, createPendingLink } from '@/lib/actions/invites';

interface LinkStudentDialogProps {
  familyMemberId: string;
  familyMemberName: string;
  trigger?: React.ReactNode;
}

type LinkStatus = 'idle' | 'linking' | 'linked' | 'pending' | 'error';

export function LinkStudentDialog({
  familyMemberId,
  familyMemberName,
  trigger,
}: LinkStudentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LinkStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);

  const resetState = () => {
    setEmail('');
    setStatus('idle');
    setError(null);
    setLinkedEmail(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setError(null);
    setStatus('linking');

    startTransition(async () => {
      // First, try to link directly if the student exists
      const linkResult = await linkStudentByEmail(familyMemberId, email.trim());

      if (!linkResult.success) {
        setStatus('error');
        setError(linkResult.error || 'Failed to link student');
        return;
      }

      if (linkResult.data?.linked) {
        // Successfully linked to an existing student
        setStatus('linked');
        setLinkedEmail(linkResult.data.studentProfile?.email || email);
        router.refresh();
      } else {
        // Student doesn't exist yet - create a pending link
        const pendingResult = await createPendingLink(familyMemberId, email.trim());

        if (!pendingResult.success) {
          setStatus('error');
          setError(pendingResult.error || 'Failed to create pending link');
          return;
        }

        setStatus('pending');
        setLinkedEmail(pendingResult.data?.pendingEmail || email);
        router.refresh();
      }
    });
  };

  const handleClose = () => {
    if (status === 'linked' || status === 'pending') {
      router.refresh();
    }
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Link className="h-4 w-4" />
            Link Student Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Link Student Account
          </DialogTitle>
          <DialogDescription>
            Link <span className="font-semibold">{familyMemberName}</span> to their student account
            by entering their email address.
          </DialogDescription>
        </DialogHeader>

        {status === 'linked' && (
          <div className="py-4">
            <Alert className="bg-green-50 border-green-200">
              <UserCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Successfully linked to student account{' '}
                <span className="font-semibold">{linkedEmail}</span>
              </AlertDescription>
            </Alert>
            <DialogFooter className="mt-4">
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}

        {status === 'pending' && (
          <div className="py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <span className="font-semibold">{linkedEmail}</span> is not registered yet. 
                When they register with this email, they will be automatically linked to {familyMemberName}.
              </AlertDescription>
            </Alert>
            <DialogFooter className="mt-4">
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}

        {(status === 'idle' || status === 'linking' || status === 'error') && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Student Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  autoComplete="off"
                />
                <p className="text-sm text-muted-foreground">
                  If the student hasn&apos;t registered yet, we&apos;ll automatically link them when they do.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !email.trim()}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Link Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
