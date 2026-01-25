'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export type AuthActionResult = {
    error?: string;
    success?: boolean;
};

export async function signUp(formData: FormData): Promise<AuthActionResult> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const role = formData.get('role') as string;
    const phone = formData.get('phone') as string;
    const codeOfConduct = formData.get('codeOfConduct') === 'true';

    const codeOfConductAgreedAt = codeOfConduct ? new Date().toISOString() : null;

    // During E2E testing or development, we might want to bypass email confirmation to avoid rate limits.
    // We detect test users by their email pattern or via an environment variable.
    const isTestUser = email?.startsWith('test.student.') || email?.startsWith('test+student');
    const shouldBypass = isTestUser || process.env.BYPASS_EMAIL_CONFIRMATION === 'true';

    if (shouldBypass && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        // Use Admin API to create user with email_confirm: true
        // We need a service role client for this.
        const adminSupabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { error: adminError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
                role,
                phone,
                code_of_conduct_agreed_at: codeOfConductAgreedAt,
            },
        });

        if (adminError) {
            return { error: adminError.message };
        }
        return { success: true };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                role,
                phone,
                code_of_conduct_agreed_at: codeOfConductAgreedAt,
            },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function signIn(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    // Get user role to redirect to appropriate dashboard
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = 'parent';

    if (user) {
        // Ensure profile exists (Self-healing fallback)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            await supabase.from('profiles').insert({
                id: user.id,
                email: user.email,
                role: user.user_metadata?.role || 'parent',
                first_name: user.user_metadata?.first_name || 'User',
                last_name: user.user_metadata?.last_name || '',
            });
            userRole = user.user_metadata?.role || 'parent';
        } else {
            userRole = profile.role;
        }
    }

    revalidatePath('/', 'layout');
    redirect(`/${userRole}`);
}

export async function signOut(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    redirect('/login');
}

export async function forgotPassword(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient();

    const email = formData.get('email') as string;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function resetPassword(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient();

    const password = formData.get('password') as string;

    const { error } = await supabase.auth.updateUser({
        password,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function updateProfile(formData: FormData): Promise<AuthActionResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phone = formData.get('phone') as string;
    const bio = formData.get('bio') as string;

    const { error } = await supabase
        .from('profiles')
        .update({
            first_name: firstName,
            last_name: lastName,
            phone,
            bio,
        })
        .eq('id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}
