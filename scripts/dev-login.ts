/**
 * Dev login helper
 *
 * Mints a one-time magic link so a browser can sign in to the local dev server
 * without anyone typing a password. Useful for testing pages behind auth
 * (/parent/*, /teacher/*, /admin/*) instead of building throwaway pages.
 *
 * Usage:
 *   npm run dev:login                              # link for the dev parent user
 *   npm run dev:login -- --role=teacher            # a different role
 *   npm run dev:login -- --email=someone@real.com  # an existing account
 *   npm run dev:login -- --next=/parent/family     # land on a specific page
 *   npm run dev:login -- --create                  # create the user if missing
 *
 * Open the printed URL in the browser. It sets the session cookies and
 * redirects, so the session lasts until it expires.
 *
 * Localhost only - --app rejects anything else. Deployed environments reject
 * these tokens at /auth/confirm; use their login form instead.
 *
 * The Supabase project it acts on is whatever .env.local points at - the script
 * prints the host before doing anything, so check it before passing --create.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import type { UserRole } from '../src/types';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const VALID_ROLES: UserRole[] = [
  'parent',
  'teacher',
  'student',
  'admin',
  'class_scheduler',
  'super_admin',
];

function getArg(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return match?.split('=').slice(1).join('=');
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  const role = (getArg('role') || 'parent') as UserRole;
  if (!VALID_ROLES.includes(role)) {
    throw new Error(
      `Unknown role "${role}". Expected one of: ${VALID_ROLES.join(', ')}`
    );
  }

  const email = getArg('email') || `dev-login-${role}@example.com`;
  const appUrl =
    getArg('app') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const next = getArg('next');
  const shouldCreate = process.argv.includes('--create');

  // Local only. Pointed at a deployed URL the link is minted happily and then
  // dies at /auth/confirm with "Email verification failed" - the same token
  // verifies fine against the same Supabase project from a plain supabase-js
  // client and works end to end on localhost, so the cause is something about
  // the deployed runtime that has not been tracked down. Failing here, loudly,
  // beats burning twenty minutes on a link that was never going to work.
  const appHost = new URL(appUrl).hostname;
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(appHost)) {
    throw new Error(
      `--app must point at a local dev server; got "${appHost}".\n` +
        `Magic links from this script only work against localhost. To reach a ` +
        `deployed environment, sign in through its login form instead.`
    );
  }

  console.log(`Supabase:    ${new URL(supabaseUrl).host}`);
  console.log(`App:         ${appUrl}`);
  console.log(`User:        ${email} (${role})`);
  console.log('');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .maybeSingle();

  if (!profile) {
    if (!shouldCreate) {
      throw new Error(
        `No account found for ${email}. Re-run with --create to make one ` +
          `in ${new URL(supabaseUrl).host}, or pass --email for an existing account.`
      );
    }

    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: crypto.randomUUID(), // never used - we sign in by link
        email_confirm: true,
        user_metadata: { first_name: 'Dev', last_name: 'Login', role },
      });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: created.user.id,
      email,
      role,
      first_name: 'Dev',
      last_name: 'Login',
      code_of_conduct_agreed_at: new Date().toISOString(),
    });

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    console.log(`Created ${role} account ${email}`);
  } else if (profile.role !== role && getArg('role')) {
    console.log(
      `Note: ${email} already exists with role "${profile.role}" - using that, ` +
        `not "${role}".`
    );
  }

  const { data: link, error: linkError } =
    await supabase.auth.admin.generateLink({ type: 'magiclink', email });

  if (linkError || !link.properties?.hashed_token) {
    throw new Error(`Failed to generate link: ${linkError?.message}`);
  }

  const loginUrl = new URL('/auth/confirm', appUrl);
  loginUrl.searchParams.set('token_hash', link.properties.hashed_token);
  loginUrl.searchParams.set('type', 'magiclink');
  if (next) {
    loginUrl.searchParams.set('next', next);
  }

  console.log('Open this URL to sign in (single use):');
  console.log(loginUrl.toString());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
