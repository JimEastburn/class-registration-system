/**
 * Process a Stripe Refund
 *
 * Issues a refund through the Stripe API for a payment in the system.
 * The Stripe webhook will automatically handle downstream effects
 * (update Supabase statuses, promote waitlist, sync to Zoho).
 *
 * Usage:
 *   npx tsx scripts/process-refund.ts --payment-id <id>
 *   npx tsx scripts/process-refund.ts --stripe-pi <pi_xxx>
 *   npx tsx scripts/process-refund.ts --payment-id <id> --amount 5000   # partial refund in cents
 *   npx tsx scripts/process-refund.ts --payment-id <id> --reason duplicate
 *
 * Options:
 *   --payment-id   Supabase payment ID to refund
 *   --stripe-pi    Stripe PaymentIntent ID directly (skips Supabase lookup)
 *   --amount       Partial refund amount in cents (omit for full refund)
 *   --reason       Refund reason: duplicate | fraudulent | requested_by_customer
 *   --dry-run      Show what would be refunded without actually refunding
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ── Env validation ──────────────────────────────────────────────────────────────
const required = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing env vars:', missing.join(', '));
  console.error('   Make sure .env.local is in the project root.');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── CLI args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(flag: string): string | null {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const paymentIdArg = getArg('--payment-id');
const stripePiArg = getArg('--stripe-pi');
const amountArg = getArg('--amount');
const reasonArg = getArg('--reason') as
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer'
  | null;
const dryRun = args.includes('--dry-run');

if (!paymentIdArg && !stripePiArg) {
  console.error('❌ You must provide either --payment-id or --stripe-pi');
  console.error('');
  console.error('Usage:');
  console.error('  npx tsx scripts/process-refund.ts --payment-id <uuid>');
  console.error('  npx tsx scripts/process-refund.ts --stripe-pi <pi_xxx>');
  process.exit(1);
}

const validReasons = ['duplicate', 'fraudulent', 'requested_by_customer'];
if (reasonArg && !validReasons.includes(reasonArg)) {
  console.error(`❌ Invalid reason "${reasonArg}". Must be one of: ${validReasons.join(', ')}`);
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

function formatAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Stripe Refund Processor');
  console.log(`  Mode: ${dryRun ? '🔍 DRY RUN' : '💸 LIVE REFUND'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  let paymentIntentId: string;
  let paymentAmount: number | undefined;
  let paymentInfo: string = '';

  // ── Resolve PaymentIntent ID ──────────────────────────────────────────────
  if (stripePiArg) {
    paymentIntentId = stripePiArg;
    log('📋', `Using Stripe PaymentIntent: ${paymentIntentId}`);
  } else {
    log('🔍', `Looking up payment in Supabase: ${paymentIdArg}...`);

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        id, amount, status, transaction_id, paid_at,
        enrollment:enrollments(
          student:family_members(first_name, last_name),
          class:classes(name)
        )
      `)
      .eq('id', paymentIdArg!)
      .single();

    if (error || !payment) {
      console.error('❌ Payment not found:', error?.message || 'No data');
      process.exit(1);
    }

    if (payment.status === 'refunded') {
      console.error('❌ Payment is already refunded.');
      process.exit(1);
    }

    if (payment.status !== 'completed') {
      console.error(`❌ Payment status is "${payment.status}" — only completed payments can be refunded.`);
      process.exit(1);
    }

    if (!payment.transaction_id) {
      console.error('❌ Payment has no transaction_id (Stripe PaymentIntent).');
      process.exit(1);
    }

    paymentIntentId = payment.transaction_id;
    paymentAmount = payment.amount as number;

    const enrollment = payment.enrollment as unknown as {
      student: { first_name: string; last_name: string };
      class: { name: string };
    } | null;

    if (enrollment) {
      paymentInfo = ` (${enrollment.student.first_name} ${enrollment.student.last_name} → ${enrollment.class.name})`;
    }

    log('✅', `Found payment: ${payment.id}`);
    log('👤', `Student/Class:${paymentInfo || ' N/A'}`);
    log('💰', `Amount: ${formatAmount(paymentAmount)}`);
    log('🔗', `Stripe PI: ${paymentIntentId}`);
  }

  // ── Fetch Stripe PaymentIntent ────────────────────────────────────────────
  log('🔍', 'Fetching PaymentIntent from Stripe...');
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    console.error('❌ Could not retrieve PaymentIntent:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (pi.status !== 'succeeded') {
    console.error(`❌ PaymentIntent status is "${pi.status}" — can only refund succeeded intents.`);
    process.exit(1);
  }

  const totalPaid = pi.amount;
  const refundAmount = amountArg ? parseInt(amountArg, 10) : undefined;

  if (refundAmount !== undefined) {
    if (isNaN(refundAmount) || refundAmount <= 0) {
      console.error(`❌ Invalid refund amount: ${amountArg}`);
      process.exit(1);
    }
    if (refundAmount > totalPaid) {
      console.error(`❌ Refund amount (${formatAmount(refundAmount / 100)}) exceeds payment (${formatAmount(totalPaid / 100)})`);
      process.exit(1);
    }
  }

  console.log('');
  log('📋', '── Refund Summary ──');
  log('  ', `PaymentIntent: ${pi.id}`);
  log('  ', `Total paid:    ${formatAmount(totalPaid / 100)}`);
  log('  ', `Refund amount: ${refundAmount ? formatAmount(refundAmount / 100) + ' (partial)' : formatAmount(totalPaid / 100) + ' (full)'}`);
  if (reasonArg) {
    log('  ', `Reason:        ${reasonArg}`);
  }
  console.log('');

  // ── Dry run exit ──────────────────────────────────────────────────────────
  if (dryRun) {
    log('🔍', 'DRY RUN — no refund issued. Remove --dry-run to process.');
    console.log('');
    return;
  }

  // ── Issue refund ──────────────────────────────────────────────────────────
  log('💸', 'Issuing refund via Stripe API...');
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: pi.id,
    };
    if (refundAmount) {
      refundParams.amount = refundAmount;
    }
    if (reasonArg) {
      refundParams.reason = reasonArg;
    }

    const refund = await stripe.refunds.create(refundParams);

    console.log('');
    log('✅', 'Refund created successfully!');
    log('  ', `Refund ID:  ${refund.id}`);
    log('  ', `Amount:     ${formatAmount(refund.amount / 100)}`);
    log('  ', `Status:     ${refund.status}`);
    log('  ', `Currency:   ${refund.currency.toUpperCase()}`);
    console.log('');
    log('📡', 'Stripe will fire a `charge.refunded` webhook automatically.');
    log('  ', 'The webhook will update Supabase, promote waitlist, and sync to Zoho.');
    console.log('');
  } catch (err) {
    console.error('❌ Refund failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
