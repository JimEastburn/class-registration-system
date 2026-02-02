
import { vi } from 'vitest';

/**
 * A fake Supabase client for integration testing.
 * Stores data in-memory and mimics basic Supabase query syntax.
 */
export class SupabaseFake {
  private db: Record<string, any[]>;
  private authUser: any | null = null;
  
  constructor(initialData: Record<string, any[]> = {}) {
    this.db = JSON.parse(JSON.stringify(initialData)); // Deep copy to avoid reference issues
  }

  /* Auth Helpers */
  setAuthUser(user: any) {
    this.authUser = user;
  }

  auth = {
    getUser: async () => ({
      data: { user: this.authUser },
      error: this.authUser ? null : { message: 'Not authenticated' },
    }),
    signInWithPassword: async ({ email }: { email: string }) => {
        // Mock simple signin
        const user = { id: 'mock-user-id', email };
        this.authUser = user;
        return { data: { user }, error: null };
    },
    signOut: async () => {
        this.authUser = null;
        return { error: null };
    }
  };

  /* Query Builder Entry */
  from(table: string) {
    return new FakeQueryBuilder(this.db[table] || [], table, this);
  }

  /* Test Helpers */
  dump() {
    return this.db;
  }
}

class FakeQueryBuilder {
  private data: any[];
  private error: any | null = null;
  private tableName: string;
  private client: SupabaseFake;
  private selectQuery: string | null = null;
  private modifiers: ((data: any[]) => any[])[] = [];

  constructor(data: any[], tableName: string, client: SupabaseFake) {
    this.data = [...data];
    this.tableName = tableName;
    this.client = client;
  }

  select(query = '*') {
    this.selectQuery = query;
    return this;
  }

  insert(record: any) {
    // Basic insert mock
    // In a real implementation this would maintain state, but for simple mocks 
    // we often just want success or return data.
    // However, for integration tests, stateful is better.
    
    // Check if db table exists, if not create it
    if (!this.client['db'][this.tableName]) {
        this.client['db'][this.tableName] = [];
    }

    const records = Array.isArray(record) ? record : [record];
    const newRecords = records.map(r => ({ ...r, id: r.id || crypto.randomUUID(), created_at: new Date().toISOString() }));
    
    this.client['db'][this.tableName].push(...newRecords);
    
    // Update local data for subsequent selects in this chain (if valid)
    this.data = newRecords;
    
    return this;
  }

  update(updates: any) {
    this.modifiers.push((currentData) => {
        // This is tricky because updates usually depend on filters applied AFTER .update()
        // But Supabase chaining is .update().eq()
        // So we really need to delay execution until 'then'
        return currentData; 
    });
    // We store the updates to apply at the end
    this._pendingUpdate = updates;
    return this;
  }

  delete() {
    this._pendingDelete = true;
    return this;
  }

  eq(column: string, value: any) {
    this.modifiers.push(rows => rows.filter(row => row[column] === value));
    return this;
  }
  
  neq(column: string, value: any) {
    this.modifiers.push(rows => rows.filter(row => row[column] !== value));
    return this;
  }

  in(column: string, values: any[]) {
    this.modifiers.push(rows => rows.filter(row => values.includes(row[column])));
    return this;
  }

  gt(column: string, value: any) {
     this.modifiers.push(rows => rows.filter(row => row[column] > value));
     return this;
  }

  gte(column: string, value: any) {
     this.modifiers.push(rows => rows.filter(row => row[column] >= value));
     return this;
  }
  
  lt(column: string, value: any) {
     this.modifiers.push(rows => rows.filter(row => row[column] < value));
     return this;
  }

  lte(column: string, value: any) {
    this.modifiers.push(rows => rows.filter(row => row[column] <= value));
    return this;
  }

  ilike(column: string, pattern: string) {
     const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
     this.modifiers.push(rows => rows.filter(row => regex.test(row[column])));
     return this;
  }

  or(filterStr: string) {
      // Very basic implementation of OR, simplistic parsing
      // Assuming 'col.ilike.val,col2.eq.val' for now only as per usage in classes.ts
      // In reality Supabase OR syntax is complex. 
      // We will just return everything for now to avoid breaking tests if OR is complex
      // Or simple filter if we can.
      return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.modifiers.push(rows => [...rows].sort((a, b) => {
        if (a[column] < b[column]) return ascending ? -1 : 1;
        if (a[column] > b[column]) return ascending ? 1 : -1;
        return 0;
    }));
    return this;
  }

  limit(count: number) {
    this.modifiers.push(rows => rows.slice(0, count));
    return this;
  }

  single() {
    this.modifiers.push(rows => {
        if (rows.length === 0) throw new Error('JSON object requested, multiple (or no) rows returned');
        if (rows.length > 1) throw new Error('JSON object requested, multiple (or no) rows returned');
        return rows[0];
    });
    return this;
  }

  maybeSingle() {
    this.modifiers.push(rows => {
        if (rows.length === 0) return null;
        if (rows.length > 1) throw new Error('JSON object requested, multiple rows returned');
        return rows[0];
    });
    return this;
  }

  // Private state for mutations
  private _pendingUpdate: any = null;
  private _pendingDelete: boolean = false;

  then(resolve: (result: { data: any, error: any, count?: number }) => void, reject: (err: any) => void) {
      setTimeout(() => {
          try {
              let result = this.data;
              
              // 1. Filter finding the rows to operate on
              // Note: This logic assumes we are filtering strict equality for Filter modifiers
              // In reality, .update() applies to rows matching the filters.
              
              // If it's a read query, we just pipe through modifiers
              if (!this._pendingUpdate && !this._pendingDelete) {
                   for (const mod of this.modifiers) {
                       try {
                           result = mod(result);
                       } catch (e: any) {
                           if (e.message.includes('multiple (or no) rows')) {
                                resolve({ data: null, error: { message: 'PGRST116', code: 'PGRST116', details: e.message } });
                                return;
                           }
                           throw e;
                       }
                   }
                   resolve({ data: result, error: null });
                   return;
              }

              // Mutation Logic (Update/Delete)
              // We need to apply filters to find IDs of rows to mutate in the REAL store
              // Then mutate them.
              
              // Clone the full table data to apply filters to find matching indices/IDs
              let rowsToMatch = [...this.client['db'][this.tableName]];
              
              // Apply filters to find matches
              for (const mod of this.modifiers) {
                  rowsToMatch = mod(rowsToMatch);
              }
              
              const matchingIds = new Set(rowsToMatch.map(r => r.id));

              if (this._pendingDelete) {
                  this.client['db'][this.tableName] = this.client['db'][this.tableName].filter(r => !matchingIds.has(r.id));
                  resolve({ data: null, error: null });
              } else if (this._pendingUpdate) {
                  this.client['db'][this.tableName] = this.client['db'][this.tableName].map(r => {
                      if (matchingIds.has(r.id)) {
                          return { ...r, ...this._pendingUpdate };
                      }
                      return r;
                  });
                  resolve({ data: null, error: null });
              }

          } catch (e: any) {
              resolve({ data: null, error: { message: e.message } });
          }
      }, 0);
      
      // We return the promise interface implicitly by calling resolve/reject immediately (or via timeout)
      // But actually `then` needs to satisfy PromiseLike.
  }
}

// To make it awaitable, we can also wrap it in a real promise for clean tests if needed
// But typically Supabase QueryBuilder is "thenable"
