/**
 * Delete All Zoho Books Records
 *
 * Deletes all records in Zoho Books in the correct dependency order:
 *   1. Customer Payments
 *   2. Credit Notes
 *   3. Invoices
 *   4. Contacts
 *
 * Usage:
 *   npx tsx scripts/delete-zoho-records.ts [--dry-run]
 *
 * Options:
 *   --dry-run   List all records without deleting them
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

// ── Env validation ──────────────────────────────────────────────────────────────
const required = [
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REFRESH_TOKEN',
  'ZOHO_ORGANIZATION_ID',
] as const;

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing env vars:', missing.join(', '));
  process.exit(1);
}

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID!;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET!;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN!;
const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID!;
const ZOHO_BASE_URL = 'https://www.zohoapis.com/books/v3';

// ── CLI args ────────────────────────────────────────────────────────────────────
const dryRun = process.argv.includes('--dry-run');

// ── Helpers ─────────────────────────────────────────────────────────────────────
function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

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
  log('✅', `Access token obtained`);
  return data.access_token;
}

async function fetchAllPages<T>(
  endpoint: string,
  listKey: string,
  token: string
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${ZOHO_BASE_URL}/${endpoint}${separator}organization_id=${ZOHO_ORGANIZATION_ID}&per_page=200&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const data = await res.json();

    if (data.code !== 0) {
      throw new Error(`API error fetching ${endpoint}: ${data.message}`);
    }

    const items = data[listKey] || [];
    all.push(...items);
    hasMore = data.page_context?.has_more_page || false;
    page++;
  }

  return all;
}

async function deleteRecord(
  endpoint: string,
  id: string,
  token: string
): Promise<boolean> {
  const url = `${ZOHO_BASE_URL}/${endpoint}/${id}?organization_id=${ZOHO_ORGANIZATION_ID}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const data = await res.json();
  if (data.code !== 0) {
    console.error(`   ⚠️  Failed to delete ${endpoint}/${id}: ${data.message}`);
    return false;
  }
  return true;
}

// ── Void invoices before deleting ───────────────────────────────────────────────
async function voidInvoice(invoiceId: string, token: string): Promise<boolean> {
  const url = `${ZOHO_BASE_URL}/invoices/${invoiceId}/status/void?organization_id=${ZOHO_ORGANIZATION_ID}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const data = await res.json();
  if (data.code !== 0) {
    console.error(
      `   ⚠️  Failed to void invoice ${invoiceId}: ${data.message}`
    );
    return false;
  }
  return true;
}

// ── Void credit notes before deleting ───────────────────────────────────────────
async function voidCreditNote(
  creditNoteId: string,
  token: string
): Promise<boolean> {
  const url = `${ZOHO_BASE_URL}/creditnotes/${creditNoteId}/void?organization_id=${ZOHO_ORGANIZATION_ID}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const data = await res.json();
  if (data.code !== 0) {
    console.error(
      `   ⚠️  Failed to void credit note ${creditNoteId}: ${data.message}`
    );
    return false;
  }
  return true;
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🗑️  Delete All Zoho Books Records');
  console.log(`  Mode: ${dryRun ? '🔍 DRY RUN (list only)' : '🔥 DELETE ALL'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  const token = await getAccessToken();

  // ── 1. Delete Customer Payments ─────────────────────────────────────────────
  log('📋', 'Fetching customer payments...');
  const payments = await fetchAllPages<{
    payment_id: string;
    reference_number: string;
    amount: number;
  }>('customerpayments', 'customerpayments', token);
  log('📊', `Found ${payments.length} customer payment(s)`);

  if (!dryRun) {
    let deleted = 0;
    for (const p of payments) {
      const ok = await deleteRecord('customerpayments', p.payment_id, token);
      if (ok) deleted++;
    }
    log('✅', `Deleted ${deleted}/${payments.length} customer payments`);
  } else {
    for (const p of payments) {
      log(
        '  ',
        `  Payment ${p.payment_id} — $${p.amount} (ref: ${p.reference_number || 'N/A'})`
      );
    }
  }

  console.log('');

  // ── 2. Delete Credit Notes ──────────────────────────────────────────────────
  log('📋', 'Fetching credit notes...');
  const creditNotes = await fetchAllPages<{
    creditnote_id: string;
    creditnote_number: string;
    status: string;
    total: number;
  }>('creditnotes', 'creditnotes', token);
  log('📊', `Found ${creditNotes.length} credit note(s)`);

  if (!dryRun) {
    let deleted = 0;
    for (const cn of creditNotes) {
      // Void open credit notes before deleting
      if (cn.status !== 'void' && cn.status !== 'draft') {
        await voidCreditNote(cn.creditnote_id, token);
      }
      const ok = await deleteRecord('creditnotes', cn.creditnote_id, token);
      if (ok) deleted++;
    }
    log('✅', `Deleted ${deleted}/${creditNotes.length} credit notes`);
  } else {
    for (const cn of creditNotes) {
      log(
        '  ',
        `  Credit Note ${cn.creditnote_number} — $${cn.total} (${cn.status})`
      );
    }
  }

  console.log('');

  // ── 3. Delete Invoices ──────────────────────────────────────────────────────
  log('📋', 'Fetching invoices...');
  const invoices = await fetchAllPages<{
    invoice_id: string;
    invoice_number: string;
    status: string;
    total: number;
  }>('invoices', 'invoices', token);
  log('📊', `Found ${invoices.length} invoice(s)`);

  if (!dryRun) {
    let deleted = 0;
    for (const inv of invoices) {
      // Void non-draft invoices before deleting
      if (inv.status !== 'void' && inv.status !== 'draft') {
        await voidInvoice(inv.invoice_id, token);
      }
      const ok = await deleteRecord('invoices', inv.invoice_id, token);
      if (ok) deleted++;
    }
    log('✅', `Deleted ${deleted}/${invoices.length} invoices`);
  } else {
    for (const inv of invoices) {
      log(
        '  ',
        `  Invoice ${inv.invoice_number} — $${inv.total} (${inv.status})`
      );
    }
  }

  console.log('');

  // ── 4. Delete Contacts ──────────────────────────────────────────────────────
  log('📋', 'Fetching contacts...');
  const contacts = await fetchAllPages<{
    contact_id: string;
    contact_name: string;
    email: string;
  }>('contacts', 'contacts', token);
  log('📊', `Found ${contacts.length} contact(s)`);

  if (!dryRun) {
    let deleted = 0;
    for (const c of contacts) {
      const ok = await deleteRecord('contacts', c.contact_id, token);
      if (ok) deleted++;
    }
    log('✅', `Deleted ${deleted}/${contacts.length} contacts`);
  } else {
    for (const c of contacts) {
      log('  ', `  Contact: ${c.contact_name} (${c.email || 'no email'})`);
    }
  }

  console.log('');
  log(
    '🎉',
    dryRun
      ? 'Dry run complete — no records were deleted.'
      : 'All Zoho Books records deleted!'
  );
  console.log('');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
