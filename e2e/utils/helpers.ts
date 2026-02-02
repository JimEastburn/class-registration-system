
import { supabaseAdmin } from './supabase';
import { UserRole } from '../../src/types';

export const generateUniqueEmail = (prefix: string = 'test') => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
};

export const createTestUser = async (role: UserRole = 'parent') => {
  const email = generateUniqueEmail(role);
  const password = 'Password123!';
  const firstName = 'Test';
  const lastName = 'User';

  console.log(`Creating test user: ${email} as ${role}`);

  // Create auth user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: role // Note: Trigger defaults to 'parent', we might need to update
    }
  });

  if (createError) {
    console.error('Error creating auth user:', createError);
    throw createError;
  }

  const userId = userData.user.id;

  // The trigger 'handle_new_user' should have created the profile as 'parent'
  // But due to occasional flakiness or desired role, we explicitly update the profile
  // using supabaseAdmin (which bypasses RLS).
  
  // We upsert just to be sure it exists and has correct info
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      role: role,
      first_name: firstName,
      last_name: lastName,
      code_of_conduct_agreed_at: new Date().toISOString()
    });

  if (profileError) {
    console.error('Error updating profile:', profileError);
    // If update fails, try to cleanup
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw profileError;
  }

  return {
    email,
    password,
    userId,
    user: userData.user
  };
};

export const deleteTestUser = async (userId: string) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('Error deleting user:', error);
  }
};
