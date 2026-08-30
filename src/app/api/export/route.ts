import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/actions/audit';
import type { UserRole } from '@/types';
import {
  canExport,
  createCsvExport,
  ExportRequestError,
  parseExportRequest,
} from '@/lib/exports/export-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const role = profile?.role as UserRole | undefined;

  try {
    const exportRequest = parseExportRequest(new URL(request.url).searchParams);

    if (!role || !canExport(role, exportRequest.type)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = await createAdminClient();
    const result = await createCsvExport(
      supabase,
      adminClient,
      role,
      exportRequest
    );

    await logAuditAction(
      user.id,
      'data_exported',
      'export',
      exportRequest.type,
      {
        exportType: exportRequest.type,
        scope: exportRequest.scope,
        rowCount: result.rowCount,
        filters: result.filters,
      }
    );

    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof ExportRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
