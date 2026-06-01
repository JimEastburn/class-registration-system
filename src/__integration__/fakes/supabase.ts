
/**
 * A fake Supabase client for integration testing.
 * Stores data in-memory and mimics basic Supabase query syntax.
 *
 * Supports:
 * - Basic CRUD (insert, update, delete, select)
 * - Filtering (eq, neq, in, gt, gte, lt, lte, ilike, or)
 * - Modifiers (order, limit, single, maybeSingle)
 * - Count/head queries: select('*', { count: 'exact', head: true })
 * - Relational joins: select('id, classes(name, price)')
 * - Inner joins: select('id, classes!inner(name)')
 * - Dot-path filters on joins: .gte('classes.start_date', '2026-01-01')
 */

/**
 * Build an error matching Supabase's RPC error shape (message, code, hint).
 * RPC handlers throw this to simulate Postgres RAISE EXCEPTION ... USING HINT.
 */
function makeRpcError(message: string, hint: string, code = 'P0001'): Error {
  const err = new Error(message) as Error & { hint?: string; code?: string };
  err.hint = hint;
  err.code = code;
  return err;
}

/** Naive singularizer for FK column derivation: classes→class, profiles→profile */
function singularize(tableName: string): string {
  if (tableName.endsWith('ies')) return tableName.slice(0, -3) + 'y';
  if (tableName.endsWith('sses')) return tableName.slice(0, -2);
  if (tableName.endsWith('ses')) return tableName.slice(0, -2);
  if (tableName.endsWith('s')) return tableName.slice(0, -1);
  return tableName;
}
export class SupabaseFake {
  // Exposed for FakeQueryBuilder to access related tables
  db: Record<string, Record<string, unknown>[]>;
  private authUser: Record<string, unknown> | null = null;

  constructor(initialData: Record<string, Record<string, unknown>[]> = {}) {
    this.db = JSON.parse(JSON.stringify(initialData));
    this.registerBuiltinRpcs();
  }

