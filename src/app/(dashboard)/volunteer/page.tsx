import { getVolunteerBoard } from '@/lib/actions/volunteers';
import { VolunteerBoardClient } from '@/components/volunteers/VolunteerBoardClient';

export const metadata = {
  title: 'Volunteer Board',
};

export default async function VolunteerPage() {
  const result = await getVolunteerBoard();

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Volunteer Board</h1>
        <p className="text-muted-foreground mt-2">
          Claim or remove your own volunteer spots. Everyone can see the filled
          slots.
        </p>
      </div>

      {result.success ? (
        <VolunteerBoardClient board={result.data} />
      ) : (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-6 text-sm">
          {result.error}
        </div>
      )}
    </div>
  );
}
