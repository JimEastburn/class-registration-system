
import { updateProfile } from './profile';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('updateProfile', () => {
  let mockSupabase: {
      auth: {
          getUser: ReturnType<typeof vi.fn>;
          updateUser: ReturnType<typeof vi.fn>;
      };
      from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        updateUser: vi.fn(),
      },
      from: vi.fn(),
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);
    vi.clearAllMocks();
  });

  it('should return error if not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const formData = new FormData();
    const result = await updateProfile(formData);

    expect(result).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('should update profile successfully', async () => {
    const mockUser = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    // Mock profile update
    const mockUpdateOption = { eq: vi.fn().mockResolvedValue({ error: null }) };
    const mockFrom = { update: vi.fn().mockReturnValue(mockUpdateOption) };
    mockSupabase.from.mockReturnValue(mockFrom);

    // Mock auth update
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const formData = new FormData();
    formData.append('firstName', 'John');
    formData.append('lastName', 'Doe');
    formData.append('phone', '555-5555');
    formData.append('bio', 'Hello world');
    formData.append('specializations', 'Math');
    formData.append('specializations', 'Science');

    const result = await updateProfile(formData);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockFrom.update).toHaveBeenCalledWith(expect.objectContaining({
      first_name: 'John',
      last_name: 'Doe',
      phone: '555-5555',
      bio: 'Hello world',
      specializations: ['Math', 'Science'],
    }));
    expect(mockUpdateOption.eq).toHaveBeenCalledWith('id', 'user-123');
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: {
            first_name: 'John',
            last_name: 'Doe',
            phone: '555-5555',
        }
    });
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('should return error if profile update fails', async () => {
    const mockUser = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    
    // Mock profile update failure
    const mockUpdateOption = { eq: vi.fn().mockResolvedValue({ error: { message: 'DB Error' } }) };
    const mockFrom = { update: vi.fn().mockReturnValue(mockUpdateOption) };
    mockSupabase.from.mockReturnValue(mockFrom);

    const formData = new FormData();
    formData.append('firstName', 'John');

    const result = await updateProfile(formData);

    expect(result).toEqual({ success: false, error: 'Failed to update profile' });
  });
});
