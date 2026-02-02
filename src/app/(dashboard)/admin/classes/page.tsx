
import { getAllClasses } from '@/lib/actions/classes';
import AdminClassTable from '@/components/admin/AdminClassTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Class Management',
};

export default async function AdminClassesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string }>;
}) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || undefined;
    const limit = 20;

    const result = await getAllClasses({ page, limit, search });

    if (!result.success) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
                <p>{result.error}</p>
            </div>
        );
    }

    const { classes, total } = result.data;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
                    <p className="text-muted-foreground">
                        Manage all classes, published or draft.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/teacher/classes/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Class
                    </Link>
                </Button>
            </div>

            <AdminClassTable 
                initialClasses={classes} 
                total={total} 
                currentPage={page}
                limit={limit}
            />
        </div>
    );
}
