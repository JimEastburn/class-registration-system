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
      await client
        .from('users')
        .insert({ id: '1', name: 'Bob', status: 'active' });

      // Update
      const minimize = await client
        .from('users')
        .update({ status: 'inactive' })
        .eq('id', '1')
        .select();

      expect(minimize.error).toBeNull();

      // Verify
      const { data } = await client
        .from('users')
        .select()
        .eq('id', '1')
        .single();
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
      const { data } = await client
        .from('users')
        .select()
        .eq('id', '1')
        .maybeSingle();
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
      await client.from('rows').insert([{ val: 1 }, { val: 2 }, { val: 3 }]);
    });

    it('should limit results', async () => {
      const { data } = await client.from('rows').select().limit(2);
      expect(data).toHaveLength(2);
    });

    it('should order results', async () => {
      const { data } = await client
        .from('rows')
        .select()
        .order('val', { ascending: false });
      expect(data[0].val).toBe(3);
    });

    it('should handle single()', async () => {
      const { data } = await client.from('rows').select().eq('val', 1).single();
      expect(data.val).toBe(1);

      const { error } = await client.from('rows').select().single(); // Too many
      expect(error).not.toBeNull();
    });

    it('should handle maybeSingle()', async () => {
      const { data } = await client
        .from('rows')
        .select()
        .eq('val', 99)
        .maybeSingle();
      expect(data).toBeNull();
    });
  });

  describe('Count / Head Queries', () => {
    beforeEach(async () => {
      await client.from('items').insert([
        { id: '1', val: 10, name: 'A' },
        { id: '2', val: 20, name: 'B' },
        { id: '3', val: 30, name: 'C' },
      ]);
    });

    it('should return count when select uses count: exact, head: true', async () => {
      const { count, data, error } = await client
        .from('items')
        .select('*', { count: 'exact', head: true });

      expect(error).toBeNull();
      expect(count).toBe(3);
      expect(data).toBeNull();
    });

    it('should return filtered count with eq', async () => {
      const { count } = await client
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('val', 20);

      expect(count).toBe(1);
    });

    it('should return filtered count with in', async () => {
      const { count } = await client
        .from('items')
        .select('*', { count: 'exact', head: true })
        .in('val', [10, 30]);

      expect(count).toBe(2);
    });
  });

  /**
   * Mirrors the on_class_cancel_cascade_enrollments trigger from
   * 20260806120000_cancel_enrollments_with_class.sql: cancelling a class cancels
   * every active enrollment in it, whatever code path did the cancelling.
   */
  describe('Class cancellation cascade', () => {
    beforeEach(() => {
      client = new SupabaseFake({
        classes: [
          { id: 'class-1', name: 'Art 101', status: 'published', capacity: 2 },
          { id: 'class-2', name: 'Music 201', status: 'published', capacity: 2 },
        ],
        enrollments: [
          { id: 'e-1', class_id: 'class-1', status: 'confirmed' },
          { id: 'e-2', class_id: 'class-1', status: 'pending' },
          {
            id: 'e-3',
            class_id: 'class-1',
            status: 'waitlisted',
            waitlist_position: 1,
          },
          { id: 'e-4', class_id: 'class-1', status: 'cancelled' },
          { id: 'e-5', class_id: 'class-2', status: 'confirmed' },
        ],
      });
    });

    const statusOf = (id: string) =>
      client.db.enrollments.find((e) => e.id === id)?.status;

    it('cancels active enrollments when a class is cancelled', async () => {
      await client
        .from('classes')
        .update({ status: 'cancelled' })
        .eq('id', 'class-1');

      expect(statusOf('e-1')).toBe('cancelled');
      expect(statusOf('e-2')).toBe('cancelled');
      expect(statusOf('e-3')).toBe('cancelled');
    });

    it('nulls waitlist_position on the cancelled waitlist entries', async () => {
      await client
        .from('classes')
        .update({ status: 'cancelled' })
        .eq('id', 'class-1');

      expect(
        client.db.enrollments.find((e) => e.id === 'e-3')!.waitlist_position
      ).toBeNull();
    });

    it('leaves other classes untouched', async () => {
      await client
        .from('classes')
        .update({ status: 'cancelled' })
        .eq('id', 'class-1');

      expect(statusOf('e-5')).toBe('confirmed');
    });

    it('does not cascade when the update leaves the status alone', async () => {
      await client
        .from('classes')
        .update({ name: 'Art 102' })
        .eq('id', 'class-1');

      expect(statusOf('e-1')).toBe('confirmed');
    });

    it('does not cascade when the class was already cancelled', async () => {
      // Matches the trigger's WHEN clause: OLD.status IS DISTINCT FROM
      // 'cancelled'. Re-saving a cancelled class must not re-run the cascade.
      client.db.classes.find((c) => c.id === 'class-1')!.status = 'cancelled';
      client.db.enrollments.find((e) => e.id === 'e-1')!.status = 'confirmed';

      await client
        .from('classes')
        .update({ status: 'cancelled' })
        .eq('id', 'class-1');

      expect(statusOf('e-1')).toBe('confirmed');
    });

    it('refuses to enroll into a cancelled class via the enroll_student RPC', async () => {
      client.db.classes.find((c) => c.id === 'class-2')!.status = 'cancelled';

      const { data, error } = await client.rpc('enroll_student', {
        p_student_id: 'fm-new',
        p_class_id: 'class-2',
      });

      expect(data).toBeNull();
      expect((error as { hint?: string } | null)?.hint).toBe(
        'EN_CLASS_CANCELLED'
      );
    });

    it('promotes nobody from a cancelled class', async () => {
      client.db.classes.find((c) => c.id === 'class-2')!.status = 'cancelled';
      client.db.enrollments.push({
        id: 'e-6',
        class_id: 'class-2',
        status: 'waitlisted',
        waitlist_position: 1,
      });

      const { data } = await client.rpc('promote_waitlist_one', {
        p_class_id: 'class-2',
      });

      expect(data).toBeNull();
      expect(statusOf('e-6')).toBe('waitlisted');
    });
  });

  describe('Relational Joins', () => {
    beforeEach(async () => {
      // Seed related tables
      client = new SupabaseFake({
        profiles: [
          { id: 'teacher-1', first_name: 'Jane', last_name: 'Teacher', role: 'teacher' },
        ],
        classes: [
          { id: 'class-1', name: 'Art 101', price: 30, teacher_id: 'teacher-1', day: 'Monday', block: 'Block 1', start_date: '2026-03-01' },
          { id: 'class-2', name: 'Music 201', price: 50, teacher_id: 'teacher-1', day: 'Tuesday', block: 'Block 2', start_date: '2026-04-01' },
        ],
        enrollments: [
          { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
          { id: 'enr-2', student_id: 'fm-1', class_id: 'class-2', status: 'pending' },
        ],
      });
    });

    it('should resolve nested select with table(columns) syntax', async () => {
      const { data, error } = await client
        .from('enrollments')
        .select('id, student_id, classes(name, price)')
        .eq('id', 'enr-1');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('enr-1');
      expect(data[0].classes).toEqual({ name: 'Art 101', price: 30 });
    });

    it('should resolve deeply nested joins like classes(profiles(first_name, last_name))', async () => {
      const { data } = await client
        .from('enrollments')
        .select('id, classes(id, name, profiles(first_name, last_name))')
        .eq('id', 'enr-1');

      expect(data).toHaveLength(1);
      expect(data[0].classes.profiles).toEqual({ first_name: 'Jane', last_name: 'Teacher' });
    });

    it('should set joined data to null when no FK match', async () => {
      // Add enrollment with no matching class
      await client.from('enrollments').insert({ id: 'enr-orphan', student_id: 'fm-1', class_id: 'nonexistent', status: 'pending' });

      const { data } = await client
        .from('enrollments')
        .select('id, classes(name)')
        .eq('id', 'enr-orphan');

      expect(data).toHaveLength(1);
      expect(data[0].classes).toBeNull();
    });

    it('should filter with !inner join syntax (exclude rows with no match)', async () => {
      await client.from('enrollments').insert({ id: 'enr-orphan', student_id: 'fm-1', class_id: 'nonexistent', status: 'confirmed' });

      const { data } = await client
        .from('enrollments')
        .select('id, classes!inner(name)')
        .eq('status', 'confirmed');

      // Should return enr-1 but NOT enr-orphan (no matching class)
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('enr-1');
    });

    it('should support gte filter on joined columns like classes.start_date', async () => {
      const { count } = await client
        .from('enrollments')
        .select('id, classes!inner(start_date)', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        .gte('classes.start_date', '2026-02-28');

      // enr-1 has class-1 with start_date 2026-03-01 which is >= 2026-02-28
      expect(count).toBe(1);
    });
  });

  describe('Auth', () => {
    it('should handle sign in and get user', async () => {
      const {
        data: { user },
      } = await client.auth.signInWithPassword({ email: 'test@test.com' });
      expect(user.email).toBe('test@test.com');

      const {
        data: { user: currentUser },
      } = await client.auth.getUser();
      expect(currentUser).toEqual(user);
    });

    it('should handle sign out', async () => {
      await client.auth.signInWithPassword({ email: 'test@test.com' });
      await client.auth.signOut();
      const {
        data: { user },
      } = await client.auth.getUser();
      expect(user).toBeNull();
    });

    it('should handle signUp and return a user with generated id', async () => {
      const { data, error } = await client.auth.signUp({
        email: 'new@test.com',
        password: 'password123',
        options: { data: { first_name: 'New', last_name: 'User' } },
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('new@test.com');
      expect(data.user.id).toBeDefined();
    });

    it('should make signUp user available via getUser', async () => {
      await client.auth.signUp({ email: 'signup@test.com', password: 'pw' });

      const {
        data: { user },
      } = await client.auth.getUser();
      expect(user).not.toBeNull();
      expect(user.email).toBe('signup@test.com');
    });

    it('should handle updateUser by merging metadata', async () => {
      await client.auth.signInWithPassword({ email: 'update@test.com' });

      const { data, error } = await client.auth.updateUser({
        data: { first_name: 'Updated', phone: '555-1234' },
      });

      expect(error).toBeNull();
      expect(data.user.email).toBe('update@test.com');

      // Verify merged via getUser
      const {
        data: { user },
      } = await client.auth.getUser();
      expect(user.data).toMatchObject({ first_name: 'Updated', phone: '555-1234' });
    });

    it('should return error from updateUser when not signed in', async () => {
      const { data, error } = await client.auth.updateUser({
        data: { first_name: 'Nobody' },
      });

      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
    });
  });
});
