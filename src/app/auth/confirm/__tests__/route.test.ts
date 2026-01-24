import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/server', () => ({
    NextResponse: {
        redirect: vi.fn((url) => ({ url })),
    },
}));

interface MockNextUrl extends URL {
    clone: () => URL;
}

interface MockRequest {
    url: string;
    nextUrl: MockNextUrl;
}


describe('Auth Confirmation Route', () => {
    let mockSupabase: Mocked<SupabaseClient<Database>>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = {
            auth: {
                verifyOtp: vi.fn(),
                getUser: vi.fn(),
            },
        } as unknown as Mocked<SupabaseClient<Database>>;
        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    it('should redirect to role-based dashboard on successful verification', async () => {
        const url = 'http://localhost:3000/auth/confirm?token_hash=test_hash&type=signup';
        const nextUrl = new URL(url) as MockNextUrl;
        nextUrl.clone = () => new URL(url);
        const request: MockRequest = {
            url,
            nextUrl,
        };

        (mockSupabase.auth.verifyOtp as Mock).mockResolvedValue({ error: null });
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { user_metadata: { role: 'admin' } } },
            error: null,
        });

        await GET(request as unknown as Parameters<typeof GET>[0]);

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
        const nextUrl = new URL(url) as MockNextUrl;
        nextUrl.clone = () => new URL(url);
        const request: MockRequest = {
            url,
            nextUrl,
        };

        await GET(request as unknown as Parameters<typeof GET>[0]);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: '/auth/auth-code-error' })
        );
    });

    it('should redirect to error page if verification fails', async () => {
        const url = 'http://localhost:3000/auth/confirm?token_hash=bad_hash&type=signup';
        const nextUrl = new URL(url) as MockNextUrl;
        nextUrl.clone = () => new URL(url);
        const request: MockRequest = {
            url,
            nextUrl,
        };

        (mockSupabase.auth.verifyOtp as Mock).mockResolvedValue({ error: { message: 'Invalid token' } });

        await GET(request as unknown as Parameters<typeof GET>[0]);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: '/auth/auth-code-error' })
        );
    });
});
