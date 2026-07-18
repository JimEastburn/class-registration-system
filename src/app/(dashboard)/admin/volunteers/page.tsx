import { getVolunteerBoard } from '@/lib/actions/volunteers';
import { AdminVolunteerConfig } from '@/components/volunteers/AdminVolunteerConfig';

export const metadata = {
  title: 'Volunteer Configuration',
};

export default async function AdminVolunteersPage() {
  const result = await getVolunteerBoard();

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Volunteer Configuration
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure volunteer roles, blocks, and the required role/block slots.
        </p>
      </div>

      {result.success ? (
        <AdminVolunteerConfig board={result.data} />
      ) : (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-6 text-sm">
          {result.error}
        </div>
      )}
    </div>
  );
}
