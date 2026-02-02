
import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseFake } from './supabase';

describe('SupabaseFake', () => {
  let client: SupabaseFake;

  beforeEach(() => {
    client = new SupabaseFake();
  });

  describe('CRUD Operations', () => {
    it('should insert and select data', async () => {
      const { data, error } = await client
        .from('users')
        .insert({ name: 'Alice', email: 'alice@example.com' })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toMatchObject({ name: 'Alice', email: 'alice@example.com' });
      expect(data.id).toBeDefined();
      expect(data.created_at).toBeDefined();
    });

    it('should update data', async () => {
        // Setup
        await client.from('users').insert({ id: '1', name: 'Bob', status: 'active' });

        // Update
        const minimize = await client
            .from('users')
            .update({ status: 'inactive' })
            .eq('id', '1')
            .select();
        
        expect(minimize.error).toBeNull();
        
        // Verify
        const { data } = await client.from('users').select().eq('id', '1').single();
        expect(data.status).toBe('inactive');
        expect(data.name).toBe('Bob');
    });

    it('should delete data', async () => {
        // Setup
        await client.from('users').insert({ id: '1', name: 'Charlie' });

        // Delete
        const { error } = await client.from('users').delete().eq('id', '1');
        expect(error).toBeNull();

        // Verify
        const { data } = await client.from('users').select().eq('id', '1').maybeSingle();
        expect(data).toBeNull();
    });
  });

  describe('Filtering', () => {
      beforeEach(async () => {
          await client.from('items').insert([
              { id: 1, val: 10, name: 'A' },
              { id: 2, val: 20, name: 'B' },
              { id: 3, val: 30, name: 'C' },
          ]);
      });

      it('should filter by eq', async () => {
          const { data } = await client.from('items').select().eq('val', 20);
          expect(data).toHaveLength(1);
          expect(data[0].id).toBe(2);
      });

      it('should filter by gt', async () => {
          const { data } = await client.from('items').select().gt('val', 15);
          expect(data).toHaveLength(2); // 20, 30
      });

      it('should filter by lt', async () => {
          const { data } = await client.from('items').select().lt('val', 20);
          expect(data).toHaveLength(1); // 10
      });

      it('should filter by in', async () => {
          const { data } = await client.from('items').select().in('val', [10, 30]);
          expect(data).toHaveLength(2);
      });
      
      it('should filter by ilike', async () => {
          const { data } = await client.from('items').select().ilike('name', 'a');
          expect(data).toHaveLength(1);
          expect(data[0].name).toBe('A');
      });
  });

  describe('Modifiers', () => {
      beforeEach(async () => {
          await client.from('rows').insert([
              { val: 1 }, { val: 2 }, { val: 3 }
          ]);
      });

      it('should limit results', async () => {
          const { data } = await client.from('rows').select().limit(2);
          expect(data).toHaveLength(2);
      });

      it('should order results', async () => {
           const { data } = await client.from('rows').select().order('val', { ascending: false });
           expect(data[0].val).toBe(3);
      });

      it('should handle single()', async () => {
          const { data } = await client.from('rows').select().eq('val', 1).single();
          expect(data.val).toBe(1);

          const { error } = await client.from('rows').select().single(); // Too many
          expect(error).not.toBeNull();
      });

      it('should handle maybeSingle()', async () => {
          const { data } = await client.from('rows').select().eq('val', 99).maybeSingle();
          expect(data).toBeNull();
      });
  });

  describe('Auth', () => {
      it('should handle sign in and get user', async () => {
          const { data: { user } } = await client.auth.signInWithPassword({ email: 'test@test.com' });
          expect(user.email).toBe('test@test.com');

          const { data: { user: currentUser } } = await client.auth.getUser();
          expect(currentUser).toEqual(user);
      });

      it('should handle sign out', async () => {
          await client.auth.signInWithPassword({ email: 'test@test.com' });
          await client.auth.signOut();
          const { data: { user } } = await client.auth.getUser();
          expect(user).toBeNull();
      });
  });
});
