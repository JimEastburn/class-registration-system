import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { signUp, signIn, signOut, forgotPassword, resetPassword, updateProfile } from '../auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    redirect: vi.fn((url: string) => {
        const error = new Error('NEXT_REDIRECT');
        (error as any).digest = `NEXT_REDIRECT;${url}`;
        throw error;
    }),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Auth Server Actions implementation', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock Supabase client
        mockSupabase = {
            auth: {
                signUp: vi.fn(),
                signInWithPassword: vi.fn(),
                signOut: vi.fn(),
                getUser: vi.fn(),
                resetPasswordForEmail: vi.fn(),
                updateUser: vi.fn(),
            },
            from: vi.fn(() => ({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
            })),
        };

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    describe('signUp', () => {
        it('should call supabase.auth.signUp with correct data', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');
            formData.append('firstName', 'John');
            formData.append('lastName', 'Doe');
            formData.append('role', 'parent');
            formData.append('phone', '1234567890');

            mockSupabase.auth.signUp.mockResolvedValue({ data: {}, error: null });

            const result = await signUp(formData);

            expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
                options: {
                    data: {
                        first_name: 'John',
                        last_name: 'Doe',
                        role: 'parent',
                        phone: '1234567890',
                    },
                    emailRedirectTo: expect.stringContaining('/auth/callback'),
                },
            });
            expect(result).toEqual({ success: true });
        });

        it('should return error if signUp fails', async () => {
            const formData = new FormData();
            mockSupabase.auth.signUp.mockResolvedValue({
                data: {},
                error: { message: 'Signup failed' }
            });

            const result = await signUp(formData);
            expect(result).toEqual({ error: 'Signup failed' });
        });
    });

    describe('signIn', () => {
        it('should call signInWithPassword and redirect', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');

            mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { user_metadata: { role: 'teacher' } } },
                error: null
            });

            try {
                await signIn(formData);
            } catch (e: any) {
                expect(e.message).toBe('NEXT_REDIRECT');
                expect(e.digest).toBe('NEXT_REDIRECT;/teacher');
            }

            expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
        });

        it('should return error if signIn fails', async () => {
            const formData = new FormData();
            mockSupabase.auth.signInWithPassword.mockResolvedValue({
                data: {},
                error: { message: 'Invalid credentials' }
            });

            const result = await signIn(formData);
            expect(result).toEqual({ error: 'Invalid credentials' });
        });
    });

    describe('signOut', () => {
        it('should call signOut and redirect to login', async () => {
            try {
                await signOut();
            } catch (e: any) {
                expect(e.message).toBe('NEXT_REDIRECT');
                expect(e.digest).toBe('NEXT_REDIRECT;/login');
            }

            expect(mockSupabase.auth.signOut).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
        });
    });

    describe('forgotPassword', () => {
        it('should call resetPasswordForEmail', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');

            mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

            const result = await forgotPassword(formData);

            expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
                'test@example.com',
                { redirectTo: expect.stringContaining('/auth/reset-password') }
            );
            expect(result).toEqual({ success: true });
        });

        it('should return error if resetPasswordForEmail fails', async () => {
            const formData = new FormData();
            formData.append('email', 'test@example.com');
            mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
                error: { message: 'Failed to send email' }
            });

            const result = await forgotPassword(formData);
            expect(result).toEqual({ error: 'Failed to send email' });
        });
    });

    describe('resetPassword', () => {
        it('should call updateUser with new password', async () => {
            const formData = new FormData();
            formData.append('password', 'newpassword123');

            mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

            const result = await resetPassword(formData);

            expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
                password: 'newpassword123',
            });
            expect(result).toEqual({ success: true });
        });

        it('should return error if updateUser fails', async () => {
            const formData = new FormData();
            formData.append('password', 'newpassword123');
            mockSupabase.auth.updateUser.mockResolvedValue({
                error: { message: 'Update failed' }
            });

            const result = await resetPassword(formData);
            expect(result).toEqual({ error: 'Update failed' });
        });
    });

    describe('updateProfile', () => {
        it('should update profile and revalidate', async () => {
            const formData = new FormData();
            formData.append('firstName', 'Jane');
            formData.append('lastName', 'Smith');
            formData.append('phone', '0987654321');
            formData.append('bio', 'Hello');

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user123' } },
                error: null
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: mockUpdate
                })
            });

            const result = await updateProfile(formData);

            expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
            expect(mockUpdate).toHaveBeenCalledWith('id', 'user123');
            expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
            expect(result).toEqual({ success: true });
        });

        it('should return error if update fails', async () => {
            const formData = new FormData();
            formData.append('firstName', 'Jane');

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user123' } },
                error: null
            });

            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
                })
            });

            const result = await updateProfile(formData);
            expect(result).toEqual({ error: 'Database error' });
        });

        it('should return error if not authenticated', async () => {
            const formData = new FormData();
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

            const result = await updateProfile(formData);
            expect(result).toEqual({ error: 'Not authenticated' });
        });
    });
});
