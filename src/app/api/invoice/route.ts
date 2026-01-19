import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
        return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });
    }

    // Get payment with related data
    const { data: payment, error } = await supabase
        .from('payments')
        .select(`
            *,
            enrollment:enrollments(
                student:family_members(first_name, last_name),
                class:classes(name, fee, schedule, location, start_date, end_date),
                parent:profiles!enrollments_parent_id_fkey(first_name, last_name, email, phone)
            )
        `)
        .eq('id', paymentId)
        .single();

    if (error || !payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Verify the user has access to this payment
    const isAdmin = user.user_metadata?.role === 'admin';
    const enrollment = payment.enrollment as unknown as {
        student: { first_name: string; last_name: string };
        class: { name: string; fee: number; schedule: string; location: string; start_date: string; end_date: string };
        parent: { first_name: string; last_name: string; email: string; phone: string };
    };

    // Check if user is the parent of this enrollment or an admin
    if (!isAdmin) {
        // Get family members for this user
        const { data: familyMembers } = await supabase
            .from('family_members')
            .select('id')
            .eq('parent_id', user.id);

        const familyMemberIds = familyMembers?.map(fm => fm.id) || [];

        const { data: userEnrollments } = await supabase
            .from('enrollments')
            .select('id')
            .in('student_id', familyMemberIds);

        const enrollmentIds = userEnrollments?.map(e => e.id) || [];

        if (!enrollmentIds.includes(payment.enrollment_id)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
    }

    // Generate invoice HTML
    const invoiceNumber = `INV-${payment.id.slice(0, 8).toUpperCase()}`;
    const invoiceDate = new Date(payment.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const html = generateInvoiceHTML({
        invoiceNumber,
        invoiceDate,
        payment,
        enrollment,
    });

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}

interface InvoiceData {
    invoiceNumber: string;
    invoiceDate: string;
    payment: {
        id: string;
        amount: number;
        status: string;
        stripe_payment_id: string | null;
        created_at: string;
    };
    enrollment: {
        student: { first_name: string; last_name: string };
        class: { name: string; fee: number; schedule: string; location: string; start_date: string; end_date: string };
        parent: { first_name: string; last_name: string; email: string; phone: string };
    };
}

function generateInvoiceHTML(data: InvoiceData): string {
    const { invoiceNumber, invoiceDate, payment, enrollment } = data;
    const isPaid = payment.status === 'completed';
    const isRefunded = payment.status === 'refunded';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: #f8fafc;
            padding: 40px;
        }
        .invoice {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 60px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #9333ea, #ec4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-number {
            font-size: 24px;
            font-weight: 600;
            color: #334155;
        }
        .invoice-date {
            color: #64748b;
        }
        .status {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 8px;
        }
        .status-paid {
            background: #dcfce7;
            color: #166534;
        }
        .status-pending {
            background: #fef3c7;
            color: #92400e;
        }
        .status-refunded {
            background: #f3e8ff;
            color: #7c3aed;
        }
        .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .party h3 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 12px;
        }
        .party p {
            color: #334155;
        }
        .items {
            margin-bottom: 40px;
        }
        .items table {
            width: 100%;
            border-collapse: collapse;
        }
        .items th {
            background: #f1f5f9;
            padding: 16px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
        }
        .items td {
            padding: 20px 16px;
            border-bottom: 1px solid #e2e8f0;
        }
        .items .amount {
            text-align: right;
            font-weight: 600;
        }
        .total-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }
        .total-box {
            width: 280px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .total-row.grand-total {
            border-bottom: none;
            padding-top: 16px;
            font-size: 20px;
            font-weight: 700;
        }
        .footer {
            text-align: center;
            padding-top: 40px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
        }
        .transaction-id {
            margin-top: 20px;
            font-size: 12px;
            color: #94a3b8;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .invoice {
                box-shadow: none;
                padding: 40px;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <div>
                <div class="logo">ClassReg</div>
                <p style="color: #64748b; margin-top: 4px;">Class Registration System</p>
            </div>
            <div class="invoice-info">
                <div class="invoice-number">${invoiceNumber}</div>
                <div class="invoice-date">${invoiceDate}</div>
                <div class="status ${isPaid ? 'status-paid' : isRefunded ? 'status-refunded' : 'status-pending'}">
                    ${isPaid ? 'PAID' : isRefunded ? 'REFUNDED' : 'PENDING'}
                </div>
            </div>
        </div>

        <div class="parties">
            <div class="party">
                <h3>Bill To</h3>
                <p><strong>${enrollment.parent.first_name} ${enrollment.parent.last_name}</strong></p>
                <p>${enrollment.parent.email}</p>
                ${enrollment.parent.phone ? `<p>${enrollment.parent.phone}</p>` : ''}
            </div>
            <div class="party">
                <h3>Student</h3>
                <p><strong>${enrollment.student.first_name} ${enrollment.student.last_name}</strong></p>
            </div>
        </div>

        <div class="items">
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Details</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>${enrollment.class.name}</strong>
                            <br>
                            <span style="color: #64748b; font-size: 14px;">
                                Class Enrollment
                            </span>
                        </td>
                        <td>
                            <span style="color: #64748b; font-size: 14px;">
                                ${enrollment.class.schedule || 'Schedule TBD'}<br>
                                ${enrollment.class.location || 'Location TBD'}<br>
                                ${enrollment.class.start_date ? new Date(enrollment.class.start_date).toLocaleDateString() : ''} - 
                                ${enrollment.class.end_date ? new Date(enrollment.class.end_date).toLocaleDateString() : ''}
                            </span>
                        </td>
                        <td class="amount">$${payment.amount.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="total-section">
            <div class="total-box">
                <div class="total-row">
                    <span>Subtotal</span>
                    <span>$${payment.amount.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>Tax</span>
                    <span>$0.00</span>
                </div>
                <div class="total-row grand-total">
                    <span>Total</span>
                    <span ${isRefunded ? 'style="text-decoration: line-through;"' : ''}>$${payment.amount.toFixed(2)}</span>
                </div>
                ${isRefunded ? `
                <div class="total-row" style="color: #7c3aed;">
                    <span>Refunded</span>
                    <span>-$${payment.amount.toFixed(2)}</span>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="footer">
            <p>Thank you for enrolling with us!</p>
            <p style="margin-top: 8px;">Questions? Contact us at support@classreg.com</p>
            ${payment.stripe_payment_id ? `
            <p class="transaction-id">Transaction ID: ${payment.stripe_payment_id}</p>
            ` : ''}
        </div>

        <div class="no-print" style="text-align: center; margin-top: 40px;">
            <button onclick="window.print()" style="
                background: linear-gradient(135deg, #9333ea, #ec4899);
                color: white;
                border: none;
                padding: 12px 32px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                font-weight: 600;
            ">
                Print Invoice
            </button>
        </div>
    </div>
</body>
</html>
    `.trim();
}
