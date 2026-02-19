import { createClient } from '@supabase/supabase-js';

// Configuration for Zoho Books API
// These should be added to .env.local
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_BASE_URL = 'https://www.zohoapis.com/books/v3';

// Invoice configuration
const ZOHO_INVOICE_SUBJECT = process.env.ZOHO_INVOICE_SUBJECT || 'AAC Fall \'26 Registration';
const ZOHO_TERMS_AND_CONDITIONS = 'Thank you for registering with Austin AAC. All fees are non-refundable unless the class is canceled by the organization.';

// Type definitions for Zoho integration
interface ParentInfo {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
}

interface StudentInfo {
    first_name: string;
    last_name: string;
    parent_id?: string;
    grade?: string;
}

interface TeacherInfo {
    first_name: string;
    last_name: string;
}

interface ClassInfo {
    name: string;
    price: number;
    description?: string;
    teacher?: TeacherInfo;
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
            throw new Error(`Payment ${paymentId} not found in database`);
        }

        const typedPayment = payment as unknown as PaymentWithEnrollment;
        const enrollment = typedPayment.enrollment;

        // Resolve parent through student's parent_id
        const { data: parentData, error: parentError } = await supabaseAdmin
            .from('profiles')
            .select('first_name, last_name, email, phone, address_line1, address_line2, city, state, zip, country')
            .eq('id', enrollment.student.parent_id!)
            .single();

        if (parentError || !parentData) {
            throw new Error(`Parent profile not found for payment ${paymentId}`);
        }
        const parent = parentData as ParentInfo;

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
    const contactBody: Record<string, unknown> = {
        contact_name: `${parent.first_name} ${parent.last_name}`,
        contact_type: 'customer',
        contact_persons: [{
            first_name: parent.first_name,
            last_name: parent.last_name,
            email: parent.email,
            phone: parent.phone || ''
        }]
    };

    // Include billing address if available
    if (parent.address_line1 && parent.city && parent.state && parent.zip) {
        contactBody.billing_address = {
            address: parent.address_line1,
            street2: parent.address_line2 || '',
            city: parent.city,
            state: parent.state,
            zip: parent.zip,
            country: 'U.S.A.',
        };
    }

    const response = await fetch(`${ZOHO_BASE_URL}/contacts?organization_id=${ZOHO_ORGANIZATION_ID}`, {
        method: 'POST',
        headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactBody)
    });
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Zoho Contact creation failed: ${data.message}`);
    return data.contact.contact_id;
}

/**
 * Build the line item description in format:
 * "{Student Name} - {Class Name} ({Grade Level}) - {Teacher Name}"
 */
function buildLineItemDescription(enrollment: PaymentEnrollment): string {
    const studentName = `${enrollment.student.first_name} ${enrollment.student.last_name}`;
    const className = enrollment.class.name;
    const grade = enrollment.student.grade || 'N/A';
    const teacher = enrollment.class.teacher
        ? `${enrollment.class.teacher.first_name} ${enrollment.class.teacher.last_name}`
        : 'TBD';
    return `${studentName} - ${className} (${grade}) - ${teacher}`;
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
            subject: ZOHO_INVOICE_SUBJECT,
            payment_terms_label: 'Due on Receipt',
            notes: ZOHO_TERMS_AND_CONDITIONS,
            line_items: [{
                name: 'Community Fee',
                description: buildLineItemDescription(enrollment),
                rate: enrollment.class.price,
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

/**
 * Sync a Stripe refund to Zoho Books by creating a credit note
 * against the original invoice.
 */
export async function syncRefundToZoho(paymentId: string) {
    try {
        // 1. Fetch payment data from Supabase
        const { data: payment, error: pError } = await supabaseAdmin
            .from('payments')
            .select(`
                id, amount, transaction_id, paid_at, created_at,
                enrollment:enrollments(
                    id,
                    student:family_members(first_name, last_name, grade),
                    class:classes(
                        name,
                        teacher:profiles(first_name, last_name)
                    )
                )
            `)
            .eq('id', paymentId)
            .single();

        if (pError || !payment) {
            throw new Error(`Payment ${paymentId} not found in database`);
        }

        const enrollment = payment.enrollment as unknown as {
            id: string;
            student: { first_name: string; last_name: string; grade?: string };
            class: { name: string; teacher?: { first_name: string; last_name: string } };
        };

        const accessToken = await getAccessToken();

        // 2. Find the original Zoho invoice by reference number
        const invoiceId = await findZohoInvoiceByReference(
            `ST-${payment.transaction_id}`,
            accessToken
        );

        if (!invoiceId) {
            throw new Error(
                `No Zoho invoice found with reference ST-${payment.transaction_id}`
            );
        }

        // 3. Get invoice details to find customer_id
        const invoice = await getZohoInvoice(invoiceId, accessToken);

        // 4. Create a credit note (Supabase amount is already in dollars)
        const amountDollars = payment.amount as number;
        const creditNoteId = await createZohoCreditNote(
            invoice.customer_id,
            {
                className: enrollment.class.name,
                studentName: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
                amount: amountDollars,
                transactionId: payment.transaction_id as string,
            },
            accessToken
        );

        // Credit note alone serves as the refund record in Zoho.
        // Paid invoices can't have credits applied (error 12006),
        // and refund-from-credit-note requires a bank account ID.

        // 6. Update local sync status
        await supabaseAdmin
            .from('payments')
            .update({
                sync_status: 'synced',
                updated_at: new Date().toISOString(),
            })
            .eq('id', paymentId);

        console.log(
            `Successfully synced refund for payment ${paymentId} to Zoho Books (Credit Note: ${creditNoteId})`
        );
        return { success: true, creditNoteId };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        console.error(
            `Zoho Refund Sync Error for payment ${paymentId}:`,
            errorMessage
        );

        // Log failure — don't overwrite the 'refunded' payment status
        await supabaseAdmin
            .from('payments')
            .update({
                sync_status: 'failed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', paymentId);

        return { success: false, error: errorMessage };
    }
}

async function findZohoInvoiceByReference(
    referenceNumber: string,
    token: string
): Promise<string | null> {
    const response = await fetch(
        `${ZOHO_BASE_URL}/invoices?reference_number=${encodeURIComponent(referenceNumber)}&organization_id=${ZOHO_ORGANIZATION_ID}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    const data = await response.json();
    return data.invoices?.[0]?.invoice_id || null;
}

