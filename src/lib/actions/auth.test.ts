
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUp, signIn } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Auth Actions', () => {
  const mockSupabase = {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
    (mockSupabase.from as any).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: 'parent' }, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  describe('signUp', () => {
    it('returns success on valid signup', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');
      formData.append('firstName', 'John');
      formData.append('lastName', 'Doe');
      formData.append('role', 'parent');

      const result = await signUp(formData);

      expect(result.success).toBe(true);
      if (result.success) {
          expect(result.data.userId).toBe('user-123');
      }
      expect(mockSupabase.auth.signUp).toHaveBeenCalled();
    });

    it('returns error on auth failure', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' },
      });

      const formData = new FormData();
      formData.append('email', 'existing@example.com');
      formData.append('password', 'password123');
      formData.append('firstName', 'John');
      formData.append('lastName', 'Doe');
      formData.append('role', 'parent');

      const result = await signUp(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
          expect(result.error).toBe('Email already registered');
      }
    });
  });

  describe('signIn', () => {
    it('redirects on valid sign in', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      await signIn(formData);

      expect(redirect).toHaveBeenCalledWith('/parent');
    });

    it('returns error on invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'wrongpassword');

      const result = await signIn(formData);

      expect(result.error).toBe('Invalid login credentials');
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
