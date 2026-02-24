/**
 * End-to-end refund test:
 *   1. Issues a Stripe refund for a real payment
 *   2. Updates Supabase payment status to 'refunded' (mimics webhook)
 *   3. Calls syncRefundToZoho to create credit note + refund in Zoho
 *
 * Usage:  npx tsx scripts/test-refund-e2e.ts <supabase-payment-id>
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const PAYMENT_ID = process.argv[2];
if (!PAYMENT_ID) {
  console.error('Usage: npx tsx scripts/test-refund-e2e.ts <payment-id>');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  End-to-End Refund Test');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Fetch payment from Supabase
  console.log(`📋  Step 1: Fetching payment ${PAYMENT_ID} from Supabase...`);
  const { data: payment, error } = await supabase
    .from('payments')
    .select(
      `
      id, amount, status, transaction_id, sync_status,
      enrollment:enrollments(
        id,
        student:family_members(first_name, last_name),
        class:classes(name)
      )
    `
    )
    .eq('id', PAYMENT_ID)
    .single();

  if (error || !payment) {
    console.error('❌ Payment not found:', error?.message);
    process.exit(1);
  }

  const enrollment = payment.enrollment as unknown as {
    id: string;
    student: { first_name: string; last_name: string };
    class: { name: string };
  };

  console.log(
    `   ✅ Found: ${enrollment.student.first_name} ${enrollment.student.last_name}`
  );
  console.log(`      Class: ${enrollment.class.name}`);
  console.log(`      Amount: $${Number(payment.amount).toFixed(2)}`);
  console.log(`      Stripe PI: ${payment.transaction_id}`);
  console.log(
    `      Status: ${payment.status} | Sync: ${payment.sync_status}\n`
  );

  if (payment.status === 'refunded') {
    console.log(
      '⚠️  Payment is already refunded — skipping Stripe refund, going to Zoho sync.\n'
    );
  } else {
    // 2. Issue Stripe refund
    console.log('💸  Step 2: Issuing Stripe refund...');
    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.transaction_id!,
        reason: 'requested_by_customer',
      });
      console.log(`   ✅ Refund created: ${refund.id}`);
      console.log(`      Amount: $${(refund.amount / 100).toFixed(2)}`);
      console.log(`      Status: ${refund.status}\n`);
    } catch (err) {
      console.error(
        '❌ Stripe refund failed:',
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }

    // 3. Update Supabase (mimics what the webhook does)
    console.log(
      '🔄  Step 3: Updating Supabase payment status to "refunded"...'
    );
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', PAYMENT_ID);

    if (updateError) {
      console.error('❌ Supabase update failed:', updateError.message);
      process.exit(1);
    }
    console.log('   ✅ Payment status updated to "refunded"\n');
  }

  // 4. Call syncRefundToZoho
  console.log(
    '📨  Step 4: Syncing refund to Zoho Books (credit note + refund)...'
  );
  try {
    // Dynamic import to pick up the .env config
    const { syncRefundToZoho } = await import('../src/lib/zoho');
    const result = await syncRefundToZoho(PAYMENT_ID);

    if (result.success) {
      console.log(`   ✅ Zoho sync successful!`);
      console.log(`      Credit Note ID: ${result.creditNoteId}\n`);
    } else {
      console.error(`   ❌ Zoho sync failed: ${result.error}\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error(
      '❌ syncRefundToZoho threw:',
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }

  // 5. Verify final state
  console.log('🔍  Step 5: Verifying final state in Supabase...');
  const { data: final } = await supabase
    .from('payments')
    .select('status, sync_status')
    .eq('id', PAYMENT_ID)
    .single();

  console.log(`   Payment status: ${final?.status}`);
  console.log(`   Sync status:    ${final?.sync_status}`);

  console.log('\n═══════════════════════════════════════════════════');
  if (final?.status === 'refunded' && final?.sync_status === 'synced') {
    console.log('  ✅ END-TO-END TEST PASSED');
  } else {
    console.log('  ❌ END-TO-END TEST FAILED');
  }
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(console.error);