async function getZohoInvoice(
    invoiceId: string,
    token: string
): Promise<{ customer_id: string; invoice_id: string }> {
    const response = await fetch(
        `${ZOHO_BASE_URL}/invoices/${invoiceId}?organization_id=${ZOHO_ORGANIZATION_ID}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    const data = await response.json();
    if (data.code !== 0)
        throw new Error(`Failed to fetch Zoho invoice: ${data.message}`);
    return data.invoice;
}

async function createZohoCreditNote(
    customerId: string,
    details: {
        className: string;
        studentName: string;
        amount: number;
        transactionId: string;
    },
    token: string
): Promise<string> {
    const response = await fetch(
        `${ZOHO_BASE_URL}/creditnotes?organization_id=${ZOHO_ORGANIZATION_ID}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customer_id: customerId,
                reference_number: `REFUND-${details.transactionId}`,
                date: new Date().toISOString().split('T')[0],
                line_items: [
                    {
                        name: 'Community Fee',
                        description: `Refund - ${details.studentName} - ${details.className}`,
                        rate: details.amount,
                        quantity: 1,
                    },
                ],
            }),
        }
    );
    const data = await response.json();
    if (data.code !== 0)
        throw new Error(`Zoho Credit Note creation failed: ${data.message}`);
    return data.creditnote.creditnote_id;
}
