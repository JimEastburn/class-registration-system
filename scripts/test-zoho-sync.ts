/**
 * Zoho Books Integration Smoke Test
 *
 * Tests the full sync flow: token refresh → find/create contact → create invoice → record payment
 *
 * Usage:
 *   npx tsx scripts/test-zoho-sync.ts [--dry-run] [--payment-id <id>]
 *
 * Options:
 *   --dry-run      Test API connectivity only (get access token + list contacts) without creating records
 *   --payment-id   Specify a payment ID to sync (defaults to most recent completed/pending-sync payment)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

// ── Env validation ──────────────────────────────────────────────────────────────
const required = [
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REFRESH_TOKEN',
  'ZOHO_ORGANIZATION_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing env vars:', missing.join(', '));
  console.error('   Make sure .env.local is in the project root.');
  process.exit(1);
}

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID!;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET!;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN!;
const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID!;
const ZOHO_BASE_URL = 'https://www.zohoapis.com/books/v3';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── CLI args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const paymentIdIndex = args.indexOf('--payment-id');
const paymentIdArg = paymentIdIndex !== -1 ? args[paymentIdIndex + 1] : null;

// ── Helpers ─────────────────────────────────────────────────────────────────────
function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

// ── Step 1: Get Access Token ────────────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  log('🔑', 'Requesting access token from Zoho...');
  const res = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?refresh_token=${ZOHO_REFRESH_TOKEN}&client_id=${ZOHO_CLIENT_ID}&client_secret=${ZOHO_CLIENT_SECRET}&grant_type=refresh_token`,
    { method: 'POST' }
  );
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(`Token error: ${data.error || res.statusText}`);
  }

  log('✅', `Access token obtained (expires in ${data.expires_in}s)`);
  return data.access_token;
}

// ── Step 2: Connectivity check ──────────────────────────────────────────────────
async function checkConnectivity(token: string) {
  log('🔍', 'Checking Zoho Books API connectivity...');
  const res = await fetch(
    `${ZOHO_BASE_URL}/contacts?organization_id=${ZOHO_ORGANIZATION_ID}&per_page=1`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const data = await res.json();

  if (data.code !== 0) {
    throw new Error(`API Error (code ${data.code}): ${data.message}`);
  }

  const total = data.page_context?.total || 0;
  log('✅', `Connected to Zoho Books org ${ZOHO_ORGANIZATION_ID} — ${total} existing contact(s)`);
}

// ── Step 3: Full sync ───────────────────────────────────────────────────────────
async function runFullSync(token: string) {
  // Find a payment to sync
  let paymentId = paymentIdArg;

  if (!paymentId) {
    log('🔍', 'Looking for a completed payment to sync...');
    const { data, error } = await supabase
      .from('payments')
      .select('id, amount, transaction_id, sync_status')
      .eq('status', 'completed')
      .eq('sync_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('❌ No completed/pending-sync payments found in Supabase.');
      console.error('   Try running with --payment-id <id> to target a specific payment.');
      process.exit(1);
    }

    paymentId = data.id;
    log('📋', `Found payment: ${paymentId} ($${(data.amount / 100).toFixed(2)}, sync_status: ${data.sync_status})`);
  } else {
    log('📋', `Using specified payment: ${paymentId}`);
  }

  // Fetch full payment with enrollment data (mirrors zoho.ts query)
  // The parent relationship goes through family_members.parent_id → profiles
  const { data: payment, error: pError } = await supabase
    .from('payments')
    .select(`
      *,
      enrollment:enrollments(
        id,
        student:family_members(first_name, last_name, parent_id),
        class:classes(name, price, description)
      )
    `)
    .eq('id', paymentId)
    .single();

  if (pError || !payment) {
    console.error('❌ Could not load payment + enrollment data:', pError?.message);
    process.exit(1);
  }

  // Fetch parent profile separately via the student's parent_id
  const enrollment = payment.enrollment as any;
  const parentId = enrollment.student.parent_id;

  const { data: parent, error: parentError } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, phone')
    .eq('id', parentId)
    .single();

  if (parentError || !parent) {
    console.error('❌ Could not load parent profile:', parentError?.message);
    process.exit(1);
  }

  const student = enrollment.student;
  const classInfo = enrollment.class;

  log('👤', `Parent:  ${parent.first_name} ${parent.last_name} (${parent.email})`);
  log('🎓', `Student: ${student.first_name} ${student.last_name}`);
  log('📚', `Class:   ${classInfo.name} — $${(payment.amount / 100).toFixed(2)}`);

  // Step A: Find or create Zoho contact
  log('🔍', `Searching for existing Zoho contact: ${parent.email}...`);
  let contactId = await findContact(parent.email, token);

  if (contactId) {
    log('✅', `Found existing contact: ${contactId}`);
  } else {
    log('➕', 'Contact not found — creating...');
    contactId = await createContact(parent, token);
    log('✅', `Created contact: ${contactId}`);
  }

  // Step B: Create invoice
  log('📄', 'Creating Zoho invoice...');
  const invoiceId = await createInvoice(contactId, enrollment, payment, token);
  log('✅', `Invoice created: ${invoiceId}`);

  // Step C: Record payment
  log('💰', 'Recording payment against invoice...');
  await recordPayment(invoiceId, contactId, payment, token);
  log('✅', 'Payment recorded in Zoho Books');

  // Step D: Update local sync status
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      sync_status: 'synced',
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (updateError) {
    console.error('⚠️  DB update failed:', updateError.message);
  } else {
    log('✅', `Local payment record updated (sync_status: synced)`);
  }

  log('🎉', 'Full Zoho sync completed successfully!');
}

// ── Zoho API Calls ──────────────────────────────────────────────────────────────
async function findContact(email: string, token: string): Promise<string | null> {
  const res = await fetch(
    `${ZOHO_BASE_URL}/contacts?email=${email}&organization_id=${ZOHO_ORGANIZATION_ID}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const data = await res.json();
  return data.contacts?.[0]?.contact_id || null;
}

async function createContact(parent: any, token: string): Promise<string> {
  const res = await fetch(
    `${ZOHO_BASE_URL}/contacts?organization_id=${ZOHO_ORGANIZATION_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_name: `${parent.first_name} ${parent.last_name}`,
        contact_type: 'customer',
        contact_persons: [
          {
            first_name: parent.first_name,
            last_name: parent.last_name,
            email: parent.email,
            phone: parent.phone || '',
          },
        ],
      }),
    }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Contact creation failed: ${data.message}`);
  return data.contact.contact_id;
}

async function createInvoice(
  contactId: string,
  enrollment: any,
  payment: any,
  token: string
): Promise<string> {
  const res = await fetch(
    `${ZOHO_BASE_URL}/invoices?organization_id=${ZOHO_ORGANIZATION_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: contactId,
        reference_number: `ST-${payment.transaction_id}`,
        line_items: [
          {
            name: enrollment.class.name,
            description: `Enrollment for ${enrollment.student.first_name} ${enrollment.student.last_name}`,
            rate: payment.amount / 100, // cents → dollars
            quantity: 1,
          },
        ],
        date: new Date(payment.paid_at || payment.created_at)
          .toISOString()
          .split('T')[0],
      }),
    }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Invoice creation failed: ${data.message}`);
  return data.invoice.invoice_id;
}

async function recordPayment(
  invoiceId: string,
  contactId: string,
  payment: any,
  token: string
) {
  const res = await fetch(
    `${ZOHO_BASE_URL}/customerpayments?organization_id=${ZOHO_ORGANIZATION_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: contactId,
        payment_mode: 'creditcard',
        amount: payment.amount / 100,
        date: new Date(payment.paid_at || payment.created_at)
          .toISOString()
          .split('T')[0],
        reference_number: payment.transaction_id,
        invoices: [
          {
            invoice_id: invoiceId,
            amount_applied: payment.amount / 100,
          },
        ],
      }),
    }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Payment recording failed: ${data.message}`);
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Zoho Books Integration Smoke Test');
  console.log(`  Mode: ${dryRun ? '🔍 DRY RUN (connectivity only)' : '🚀 FULL SYNC'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  try {
    const token = await getAccessToken();
    await checkConnectivity(token);

    if (dryRun) {
      console.log('');
      log('✅', 'Dry run passed — Zoho API credentials are working!');
    } else {
      console.log('');
      await runFullSync(token);
    }

    console.log('');
  } catch (err) {
    console.error('');
    console.error('❌ Test failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
