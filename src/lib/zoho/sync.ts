import { createAdminClient } from '@/lib/supabase/server';
import { zohoFetch } from './client';

// Types for local data
interface PaymentDetails {
    id: string;
    amount: number;
    currency: string;
    transaction_id: string | null;
    stripe_payment_id: string | null;
    created_at: string;
    enrollment_id: string;
    metadata: Record<string, any> | null;
    sync_status: string | null;
}

interface ClassDetails {
    id: string;
    name: string;
    fee: number;
}

interface ParentDetails {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
}

// Types for Zoho Data
interface ZohoContact {
    contact_id: string;
    contact_name: string;
    email: string;
}

interface ZohoInvoice {
    invoice_id: string;
    invoice_number: string;
    total: number;
    balance: number;
}

export async function syncPaymentToZoho(paymentId: string) {
    console.log(`[Zoho Sync] Starting sync for payment: ${paymentId}`);
    // Use admin client since this runs in background (webhook)
    const supabase = await createAdminClient(); 

    try {
        // 1. Fetch System Data
        const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (paymentError || !paymentData) throw new Error(`Payment not found: ${paymentError?.message}`);
        
        const payment = paymentData as PaymentDetails;

        // Check if already synced
        if (payment.sync_status === 'success' && payment.metadata?.zoho_payment_id) {
            console.log(`[Zoho Sync] Payment ${paymentId} already synced.`);
            return;
        }

        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('*, student:family_members(*), class:classes(*)')
            .eq('id', payment.enrollment_id)
            .single();
        
        if (!enrollment) throw new Error('Enrollment not found');

        const student = enrollment.student;
        const classData = enrollment.class;
        
        const { data: parent } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', student.parent_id)
            .single();

        if (!parent) throw new Error('Parent profile not found');

        // 2. Search or Create Zoho Contact (Parent)
        const contactId = await searchOrCreateContact(parent);

        // 3. Create Invoice
        const invoice = await createInvoice(contactId, classData, payment, enrollment.id);

        // 4. Record Payment
        await recordPayment(invoice.invoice_id, payment, contactId);

        // 5. Update Local Payment Record
        await supabase
            .from('payments')
            .update({
                sync_status: 'success',
                metadata: {
                    ...payment.metadata,
                    zoho_contact_id: contactId,
                    zoho_invoice_id: invoice.invoice_id,
                    zoho_payment_recorded: true,
                    last_synced_at: new Date().toISOString()
                }
            })
            .eq('id', paymentId);

        console.log(`[Zoho Sync] Successfully synced payment ${paymentId}`);

    } catch (error) {
        console.error(`[Zoho Sync] Failed for payment ${paymentId}:`, error);
        
        // Log failure to DB
        // Re-create client just in case (though should be fine to reuse)
        try {
            const { data: existing } = await supabase.from('payments').select('metadata').eq('id', paymentId).single();
             await supabase
                .from('payments')
                .update({
                    sync_status: 'failed',
                    metadata: {
                        ...existing?.metadata,
                        sync_error: error instanceof Error ? error.message : 'Unknown error',
                        last_sync_attempt: new Date().toISOString()
                    }
                })
                .eq('id', paymentId);
        } catch (updateError) {
            console.error('Failed to log sync error to DB:', updateError);
        }
    }
}

async function searchOrCreateContact(parent: ParentDetails): Promise<string> {
    // Search by email
    const searchResponse = await zohoFetch<{ contacts: ZohoContact[] }>('/contacts', {
        params: { email: parent.email }
    });

    if (searchResponse.contacts && searchResponse.contacts.length > 0) {
        return searchResponse.contacts[0].contact_id;
    }

    // Create
    const createResponse = await zohoFetch<{ contact: ZohoContact }>('/contacts', {
        method: 'POST',
        body: JSON.stringify({
            contact_name: `${parent.first_name} ${parent.last_name}`,
            contact_type: 'customer',
            email: parent.email,
            phone: parent.phone || ''
        })
    });

    return createResponse.contact.contact_id;
}

async function createInvoice(contactId: string, classData: ClassDetails, payment: PaymentDetails, enrollmentId: string): Promise<ZohoInvoice> {
    // Check if invoice already exists for this enrollment? 
    // We rely on local metadata usually, but if re-running...?
    // For now assume new.

    const invoiceData = {
        customer_id: contactId,
        reference_number: enrollmentId, // Use enrollment ID as ref
        date: new Date().toISOString().split('T')[0],
        line_items: [
            {
                name: classData.name,
                description: `Class Enrollment: ${classData.name}`,
                rate: payment.amount / 100, // Stripe is cents, Zoho is standard units
                quantity: 1
            }
        ],
        status: 'draft' // Create as draft first, then sent/paid? Or 'sent' directly?
        // If we record payment immediately, it handles status.
    };

    const response = await zohoFetch<{ invoice: ZohoInvoice }>('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData)
    });

    return response.invoice;
}

async function recordPayment(invoiceId: string, payment: PaymentDetails, contactId: string) {
    const paymentData = {
        customer_id: contactId,
        payment_mode: 'Stripe',
        amount: payment.amount / 100,
        date: new Date().toISOString().split('T')[0],
        reference_number: payment.transaction_id || payment.stripe_payment_id || 'N/A',
        invoices: [
            {
                invoice_id: invoiceId,
                amount_applied: payment.amount / 100
            }
        ]
    };

    // Note: Endpoint is /customerpayments
    await zohoFetch('/customerpayments', {
        method: 'POST',
        body: JSON.stringify(paymentData)
    });
}