  /**
   * Built-in RPC handlers that mirror real database functions, so action tests
   * that exercise those functions work without per-test wiring.
   */
  private registerBuiltinRpcs() {
    // Mirrors public.enroll_student(): capacity-aware, waitlist-on-full insert.
    this.setRpcHandler('enroll_student', (args) => {
      const studentId = args.p_student_id as string;
      const classId = args.p_class_id as string;
      const cls = (this.db['classes'] || []).find((c) => c.id === classId);
      if (!cls) return null;
      if (!this.db['enrollments']) this.db['enrollments'] = [];
      const enrollments = this.db['enrollments'];
      const seatsTaken = enrollments.filter(
        (e) =>
          e.class_id === classId &&
          (e.status === 'confirmed' || e.status === 'pending')
      ).length;
      let status = 'pending';
      let waitlistPosition: number | null = null;
      if (seatsTaken >= (cls.capacity as number)) {
        status = 'waitlisted';
        waitlistPosition =
          enrollments.filter(
            (e) => e.class_id === classId && e.status === 'waitlisted'
          ).length + 1;
      }
      // Mirror ON CONFLICT (student_id, class_id): reactivate a cancelled row,
      // or reject an active duplicate.
      const existing = enrollments.find(
        (e) => e.student_id === studentId && e.class_id === classId
      );
      if (existing) {
        if (existing.status !== 'cancelled') return null;
        existing.status = status;
        existing.waitlist_position = waitlistPosition;
        existing.updated_at = new Date().toISOString();
        return existing;
      }
      const row = {
        id: crypto.randomUUID(),
        student_id: studentId,
        class_id: classId,
        status,
        waitlist_position: waitlistPosition,
        deposit_paid: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      enrollments.push(row);
      return row;
    });

    // Mirrors public.promote_waitlist_one(): atomic, capacity-aware waitlist
    // promotion. Returns the promoted row (mutated in place) or null when
    // there is no room or no one waitlisted.
    this.setRpcHandler('promote_waitlist_one', (args) => {
      const classId = args.p_class_id as string;
      const cls = (this.db['classes'] || []).find((c) => c.id === classId);
      if (!cls) return null;
      if (!this.db['enrollments']) this.db['enrollments'] = [];
      const enrollments = this.db['enrollments'];
      const seatsTaken = enrollments.filter(
        (e) =>
          e.class_id === classId &&
          (e.status === 'confirmed' || e.status === 'pending')
      ).length;
      if (seatsTaken >= (cls.capacity as number)) return null;
      // Lowest waitlist_position, tiebreak by created_at.
      const waitlistedForClass = enrollments
        .filter((e) => e.class_id === classId && e.status === 'waitlisted')
        .sort((a, b) => {
          const pa = (a.waitlist_position as number | null) ?? Infinity;
          const pb = (b.waitlist_position as number | null) ?? Infinity;
          if (pa !== pb) return pa - pb;
          return String(a.created_at ?? '').localeCompare(
            String(b.created_at ?? '')
          );
        });
      const target = waitlistedForClass[0];
      if (!target) return null;
      const oldPosition = target.waitlist_position as number | null;
      target.status = 'pending';
      target.waitlist_position = null;
      target.updated_at = new Date().toISOString();
      // Shift remaining waitlisted positions down by one. Bump updated_at so
      // audit trails reflect the shift (mirrors the SQL function).
      if (oldPosition != null) {
        const now = new Date().toISOString();
        for (const e of enrollments) {
          if (e.class_id === classId && e.status === 'waitlisted') {
            const pos = e.waitlist_position as number | null;
            if (pos != null && pos > oldPosition) {
              e.waitlist_position = pos - 1;
              e.updated_at = now;
            }
          }
        }
      }
      return target;
    });

    // Mirrors public.add_to_waitlist(): atomic, capacity-aware, gated by class
    // publication and teacher blocks. Throws (translated to error response by
    // rpc()) for the rejected paths; returns the inserted/reactivated row on
    // success. See migration 20260523200000_atomic_add_to_waitlist.sql.
    this.setRpcHandler('add_to_waitlist', (args) => {
      const classId = args.p_class_id as string;
      const studentId = args.p_student_id as string;

      const cls = (this.db['classes'] || []).find((c) => c.id === classId);
      if (!cls) throw makeRpcError('Class not found', 'WL_CLASS_NOT_FOUND');

      if (cls.status !== 'published') {
        throw makeRpcError(
          'Class is not available for enrollment',
          'WL_NOT_PUBLISHED'
        );
      }

      const teacherId = cls.teacher_id as string | null;
      const blocked = (this.db['class_blocks'] || []).some(
        (b) => b.teacher_id === teacherId && b.student_id === studentId
      );
      if (blocked) {
        throw makeRpcError(
          "This student has been blocked from the teacher's classes",
          'WL_BLOCKED'
        );
      }

      if (!this.db['enrollments']) this.db['enrollments'] = [];
      const enrollments = this.db['enrollments'];

      const seatsTaken = enrollments.filter(
        (e) =>
          e.class_id === classId &&
          (e.status === 'confirmed' || e.status === 'pending')
      ).length;

      if (seatsTaken < (cls.capacity as number)) {
        throw makeRpcError(
          'Class has open seats — use enroll_student instead',
          'WL_SEATS_OPEN'
        );
      }

      const existing = enrollments.find(
        (e) => e.student_id === studentId && e.class_id === classId
      );
      if (existing && existing.status !== 'cancelled') {
        if (existing.status === 'waitlisted') {
          throw makeRpcError(
            'Student is already on the waitlist',
            'WL_DUPLICATE_WAITLISTED'
          );
        }
        throw makeRpcError(
          'Student is already enrolled in this class',
          'WL_DUPLICATE_ACTIVE'
        );
      }

      const maxPos = enrollments
        .filter((e) => e.class_id === classId && e.status === 'waitlisted')
        .reduce(
          (acc, e) => Math.max(acc, (e.waitlist_position as number) ?? 0),
          0
        );
      const position = maxPos + 1;

      const now = new Date().toISOString();
      if (existing) {
        existing.status = 'waitlisted';
        existing.waitlist_position = position;
        existing.updated_at = now;
        return existing;
      }
      const row = {
        id: crypto.randomUUID(),
        student_id: studentId,
        class_id: classId,
        status: 'waitlisted',
        waitlist_position: position,
        deposit_paid: false,
        created_at: now,
        updated_at: now,
      };
      enrollments.push(row);
      return row;
    });
  }

  /* Auth Helpers */
  setAuthUser(user: Record<string, unknown>) {
    this.authUser = user;
  }

  auth = {
    getUser: async () => ({
      data: { user: this.authUser },
      error: this.authUser ? null : { message: 'Not authenticated' },
    }),
    signInWithPassword: async ({ email }: { email: string }) => {
      const user = { id: 'mock-user-id', email };
      this.authUser = user;
      return { data: { user }, error: null };
    },
    signUp: async ({ email, options, ..._ }: { email: string; password?: string; options?: Record<string, unknown> }) => {
      const user: Record<string, unknown> = { id: crypto.randomUUID(), email };
      if (options?.data) {
        user.user_metadata = options.data;
      }
      this.authUser = user;
      return { data: { user }, error: null };
    },
    updateUser: async (updates: Record<string, unknown>) => {
      if (!this.authUser) {
        return { data: { user: null }, error: { message: 'Not authenticated' } };
      }
      this.authUser = { ...this.authUser, ...updates };
      return { data: { user: this.authUser }, error: null };
    },
    signOut: async () => {
      this.authUser = null;
      return { error: null };
    },
  };

  /* Query Builder Entry */
  from(table: string) {
    return new FakeQueryBuilder(this.db[table] || [], table, this);
  }

  /* RPC stubs — tests register handlers per function name */
  private rpcHandlers = new Map<string, (args: Record<string, unknown>) => unknown>();

  setRpcHandler(fn: string, handler: (args: Record<string, unknown>) => unknown) {
    this.rpcHandlers.set(fn, handler);
  }

  async rpc(fn: string, args: Record<string, unknown> = {}) {
    const handler = this.rpcHandlers.get(fn);
    if (!handler) return { data: null, error: null };
    try {
      const data = handler(args);
      return { data, error: null };
    } catch (e: unknown) {
      const err = e as Error & { hint?: string; code?: string; details?: string };
      return {
        data: null,
        error: {
          message: err.message,
          code: err.code ?? 'P0001',
          hint: err.hint ?? null,
          details: err.details ?? null,
        },
      };
    }
  }

  /* Test Helpers */
  dump() {
    return this.db;
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface SelectOptions {
  count?: 'exact';
  head?: boolean;
}

/** Parsed relation from select string, e.g. `classes!inner(name, price)` or `student:family_members(id)` */
interface ParsedRelation {
  /** The table name (e.g. "classes", "family_members") */
  table: string;
  /** Optional alias (e.g. "student" from `student:family_members(...)`) */
  alias: string;
  /** Column(s) requested from the related table */
  columns: string;
  /** Whether !inner join semantics apply */
  inner: boolean;
  /** Optional FK hint (e.g. "family_members_parent_id_fkey" from `profiles!family_members_parent_id_fkey(...)`) */
  fkHint: string | null;
}

// ─── Query Builder ──────────────────────────────────────────────────────────

class FakeQueryBuilder {
  private data: Record<string, unknown>[];
  private tableName: string;
  private client: SupabaseFake;
  private selectQuery: string | null = null;
  private selectOpts: SelectOptions = {};
  private modifiers: ((data: Record<string, unknown>[]) => Record<string, unknown>[])[] = [];
  private _pendingUpdate: Record<string, unknown> | null = null;
  private _pendingDelete = false;
  private _singleMode: 'single' | 'maybeSingle' | null = null;

  constructor(
    data: Record<string, unknown>[],
    tableName: string,
    client: SupabaseFake,
  ) {
    this.data = [...data];
    this.tableName = tableName;
    this.client = client;
  }

  select(query = '*', opts: SelectOptions = {}) {
    this.selectQuery = query;
    this.selectOpts = opts;
    return this;
  }

  insert(record: Record<string, unknown> | Record<string, unknown>[]) {
    if (!this.client.db[this.tableName]) {
      this.client.db[this.tableName] = [];
    }

    const records = Array.isArray(record) ? record : [record];
    const newRecords = records.map((r) => ({
      ...r,
      id: r.id ?? crypto.randomUUID(),
      created_at: (r.created_at as string) ?? new Date().toISOString(),
    }));

    this.client.db[this.tableName].push(...newRecords);
    this.data = newRecords;
    return this;
  }

  upsert(
    record: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string },
  ) {
    if (!this.client.db[this.tableName]) {
      this.client.db[this.tableName] = [];
    }

    const conflictKey = opts?.onConflict || 'id';
    const records = Array.isArray(record) ? record : [record];

    for (const r of records) {
      const existing = this.client.db[this.tableName].find(
        (row) => row[conflictKey] === r[conflictKey],
      );
      if (existing) {
        Object.assign(existing, r);
      } else {
        const newRecord = {
          ...r,
          id: r.id ?? crypto.randomUUID(),
          created_at: (r.created_at as string) ?? new Date().toISOString(),
        };
        this.client.db[this.tableName].push(newRecord);
      }
    }

    this.data = records;
    return this;
  }

  update(updates: Record<string, unknown>) {
    this._pendingUpdate = updates;
    return this;
  }

  delete() {
    this._pendingDelete = true;
    return this;
  }

  // ── Filter methods ──────────────────────────────────────────────────────

  eq(column: string, value: unknown) {
    if (column.includes('.')) {
      this._addDotPathFilter(column, (v) => v === value);
    } else {
      this.modifiers.push((rows) => rows.filter((row) => row[column] === value));
    }
    return this;
  }

  neq(column: string, value: unknown) {
    this.modifiers.push((rows) => rows.filter((row) => row[column] !== value));
    return this;
  }

  in(column: string, values: unknown[]) {
    this.modifiers.push((rows) =>
      rows.filter((row) => values.includes(row[column])),
    );
    return this;
  }

  gt(column: string, value: unknown) {
    this.modifiers.push((rows) =>
      rows.filter((row) => (row[column] as number) > (value as number)),
    );
    return this;
  }

  gte(column: string, value: unknown) {
    if (column.includes('.')) {
      this._addDotPathFilter(column, (v) => String(v) >= String(value));
    } else {
      this.modifiers.push((rows) =>
        rows.filter((row) => (row[column] as number) >= (value as number)),
      );
    }
    return this;
  }

  lt(column: string, value: unknown) {
    this.modifiers.push((rows) =>
      rows.filter((row) => (row[column] as number) < (value as number)),
    );
    return this;
  }

  lte(column: string, value: unknown) {
    this.modifiers.push((rows) =>
      rows.filter((row) => (row[column] as number) <= (value as number)),
    );
    return this;
  }

  is(column: string, value: unknown) {
    this.modifiers.push((rows) =>
      rows.filter((row) => row[column] === value),
    );
    return this;
  }

  ilike(column: string, pattern: string) {
    const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
    this.modifiers.push((rows) =>
      rows.filter((row) => regex.test(row[column] as string)),
    );
    return this;
  }

  or(_filterStr: string) {
    // Basic no-op; returns all rows. Sufficient for current test needs.
    return this;
  }

  // ── Modifier methods ──────────────────────────────────────────────────

  order(column: string, { ascending = true } = {}) {
    this.modifiers.push((rows) =>
      [...rows].sort((a, b) => {
        if ((a[column] as number) < (b[column] as number)) return ascending ? -1 : 1;
        if ((a[column] as number) > (b[column] as number)) return ascending ? 1 : -1;
        return 0;
      }),
    );
    return this;
  }

  limit(count: number) {
    this.modifiers.push((rows) => rows.slice(0, count));
    return this;
  }

  range(from: number, to: number) {
    this.modifiers.push((rows) => rows.slice(from, to + 1));
    return this;
  }

  single() {
    this._singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this._singleMode = 'maybeSingle';
    return this;
  }

  // ── Thenable (makes query awaitable) ──────────────────────────────────

  then(
    resolve: (result: { data: unknown; error: unknown; count?: number }) => void,
    _reject?: (err: unknown) => void,
  ) {
    setTimeout(() => {
      try {
        let result: Record<string, unknown>[] = this.data;

        // ── Mutations ────────────────────────────────────────────────
        if (this._pendingUpdate || this._pendingDelete) {
          let rowsToMatch = [...(this.client.db[this.tableName] || [])];
          for (const mod of this.modifiers) {
            rowsToMatch = mod(rowsToMatch);
          }
          const matchingIds = new Set(rowsToMatch.map((r) => r.id));

          if (this._pendingDelete) {
            this.client.db[this.tableName] = (
              this.client.db[this.tableName] || []
            ).filter((r) => !matchingIds.has(r.id));
            resolve({ data: null, error: null });
          } else if (this._pendingUpdate) {
            this.client.db[this.tableName] = (
              this.client.db[this.tableName] || []
            ).map((r) =>
              matchingIds.has(r.id) ? { ...r, ...this._pendingUpdate } : r,
            );

            // If .select() was chained after .update(), return the updated rows
            if (this.selectQuery !== null) {
              const updatedRows = (this.client.db[this.tableName] || [])
                .filter((r) => matchingIds.has(r.id));
              // Apply single/maybeSingle if they were chained
              if (this._singleMode === 'single') {
                if (updatedRows.length !== 1) {
                  resolve({ data: null, error: { message: 'PGRST116', code: 'PGRST116' } });
                  return;
                }
                resolve({ data: updatedRows[0], error: null });
              } else if (this._singleMode === 'maybeSingle') {
                resolve({ data: updatedRows[0] || null, error: null });
              } else {
                resolve({ data: updatedRows, error: null });
              }
            } else {
              resolve({ data: null, error: null });
            }
          }
          return;
        }

        // ── Read path ────────────────────────────────────────────────

        // Parse relational joins from select query
        const relations = this._parseRelations(this.selectQuery || '*');

        // Apply non-join modifiers (eq, in, etc.)
        for (const mod of this.modifiers) {
          try {
            result = mod(result);
          } catch (e: unknown) {
            const msg = (e as Error).message;
            if (msg.includes('multiple (or no) rows')) {
              resolve({
                data: null,
                error: { message: 'PGRST116', code: 'PGRST116', details: msg },
              });
              return;
            }
            throw e;
          }
        }

        // Resolve relational joins
        if (relations.length > 0) {
          result = this._resolveRelations(result, relations);
        }

        // Count/head mode
        if (this.selectOpts.head) {
          resolve({
            data: null,
            error: null,
            count: Array.isArray(result) ? result.length : 0,
          });
          return;
        }

        // Apply single/maybeSingle
        if (this._singleMode === 'single') {
          const rows = Array.isArray(result) ? result : [result];
          if (rows.length !== 1) {
            resolve({
              data: null,
              error: { message: 'PGRST116', code: 'PGRST116', details: 'JSON object requested, multiple (or no) rows returned' },
            });
            return;
          }
          resolve({ data: rows[0], error: null });
          return;
        }
        if (this._singleMode === 'maybeSingle') {
          const rows = Array.isArray(result) ? result : [result];
          if (rows.length > 1) {
            resolve({
              data: null,
              error: { message: 'PGRST116', code: 'PGRST116', details: 'JSON object requested, multiple rows returned' },
            });
            return;
          }
          resolve({ data: rows[0] || null, error: null });
          return;
        }

        const response: { data: unknown; error: null; count?: number } = { data: result, error: null };
        if (this.selectOpts.count === 'exact') {
          response.count = Array.isArray(result) ? result.length : 0;
        }
        resolve(response);
      } catch (e: unknown) {
        resolve({ data: null, error: { message: (e as Error).message } });
      }
    }, 0);
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /**
   * Parse select string for relational patterns like `classes(name, price)` or
   * `classes!inner(name, profiles(first_name, last_name))`.
   */
  private _parseRelations(query: string): ParsedRelation[] {
    const relations: ParsedRelation[] = [];
    // Match: alias:tableName!inner(columns) or tableName(columns) or tableName!fk_hint(columns)
    // Columns can include nested relations, so we need balanced paren matching
    const regex = /(?:(\w+):)?(\w+)(!\w+)?\(/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(query)) !== null) {
      const alias = match[1] || match[2]; // use alias if provided, otherwise table name
      const table = match[2];
      const inner = match[3] === '!inner';
      const fkHint = match[3] ? match[3].slice(1) : null;
      const startIdx = regex.lastIndex; // position after '('

      // Find the matching closing paren (handle nesting)
      let depth = 1;
      let endIdx = startIdx;
      while (depth > 0 && endIdx < query.length) {
        if (query[endIdx] === '(') depth++;
        if (query[endIdx] === ')') depth--;
        if (depth > 0) endIdx++;
      }

      const columns = query.substring(startIdx, endIdx);
      relations.push({ table, alias, columns, inner, fkHint });
    }

    return relations;
  }

  /**
   * For each row, resolve FK relations by looking up `<table>_id` in the row
   * and finding the matching record in the related table.
   */
  private _resolveRelations(
    rows: Record<string, unknown>[],
    relations: ParsedRelation[],
  ): Record<string, unknown>[] {
    let result = rows.map((row) => {
      const enriched = { ...row };
      for (const rel of relations) {
        const relatedTable = this.client.db[rel.table] || [];

        // 1. Standard FK: row.<singularTable>_id → related.id
        const standardFk = row[`${singularize(rel.table)}_id`] ?? row[`${rel.table}_id`];
        let related = standardFk != null
          ? relatedTable.find((r) => r.id === standardFk)
          : null;

        // 2. Fallback: try matching via <singularParent>_id on the child table
        if (!related && row.id != null) {
          const singularParent = singularize(this.tableName);
          related = relatedTable.find((r) => r[`${singularParent}_id`] === row.id) ?? null;
        }

        // 3. Broader scan: try any _id column on the row that matches a record in the related table
        //    This handles cases like classes.teacher_id → profiles.id
        if (!related) {
          for (const [key, val] of Object.entries(row)) {
            if (key.endsWith('_id') && val != null) {
              const match = relatedTable.find((r) => r.id === val);
              if (match) {
                related = match;
                break;
              }
            }
          }
        }

        if (related) {
          // Pick only requested columns, resolving nested relations
          const nestedRelations = this._parseRelations(rel.columns);
          const requestedCols = rel.columns
            .replace(/\w+(!inner)?\([^)]*\)/g, '') // remove nested relation patterns
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);

          const picked: Record<string, unknown> = {};
          for (const col of requestedCols) {
            picked[col] = related[col];
          }

          // Resolve nested relations recursively
          if (nestedRelations.length > 0) {
            const resolved = this._resolveRelations([related], nestedRelations);
            for (const nr of nestedRelations) {
              picked[nr.alias] = resolved[0]?.[nr.alias] ?? null;
            }
          }

          enriched[rel.alias] = picked;
        } else {
          enriched[rel.alias] = null;
        }
      }
      return enriched;
    });

    // Filter out rows with null joins when !inner
    for (const rel of relations) {
      if (rel.inner) {
        result = result.filter((row) => row[rel.alias] != null);
      }
    }

    return result;
  }

  /**
   * Add a filter for dot-path column references like `classes.start_date`.
   * These filter on already-resolved join data.
   */
  private _addDotPathFilter(dotPath: string, predicate: (val: unknown) => boolean) {
    const [table, column] = dotPath.split('.');
    this.modifiers.push((rows) =>
      rows.filter((row) => {
        // The join data might not be resolved yet at filter time,
        // so look it up directly from the FK
        const fk = row[`${singularize(table)}_id`] ?? row[`${table}_id`];
        const relatedTable = this.client.db[table] || [];
        const related = relatedTable.find((r) => r.id === fk);
        if (!related) return false;
        return predicate(related[column]);
      }),
    );
  }
}
