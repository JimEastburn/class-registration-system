import { createClient } from '@supabase/supabase-js';

// Configuration for Zoho Books API
// These should be added to .env.local
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_BASE_URL = 'https://www.zohoapis.com/books/v3';

// Type definitions for Zoho integration
interface ParentInfo {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
}

interface StudentInfo {
    first_name: string;
    last_name: string;
}

interface ClassInfo {
    name: string;
    fee: number;
    description?: string;
}

interface PaymentEnrollment {
    id: string;
    student: StudentInfo;
    class: ClassInfo;
    parent: ParentInfo;
}

interface PaymentWithEnrollment {
    id: string;
    amount: number;
    transaction_id: string;
    paid_at?: string;
    created_at: string;
    enrollment: PaymentEnrollment;
}

// Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Gets a fresh access token from Zoho using the refresh token
 */
async function getAccessToken(): Promise<string> {
    const response = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${ZOHO_REFRESH_TOKEN}&client_id=${ZOHO_CLIENT_ID}&client_secret=${ZOHO_CLIENT_SECRET}&grant_type=refresh_token`, {
        method: 'POST',
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Failed to get Zoho access token: ${data.error || response.statusText}`);
    }

    return data.access_token;
}

/**
 * Main function to sync a payment to Zoho Books
 */
export async function syncPaymentToZoho(paymentId: string) {
    try {
        // 1. Fetch payment and enrollment data from Supabase
        const { data: payment, error: pError } = await supabaseAdmin
            .from('payments')
            .select(`
                *,
                enrollment:enrollments(
                    id,
                    student:family_members(first_name, last_name),
                    class:classes(name, fee, description),
                    parent:profiles!enrollments_parent_id_fkey(first_name, last_name, email, phone)
                )
            `)
            .eq('id', paymentId)
            .single();

        if (pError || !payment) {
            throw new Error(`Payment ${paymentId} not found in database`);
        }

        const typedPayment = payment as unknown as PaymentWithEnrollment;
        const enrollment = typedPayment.enrollment;
        const parent = enrollment.parent;

        const accessToken = await getAccessToken();

        // 2. Find or Create Zoho Contact for the Parent
        let contactId = await findZohoContact(parent.email, accessToken);
        if (!contactId) {
            contactId = await createZohoContact(parent, accessToken);
        }

        // 3. Create Zoho Invoice
        const invoiceId = await createZohoInvoice(contactId, enrollment, payment, accessToken);

        // 4. Record Payment in Zoho
        await recordZohoPayment(invoiceId, contactId, payment, accessToken);

        // 5. Update local record as synced
        await supabaseAdmin
            .from('payments')
            .update({
                sync_status: 'synced',
                zoho_invoice_id: invoiceId,
                sync_error: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);

        console.log(`Successfully synced payment ${paymentId} to Zoho Books (Invoice: ${invoiceId})`);
        return { success: true, invoiceId };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Zoho Sync Error for payment ${paymentId}:`, errorMessage);

        // Log failure to database
        await supabaseAdmin
            .from('payments')
            .update({
                sync_status: 'failed',
                sync_error: errorMessage,
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);

        return { success: false, error: errorMessage };
    }
}

async function findZohoContact(email: string, token: string): Promise<string | null> {
    const response = await fetch(`${ZOHO_BASE_URL}/contacts?email=${email}&organization_id=${ZOHO_ORGANIZATION_ID}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    const data = await response.json();
    return data.contacts?.[0]?.contact_id || null;
}

async function createZohoContact(parent: ParentInfo, token: string): Promise<string> {
    const response = await fetch(`${ZOHO_BASE_URL}/contacts?organization_id=${ZOHO_ORGANIZATION_ID}`, {
        method: 'POST',
        headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contact_name: `${parent.first_name} ${parent.last_name}`,
            contact_type: 'customer',
            contact_persons: [{
                first_name: parent.first_name,
                last_name: parent.last_name,
                email: parent.email,
                phone: parent.phone || ''
            }]
        })
    });
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Zoho Contact creation failed: ${data.message}`);
    return data.contact.contact_id;
}

async function createZohoInvoice(contactId: string, enrollment: PaymentEnrollment, payment: PaymentWithEnrollment, token: string): Promise<string> {
    const response = await fetch(`${ZOHO_BASE_URL}/invoices?organization_id=${ZOHO_ORGANIZATION_ID}`, {
        method: 'POST',
        headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            customer_id: contactId,
            reference_number: `ST-${payment.transaction_id}`,
            line_items: [{
                name: enrollment.class.name,
                description: `Enrollment for ${enrollment.student.first_name} ${enrollment.student.last_name}`,
                rate: payment.amount,
                quantity: 1
            }],
            date: new Date(payment.paid_at || payment.created_at).toISOString().split('T')[0]
        })
    });
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Zoho Invoice creation failed: ${data.message}`);
    return data.invoice.invoice_id;
}

async function recordZohoPayment(invoiceId: string, contactId: string, payment: PaymentWithEnrollment, token: string) {
    const response = await fetch(`${ZOHO_BASE_URL}/customerpayments?organization_id=${ZOHO_ORGANIZATION_ID}`, {
        method: 'POST',
        headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            customer_id: contactId,
            payment_mode: 'creditcard',
            amount: payment.amount,
            date: new Date(payment.paid_at || payment.created_at).toISOString().split('T')[0],
            reference_number: payment.transaction_id,
            invoices: [{
                invoice_id: invoiceId,
                amount_applied: payment.amount
            }]
        })
    });
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Zoho Payment recording failed: ${data.message}`);
}
