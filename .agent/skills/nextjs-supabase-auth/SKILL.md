---
name: nextjs-supabase-auth
description: 'Expert integration of Supabase Auth with Next.js App Router. Use when: supabase auth next, authentication next.js, login supabase, auth middleware, protected route, RBAC.'
---

# Next.js + Supabase Auth

Integrate Supabase Auth with Next.js App Router using `@supabase/ssr`. This skill covers client setup, middleware-based route protection, RBAC, and common pitfalls.

## Core Principles

1. Use `@supabase/ssr` (not `@supabase/auth-helpers-nextjs`, which is deprecated)
2. Always use `getUser()` for server-side auth checks (never `getSession()` alone)
3. Handle tokens in middleware for protected routes
4. Never expose auth tokens to client unnecessarily
5. Use Server Actions for auth operations when possible
6. Understand the cookie-based session flow

## Supabase Client Setup

Three contexts require different client factories:

### Browser Client (Client Components)

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (Server Components, Server Actions, Route Handlers)

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore
            // if middleware is refreshing sessions.
          }
        },
      },
    }
  );
}
```

### Admin Client (Webhooks, Service-Role Operations)

```typescript
// lib/supabase/admin.ts
export async function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ Never expose this to client
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
```

## `getUser()` vs `getSession()`

| Method | Security | Use When |
|--------|----------|----------|
| `getUser()` | ✅ Contacts Supabase auth server, validates JWT | **Always** for server-side protection |
| `getSession()` | ⚠️ Reads JWT from cookie without validation | Only for non-critical client-side UI hints |

```typescript
// ✅ CORRECT — Server-side auth check
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');

// ❌ WRONG — JWT could be tampered with
const { data: { session } } = await supabase.auth.getSession();
if (!session) redirect('/login'); // DO NOT USE FOR AUTHORIZATION
```

**Rule**: Any code that makes access-control decisions MUST use `getUser()`.

## Auth Middleware

The middleware refreshes sessions and enforces route-level RBAC:

```typescript
// middleware.ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### RBAC Route Protection Pattern

Map route prefixes to allowed roles:

```typescript
const ROUTE_ROLE_MAP: Record<string, UserRole[]> = {
  '/parent': ['parent', 'teacher', 'admin', 'class_scheduler', 'super_admin'],
  '/teacher': ['teacher', 'super_admin'],
  '/student': ['student'],
  '/admin': ['admin', 'super_admin'],
  '/class-scheduler': ['class_scheduler', 'super_admin'],
};
```

Inside the middleware `updateSession` function:
1. Create Supabase client with request cookies
2. Call `getUser()` — this also refreshes the session
3. Allow public paths through
4. Redirect unauthenticated users to `/login` with `?redirectTo=` param
5. Fetch user profile for role
6. Check `ROUTE_ROLE_MAP` for access
7. Redirect unauthorized users to their default dashboard

## Auth Callback Route

Handle OAuth and magic link callbacks:

```typescript
// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

## Self-Healing Profile Pattern

Ensure the `profiles` table stays in sync with `auth.users`:

```sql
-- Database trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'parent');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

In application code, handle the edge case where a profile is missing:

```typescript
// If profile doesn't exist but user does, create it
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

if (!profile) {
  // Self-heal: create missing profile
  await supabase.from('profiles').insert({
    id: user.id,
    email: user.email!,
    role: 'parent',
  });
}
```

## Anti-Patterns

### ❌ Using `getSession()` for Authorization

`getSession()` reads the JWT from the cookie without server-side validation. A tampered JWT will pass this check. Always use `getUser()` for access-control decisions.

### ❌ Client-Side Auth State Without Listener

```typescript
// ❌ WRONG — stale auth state
const session = supabase.auth.getSession();

// ✅ CORRECT — reactive auth state
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setUser(session?.user ?? null);
    }
  );
  return () => subscription.unsubscribe();
}, []);
```

### ❌ Storing Tokens Manually

Never extract and store JWTs in localStorage or custom cookies. `@supabase/ssr` manages cookie-based sessions automatically.

### ❌ Logic Between `createServerClient` and `getUser()`

In middleware, avoid any logic between creating the Supabase client and calling `getUser()`. This can cause session refresh failures and random logouts.

### ❌ Not Returning the Supabase Response Object

In middleware, always return the response object from the Supabase client setup. Creating a new `NextResponse.next()` without copying cookies will break session state.
