import { getAuditLogs } from '@/lib/actions/admin';
import { AuditLogTable } from '@/components/admin/AuditLogTable';

interface PageProps {
  searchParams: Promise<{ 
    page?: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params?.page) || 1;
    const limit = 20;

    const { data, count } = await getAuditLogs(page, limit, {
        userId: params.userId,
        action: params.action,
        startDate: params.startDate,
        endDate: params.endDate
    });

    return (
        <div className="space-y-6 container mx-auto py-6">
             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            </div>
            
            <AuditLogTable 
                data={data || []}
                count={count}
                page={page}
                limit={limit}
            />
        </div>
    );
}
