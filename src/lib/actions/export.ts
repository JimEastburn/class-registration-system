'use server';

import { createClient } from '@/lib/supabase/server';
import { ActionResult } from '@/types';


type ExportType = 'classes' | 'enrollments' | 'users';

/**
 * Escapes CSV fields to prevent formula injection
 * Prepends a single quote if the field starts with =, +, -, or @
 */
function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) {
    return '';
  }
  const stringValue = String(field);
  // Check for formula injection triggers
  if (/^[=+\-@]/.test(stringValue)) {
    return `'${stringValue}`;
  }
  // Escape double quotes by doubling them
  if (stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  // Wrap in quotes if it contains comma, newline, or quotes
  if (/[,\n\r"]/.test(stringValue)) {
    return `"${stringValue}"`;
  }
  return stringValue;
}

export async function exportData(
  exportType: ExportType
): Promise<ActionResult<{ csv: string; filename: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify Admin Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return { success: false, error: 'Not authorized' };
    }

    let csvContent = '';
    let filename = '';
    const dateStr = new Date().toISOString().split('T')[0];

    if (exportType === 'classes') {
      filename = `classes_export_${dateStr}.csv`;
      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          id, name, description, capacity, 
          status, price, 
          teacher:profiles(first_name, last_name),
          location
        `);

      if (error) throw error;

      const headers = ['ID', 'Name', 'Description', 'Capacity', 'Status', 'Price', 'Teacher', 'Location'];
      const rows = (classes || []).map(c => [
        c.id,
        c.name,
        c.description,
        c.capacity,
        c.status,
        c.price,
        c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : 'Unassigned',
        c.location
      ]);

      csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsvField).join(','))
      ].join('\n');

    } else if (exportType === 'enrollments') {
      filename = `enrollments_export_${dateStr}.csv`;
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id, status, created_at,
          class:classes(name),
          student:family_members(first_name, last_name, parent:profiles!family_members_parent_id_fkey(email, first_name, last_name))
        `);

      if (error) throw error;

      const headers = ['ID', 'Status', 'Enrollment Date', 'Class Name', 'Student Name', 'Parent Name', 'Parent Email'];
      const rows = (enrollments || []).map(e => {
        const parent = (e.student as unknown as { parent: { email: string; first_name: string; last_name: string } | null })?.parent;
        return [
          e.id,
          e.status,
          e.created_at,
          e.class?.name || 'Unknown',
          e.student ? `${e.student.first_name} ${e.student.last_name}` : 'Unknown',
          parent ? `${parent.first_name} ${parent.last_name}` : 'Unknown',
          parent?.email || 'Unknown'
        ];
      });

      csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsvField).join(','))
      ].join('\n');

    } else if (exportType === 'users') {
      filename = `users_export_${dateStr}.csv`;
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, phone, created_at');

      if (error) throw error;

      const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Phone', 'Joined Date'];
      const rows = (profiles || []).map(p => [
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.role,
        p.phone,
        p.created_at
      ]);

      csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsvField).join(','))
      ].join('\n');
    }

    return { success: true, data: { csv: csvContent, filename } };

  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: 'Failed to export data' };
  }
}
