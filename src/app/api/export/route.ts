import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'users';

    let data: Record<string, unknown>[] = [];
    let headers: string[] = [];
    let filename = '';

    switch (type) {
        case 'users': {
            const { data: users } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            data = users || [];
            headers = ['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Phone', 'Created At'];
            filename = 'users.csv';
            break;
        }

        case 'classes': {
            const { data: classes } = await supabase
                .from('classes')
                .select(`
                    *,
                    teacher:profiles!classes_teacher_id_fkey(first_name, last_name)
                `)
                .order('created_at', { ascending: false });

            data = (classes || []).map(c => {
                const teacher = c.teacher as { first_name: string; last_name: string };
                return {
                    ...c,
                    teacher_name: `${teacher.first_name} ${teacher.last_name}`,
                };
            });
            headers = ['ID', 'Name', 'Teacher', 'Status', 'Schedule', 'Location', 'Fee', 'Enrollment', 'Max Students', 'Start Date', 'End Date', 'Created At'];
            filename = 'classes.csv';
            break;
        }

        case 'enrollments': {
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select(`
                    *,
                    student:family_members(first_name, last_name),
                    class:classes(name, fee)
                `)
                .order('enrolled_at', { ascending: false });

            data = (enrollments || []).map(e => {
                const student = e.student as { first_name: string; last_name: string };
                const classData = e.class as { name: string; fee: number };
                return {
                    ...e,
                    student_name: `${student.first_name} ${student.last_name}`,
                    class_name: classData.name,
                    class_fee: classData.fee,
                };
            });
            headers = ['ID', 'Student', 'Class', 'Status', 'Fee', 'Enrolled At'];
            filename = 'enrollments.csv';
            break;
        }

        case 'payments': {
            const { data: payments } = await supabase
                .from('payments')
                .select(`
                    *,
                    enrollment:enrollments(
                        student:family_members(first_name, last_name),
                        class:classes(name)
                    )
                `)
                .order('created_at', { ascending: false });

            data = (payments || []).map(p => {
                const enrollment = p.enrollment as {
                    student: { first_name: string; last_name: string };
                    class: { name: string };
                };
                return {
                    ...p,
                    student_name: `${enrollment?.student?.first_name} ${enrollment?.student?.last_name}`,
                    class_name: enrollment?.class?.name,
                };
            });
            headers = ['ID', 'Student', 'Class', 'Amount', 'Status', 'Stripe Payment ID', 'Created At'];
            filename = 'payments.csv';
            break;
        }

        default:
            return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    // Convert data to CSV
    const csv = convertToCSV(data, type);

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}

function convertToCSV(data: Record<string, unknown>[], type: string): string {
    if (data.length === 0) return '';

    let rows: string[][] = [];

    switch (type) {
        case 'users':
            rows = data.map(d => [
                String(d.id || ''),
                String(d.email || ''),
                String(d.first_name || ''),
                String(d.last_name || ''),
                String(d.role || ''),
                String(d.phone || ''),
                formatDate(d.created_at as string),
            ]);
            rows.unshift(['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Phone', 'Created At']);
            break;

        case 'classes':
            rows = data.map(d => [
                String(d.id || ''),
                String(d.name || ''),
                String(d.teacher_name || ''),
                String(d.status || ''),
                String(d.schedule || ''),
                String(d.location || ''),
                `$${Number(d.fee || 0).toFixed(2)}`,
                String(d.current_enrollment || 0),
                String(d.max_students || 0),
                formatDate(d.start_date as string),
                formatDate(d.end_date as string),
                formatDate(d.created_at as string),
            ]);
            rows.unshift(['ID', 'Name', 'Teacher', 'Status', 'Schedule', 'Location', 'Fee', 'Enrollment', 'Max Students', 'Start Date', 'End Date', 'Created At']);
            break;

        case 'enrollments':
            rows = data.map(d => [
                String(d.id || ''),
                String(d.student_name || ''),
                String(d.class_name || ''),
                String(d.status || ''),
                `$${Number(d.class_fee || 0).toFixed(2)}`,
                formatDate(d.enrolled_at as string),
            ]);
            rows.unshift(['ID', 'Student', 'Class', 'Status', 'Fee', 'Enrolled At']);
            break;

        case 'payments':
            rows = data.map(d => [
                String(d.id || ''),
                String(d.student_name || ''),
                String(d.class_name || ''),
                `$${Number(d.amount || 0).toFixed(2)}`,
                String(d.status || ''),
                String(d.stripe_payment_id || ''),
                formatDate(d.created_at as string),
            ]);
            rows.unshift(['ID', 'Student', 'Class', 'Amount', 'Status', 'Stripe Payment ID', 'Created At']);
            break;
    }

    return rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}
