/**
 * Zoho Books E2E Sync Test with Invoice Format Verification
 *
 * Tests the full sync flow using the production `syncPaymentToZoho` function,
 * then fetches the created invoice and contact from Zoho and asserts the
 * format matches the INV-000305 specification:
 *
 *   - Line item name: "Community Fee"
 *   - Description: "{Student} - {Class} ({Grade}) - {Teacher}"
 *   - Rate: class price (not payment.amount)
 *   - Subject: "AAC …"
 *   - Terms: "Due on Receipt"
 *   - Notes: T&C footer
 *   - Contact billing address populated
 *
 * Usage:
 *   npx tsx scripts/test-zoho-sync.ts [--dry-run] [--payment-id <id>] [--skip-cleanup]
 *
 * Options:
 *   --dry-run        Test API connectivity only (token + list contacts)
 *   --payment-id     Specify a payment ID to sync (defaults to most recent pending)
 *   --skip-cleanup   Don't void/delete the test invoice after verification
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
const skipCleanup = args.includes('--skip-cleanup');
const paymentIdIndex = args.indexOf('--payment-id');
const paymentIdArg = paymentIdIndex !== -1 ? args[paymentIdIndex + 1] : null;

// ── Helpers ─────────────────────────────────────────────────────────────────────
function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

// ── Assertion helpers ───────────────────────────────────────────────────────────
interface AssertionResult {
  field: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const results: AssertionResult[] = [];

function assert(field: string, expected: string, actual: string | undefined | null): boolean {
  const actualStr = actual ?? '(empty)';
  const pass = actualStr === expected;
  results.push({ field, expected, actual: actualStr, pass });
  return pass;
}

function assertContains(field: string, expected: string, actual: string | undefined | null): boolean {
  const actualStr = actual ?? '(empty)';
  const pass = actualStr.includes(expected);
  results.push({ field, expected: `contains "${expected}"`, actual: actualStr, pass });
  return pass;
}

function assertMatches(field: string, pattern: RegExp, actual: string | undefined | null): boolean {
  const actualStr = actual ?? '(empty)';
  const pass = pattern.test(actualStr);
  results.push({ field, expected: `matches ${pattern}`, actual: actualStr, pass });
  return pass;
}

function assertTruthy(field: string, description: string, value: unknown): boolean {
  const pass = !!value;
  results.push({ field, expected: description, actual: value ? String(value) : '(empty)', pass });
  return pass;
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

// ── Zoho Read Helpers ───────────────────────────────────────────────────────────
async function fetchInvoiceByReference(referenceNumber: string, token: string) {
  const res = await fetch(
    `${ZOHO_BASE_URL}/invoices?reference_number=${encodeURIComponent(referenceNumber)}&organization_id=${ZOHO_ORGANIZATION_ID}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const data = await res.json();
  const invoiceId = data.invoices?.[0]?.invoice_id;
  if (!invoiceId) return null;

  // Fetch full invoice details
  const detailRes = await fetch(
    `${ZOHO_BASE_URL}/invoices/${invoiceId}?organization_id=${ZOHO_ORGANIZATION_ID}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const detailData = await detailRes.json();
  if (detailData.code !== 0) throw new Error(`Failed to fetch invoice: ${detailData.message}`);
  return detailData.invoice;
}

async function fetchContact(contactId: string, token: string) {
  const res = await fetch(
    `${ZOHO_BASE_URL}/contacts/${contactId}?organization_id=${ZOHO_ORGANIZATION_ID}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Failed to fetch contact: ${data.message}`);
  return data.contact;
}

// ── Cleanup helpers ─────────────────────────────────────────────────────────────
async function voidAndDeleteInvoice(invoiceId: string, token: string) {
  // Delete associated payments first
  const paymentsRes = await fetch(
    `${ZOHO_BASE_URL}/invoices/${invoiceId}/payments?organization_id=${ZOHO_ORGANIZATION_ID}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const paymentsData = await paymentsRes.json();
  if (paymentsData.payments) {
    for (const p of paymentsData.payments) {
      await fetch(
        `${ZOHO_BASE_URL}/customerpayments/${p.payment_id}?organization_id=${ZOHO_ORGANIZATION_ID}`,
        { method: 'DELETE', headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
    }
  }

  // Void the invoice
  await fetch(
    `${ZOHO_BASE_URL}/invoices/${invoiceId}/status/void?organization_id=${ZOHO_ORGANIZATION_ID}`,
    { method: 'POST', headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );

  // Delete the invoice
  await fetch(
    `${ZOHO_BASE_URL}/invoices/${invoiceId}?organization_id=${ZOHO_ORGANIZATION_ID}`,
    { method: 'DELETE', headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
}

// ── Step 3: Full sync + verification ────────────────────────────────────────────
async function runFullSync(token: string) {
  // ── Find a payment to sync ────────────────────────────────────────────────
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
    log('📋', `Found payment: ${paymentId} ($${Number(data.amount).toFixed(2)}, sync_status: ${data.sync_status})`);
  } else {
    log('📋', `Using specified payment: ${paymentId}`);
  }

  // ── Fetch payment details for display ─────────────────────────────────────
  const { data: payment, error: pError } = await supabase
    .from('payments')
    .select(`
      *,
      enrollment:enrollments(
        id,
        student:family_members(first_name, last_name, parent_id, grade),
        class:classes(
          name, price, description,
          teacher:profiles(first_name, last_name)
        )
      )
    `)
    .eq('id', paymentId)
    .single();

  if (pError || !payment) {
    console.error('❌ Could not load payment + enrollment data:', pError?.message);
    process.exit(1);
  }

  const enrollment = payment.enrollment as any;
  const parentId = enrollment.student.parent_id;

  // Fetch parent profile (with address)
  const { data: parent, error: parentError } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, phone, address_line1, address_line2, city, state, zip, country')
    .eq('id', parentId)
    .single();

  if (parentError || !parent) {
    console.error('❌ Could not load parent profile:', parentError?.message);
    process.exit(1);
  }

  const student = enrollment.student;
  const classInfo = enrollment.class;
  const teacher = classInfo.teacher;

  console.log('');
  log('👤', `Parent:  ${parent.first_name} ${parent.last_name} (${parent.email})`);
  log('📍', `Address: ${parent.address_line1 || '(none)'}, ${parent.city || ''} ${parent.state || ''} ${parent.zip || ''}`);
  log('🎓', `Student: ${student.first_name} ${student.last_name} (grade: ${student.grade || 'N/A'})`);
  log('📚', `Class:   ${classInfo.name} — $${Number(classInfo.price).toFixed(2)}`);
  log('👩‍🏫', `Teacher: ${teacher ? `${teacher.first_name} ${teacher.last_name}` : 'N/A'}`);
  log('💰', `Payment: $${Number(payment.amount).toFixed(2)} (txn: ${payment.transaction_id})`);
  console.log('');

  // ── A: Run production sync ────────────────────────────────────────────────
  log('🚀', 'Calling production syncPaymentToZoho()...');
  const { syncPaymentToZoho } = await import('../src/lib/zoho');
  const syncResult = await syncPaymentToZoho(paymentId!);

  if (!syncResult.success) {
    console.error(`❌ syncPaymentToZoho failed: ${syncResult.error}`);
    process.exit(1);
  }

  log('✅', `Sync completed — Invoice ID: ${syncResult.invoiceId}`);
  console.log('');

  // ── B: Verify invoice format ──────────────────────────────────────────────
  log('🔍', 'Fetching created invoice from Zoho for verification...');
  const refNumber = `ST-${payment.transaction_id}`;
  const invoice = await fetchInvoiceByReference(refNumber, token);

  if (!invoice) {
    console.error(`❌ Invoice not found with reference ${refNumber}`);
    process.exit(1);
  }

  log('📄', `Invoice ${invoice.invoice_number} fetched — verifying format...`);
  console.log('');

  // Line item checks
  const lineItem = invoice.line_items?.[0];
  assert('line_items[0].name', 'Community Fee', lineItem?.name);

  // Description: "{Student} - {Class} ({Grade}) - {Teacher}"
  const expectedDesc = `${student.first_name} ${student.last_name} - ${classInfo.name} (${student.grade || 'N/A'}) - ${teacher ? `${teacher.first_name} ${teacher.last_name}` : 'TBD'}`;
  assert('line_items[0].description', expectedDesc, lineItem?.description);

  // Rate should be class price, not payment amount
  assert('line_items[0].rate', String(classInfo.price), String(lineItem?.rate));

  // Subject
  assertContains('subject', 'AAC', invoice.subject);

  // Terms
  assert('payment_terms_label', 'Due on Receipt', invoice.payment_terms_label);

  // Notes / T&C
  assertTruthy('notes (T&C)', 'non-empty T&C footer', invoice.notes);

  // ── C: Verify contact billing address ─────────────────────────────────────
  log('🔍', 'Fetching contact to verify billing address...');
  const contact = await fetchContact(invoice.customer_id, token);
  const billingAddr = contact.billing_address || {};

  if (parent.address_line1) {
    assertTruthy('billing_address.address', 'non-empty street', billingAddr.address);
    assertTruthy('billing_address.city', 'non-empty city', billingAddr.city);
    assertTruthy('billing_address.state', 'non-empty state', billingAddr.state);
    assertTruthy('billing_address.zip', 'non-empty zip', billingAddr.zip);
  } else {
    log('⚠️', 'Parent has no address on file — skipping billing address assertions');
    results.push({ field: 'billing_address', expected: 'skipped (no address on profile)', actual: 'N/A', pass: true });
  }

  // ── D: Print results table ────────────────────────────────────────────────
  console.log('');
  console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  INV-000305 Format Verification Results                                      │');
  console.log('├────────────────────────────┬──────┬───────────────────────────────────────────┤');
  console.log('│ Field                      │ Pass │ Details                                   │');
  console.log('├────────────────────────────┼──────┼───────────────────────────────────────────┤');

  for (const r of results) {
    const passStr = r.pass ? '  ✅  ' : '  ❌  ';
    const fieldCol = r.field.padEnd(26).slice(0, 26);
    const detailText = r.pass ? r.actual : `expected: ${r.expected} | got: ${r.actual}`;
    const detailCol = detailText.slice(0, 41).padEnd(41);
    console.log(`│ ${fieldCol} │${passStr}│ ${detailCol} │`);
  }

  console.log('└────────────────────────────┴──────┴───────────────────────────────────────────┘');

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const allPassed = passed === total;
  console.log('');
  log(allPassed ? '🎉' : '❌', `${passed}/${total} checks passed`);

  // ── E: Optional cleanup ───────────────────────────────────────────────────
  if (!skipCleanup && invoice.invoice_id) {
    console.log('');
    log('🧹', 'Cleaning up test invoice from Zoho...');
    try {
      await voidAndDeleteInvoice(invoice.invoice_id, token);
      log('✅', 'Test invoice voided and deleted');

      // Reset sync status back to pending so the payment can be re-tested
      await supabase
        .from('payments')
        .update({ sync_status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', paymentId);
      log('✅', 'Payment sync_status reset to "pending"');
    } catch (err) {
      log('⚠️', `Cleanup failed (non-fatal): ${err instanceof Error ? err.message : err}`);
    }
  } else if (skipCleanup) {
    log('ℹ️', 'Skipping cleanup (--skip-cleanup). Invoice remains in Zoho for manual review.');
  }

  if (!allPassed) {
    process.exit(1);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Zoho Books E2E Sync Test + Format Verification');
  console.log(`  Mode: ${dryRun ? '🔍 DRY RUN (connectivity only)' : '🚀 FULL SYNC + VERIFY'}`);
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
