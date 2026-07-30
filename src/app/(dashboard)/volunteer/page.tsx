import { getVolunteerBoard } from '@/lib/actions/volunteers';
import { VolunteerBoardV2Client } from '@/components/volunteers/VolunteerBoardV2Client';

export const metadata = {
  title: 'Volunteer Board',
};

export default async function VolunteerPage() {
  const result = await getVolunteerBoard();
  const remainingSlots = result.success
    ? Math.max(0, result.data.slots.length - result.data.signups.length)
    : null;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Volunteer Board</h1>
          {remainingSlots !== null && (
            <p className="text-right text-sm font-semibold text-[#bb4d00] sm:text-base">
              {remainingSlots}{' '}
              {remainingSlots === 1
                ? 'volunteer slot remaining'
                : 'volunteer slots remaining'}
            </p>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          Claim or remove your own volunteer spots. Everyone can see the filled
          slots.
        </p>
      </div>

      {result.success ? (
        <VolunteerBoardV2Client board={result.data} />
      ) : (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-6 text-sm">
          {result.error}
        </div>
      )}
    </div>
  );
}
