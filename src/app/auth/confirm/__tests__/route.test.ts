import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/server', () => ({
    NextResponse: {
        redirect: vi.fn((url) => ({ url })),
    },
}));

describe('Auth Confirmation Route', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = {
            auth: {
                verifyOtp: vi.fn(),
                getUser: vi.fn(),
            },
        };
        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    it('should redirect to role-based dashboard on successful verification', async () => {
        const url = 'http://localhost:3000/auth/confirm?token_hash=test_hash&type=signup';
        const nextUrl = new URL(url);
        (nextUrl as any).clone = () => new URL(url);
        const request = {
            url,
            nextUrl,
        } as any;

        mockSupabase.auth.verifyOtp.mockResolvedValue({ error: null });
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { user_metadata: { role: 'admin' } } },
            error: null,
        });

        const response = await GET(request);

        expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
            token_hash: 'test_hash',
            type: 'signup',
        });
        expect(NextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: '/admin' })
        );
    });

    it('should redirect to error page if token_hash is missing', async () => {
        const url = 'http://localhost:3000/auth/confirm?type=signup';
        const nextUrl = new URL(url);
        (nextUrl as any).clone = () => new URL(url);
        const request = {
            url,
            nextUrl,
        } as any;

        const response = await GET(request);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: '/auth/auth-code-error' })
        );
    });

    it('should redirect to error page if verification fails', async () => {
        const url = 'http://localhost:3000/auth/confirm?token_hash=bad_hash&type=signup';
        const nextUrl = new URL(url);
        (nextUrl as any).clone = () => new URL(url);
        const request = {
            url,
            nextUrl,
        } as any;

        mockSupabase.auth.verifyOtp.mockResolvedValue({ error: { message: 'Invalid token' } });

        const response = await GET(request);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: '/auth/auth-code-error' })
        );
    });
});
