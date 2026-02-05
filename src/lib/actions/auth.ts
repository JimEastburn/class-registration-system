'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendPasswordReset } from '@/lib/email';
import type { ActionResult } from '@/types';

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const role = formData.get('role') as 'parent' | 'teacher' | 'student';
  const phone = (formData.get('phone') as string) || null;


  const supabase = await createClient();


  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        role,
        phone,
      },
    },
  });


  if (authError) {
    console.error('Auth Error', authError);
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    console.error('No user data');
    return { success: false, error: 'Failed to create user account' };
  }

  // "Belt and suspenders" - ensure profile exists
  // The trigger should create it, but we double-check
  // Use admin client to bypass RLS/session latency issues

  const adminClient = await createAdminClient();

  const { error: profileError } = await adminClient.from('profiles').upsert(
    {
      id: authData.user.id,
      email: authData.user.email!,
      first_name: firstName,
      last_name: lastName,
      role,
      phone,
      code_of_conduct_agreed_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );


  if (profileError) {
    console.error('Profile creation error:', profileError);
    // Don't fail the signup, the trigger should have handled it
  }

  // Auto-link pending student invites
  if (role === 'student' && authData.user.email) {
    const pendingKey = `pending_link:${authData.user.email.toLowerCase().trim()}`;

    const { data: pendingLink } = await adminClient
      .from('system_settings')
      .select('key, value')
      .eq('key', pendingKey)
      .maybeSingle();

    if (pendingLink?.value && typeof pendingLink.value === 'object') {
      const pendingValue = pendingLink.value as {
        family_member_id?: string;
        parent_id?: string;
      };

      if (pendingValue.family_member_id) {
        // Link the student to the family member if still unlinked
        await adminClient
          .from('family_members')
          .update({ student_user_id: authData.user.id })
          .eq('id', pendingValue.family_member_id)
          .is('student_user_id', null);
      }

      // Remove the pending link record
      await adminClient
        .from('system_settings')
        .delete()
        .eq('key', pendingKey);
    }
  }

  return { success: true, data: { userId: authData.user.id } };
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Failed to sign in' };
  }

  // "Belt and suspenders" - ensure profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', data.user.id)
    .single();

  if (!profile) {
    // Create profile if trigger failed
    await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email!,
      role: 'parent', // Default role
    });
  }

  revalidatePath('/', 'layout');

  // Redirect based on role
  const userRole = profile?.role || 'parent';
  const redirectPaths: Record<string, string> = {
    parent: '/parent',
    teacher: '/teacher',
    student: '/student',
    admin: '/admin',
    class_scheduler: '/class-scheduler',
    super_admin: '/admin',
  };

  redirect(redirectPaths[userRole] || '/parent');
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Send a password reset email
 */
export async function resetPassword(
  formData: FormData
): Promise<ActionResult<void>> {
  const supabase = await createAdminClient();

  const email = formData.get('email') as string;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Send the custom email
  if (data?.properties?.action_link) {
    await sendPasswordReset({
        email,
        resetLink: data.properties.action_link
    });
  }

  return { success: true, data: undefined };
}

/**
 * Update password (for password reset flow)
 */
export async function updatePassword(
  formData: FormData
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const password = formData.get('password') as string;

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Get the current user's profile
 */
export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
