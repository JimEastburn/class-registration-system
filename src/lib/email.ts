import { Resend } from 'resend';

// Initialize Resend client if API key is available
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@classregistration.com';
const APP_NAME = 'Class Registration System';

export interface EnrollmentEmailData {
    parentEmail: string;
    parentName: string;
    studentName: string;
    className: string;
    teacherName: string;
    schedule: string;
    location: string;
    startDate: string;
    fee: number;
}

export interface PaymentEmailData {
    parentEmail: string;
    parentName: string;
    studentName: string;
    className: string;
    amount: number;
    paymentDate: string;
    transactionId: string;
}

export async function sendEnrollmentConfirmation(data: EnrollmentEmailData) {
    if (!resend) {
        console.log('Email not configured - skipping enrollment confirmation');
        return { success: false, error: 'Email not configured' };
    }

    try {
        const result = await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: data.parentEmail,
            subject: `Enrollment Confirmed: ${data.studentName} in ${data.className}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { color: #7c3aed; margin: 0; font-size: 24px; }
            .success-badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
            .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #6b7280; }
            .detail-value { font-weight: 600; color: #1f2937; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
            .cta { display: inline-block; background: linear-gradient(to right, #7c3aed, #db2777); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="success-badge">✓ Enrollment Confirmed</div>
              </div>
              
              <p>Hi ${data.parentName},</p>
              <p>Great news! <strong>${data.studentName}</strong> has been successfully enrolled in the following class:</p>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Class</span>
                  <span class="detail-value">${data.className}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Teacher</span>
                  <span class="detail-value">${data.teacherName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Schedule</span>
                  <span class="detail-value">${data.schedule}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location</span>
                  <span class="detail-value">${data.location}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Start Date</span>
                  <span class="detail-value">${data.startDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Fee</span>
                  <span class="detail-value">$${data.fee.toFixed(2)}</span>
                </div>
              </div>
              
              <p style="color: #6b7280;">Please complete payment before the class begins to confirm your spot.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/parent/enrollments" class="cta">View Enrollment</a>
              </div>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Failed to send enrollment email:', error);
        return { success: false, error };
    }
}

export async function sendPaymentReceipt(data: PaymentEmailData) {
    if (!resend) {
        console.log('Email not configured - skipping payment receipt');
        return { success: false, error: 'Email not configured' };
    }

    try {
        const result = await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: data.parentEmail,
            subject: `Payment Receipt: ${data.className}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { color: #7c3aed; margin: 0; font-size: 24px; }
            .receipt-badge { display: inline-block; background: #dbeafe; color: #2563eb; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
            .amount { text-align: center; padding: 24px; margin: 24px 0; }
            .amount-value { font-size: 48px; font-weight: 700; color: #16a34a; }
            .amount-label { color: #6b7280; font-size: 14px; }
            .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #6b7280; }
            .detail-value { font-weight: 600; color: #1f2937; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="receipt-badge">Payment Receipt</div>
              </div>
              
              <p>Hi ${data.parentName},</p>
              <p>Thank you for your payment! This confirms your payment for <strong>${data.studentName}</strong>'s class enrollment.</p>
              
              <div class="amount">
                <div class="amount-label">Amount Paid</div>
                <div class="amount-value">$${data.amount.toFixed(2)}</div>
              </div>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Class</span>
                  <span class="detail-value">${data.className}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Student</span>
                  <span class="detail-value">${data.studentName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment Date</span>
                  <span class="detail-value">${data.paymentDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Transaction ID</span>
                  <span class="detail-value" style="font-size: 12px;">${data.transactionId}</span>
                </div>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">Keep this email as your receipt. If you have any questions, please contact us.</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Failed to send payment receipt:', error);
        return { success: false, error };
    }
}

export interface WaitlistEmailData {
    parentEmail: string;
    parentName: string;
    studentName: string;
    className: string;
    schedule: string;
    startDate: string;
}

export async function sendWaitlistNotification(data: WaitlistEmailData) {
    if (!resend) {
        console.log('Email not configured - skipping waitlist notification');
        return { success: false, error: 'Email not configured' };
    }

    try {
        const result = await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: data.parentEmail,
            subject: `Waitlist Opening: ${data.studentName} is now enrolled in ${data.className}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { color: #7c3aed; margin: 0; font-size: 24px; }
            .success-badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
            .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #6b7280; }
            .detail-value { font-weight: 600; color: #1f2937; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
            .cta { display: inline-block; background: linear-gradient(to right, #7c3aed, #db2777); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="success-badge">Spot Available!</div>
              </div>
              
              <p>Hi ${data.parentName},</p>
              <p>Good news! A spot has opened up for <strong>${data.studentName}</strong> in <strong>${data.className}</strong>.</p>
              <p>Your enrollment has been automatically confirmed pending payment.</p>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Class</span>
                  <span class="detail-value">${data.className}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Schedule</span>
                  <span class="detail-value">${data.schedule}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Start Date</span>
                  <span class="detail-value">${data.startDate}</span>
                </div>
              </div>
              
              <p style="color: #6b7280;">Please login to your dashboard to complete payment and secure this spot.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/parent/enrollments" class="cta">Go to Dashboard</a>
              </div>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Failed to send waitlist notification:', error);
        return { success: false, error };
    }
}

export interface CancellationEmailData {
    parentEmail: string;
    parentName: string;
    studentName: string;
    className: string;
}

export async function sendClassCancellation(data: CancellationEmailData) {
    if (!resend) {
        console.log('Email not configured - skipping cancellation email');
        return { success: false, error: 'Email not configured' };
    }

    try {
        const result = await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: data.parentEmail,
            subject: `Important: Class Cancellation - ${data.className}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { color: #dc2626; margin: 0; font-size: 24px; }
            .alert-badge { display: inline-block; background: #fee2e2; color: #dc2626; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="alert-badge">Class Cancelled</div>
              </div>
              
              <p>Hi ${data.parentName},</p>
              <p>We regret to inform you that the class <strong>${data.className}</strong> scheduled for <strong>${data.studentName}</strong> has been cancelled.</p>
              
              <p>If you have already made a payment, a full refund will be processed automatically.</p>
              
              <p>We apologize for any inconvenience this may cause. Please check our catalog for other available classes.</p>
              
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Failed to send class cancellation email:', error);
        return { success: false, error };
    }
}

export interface PasswordResetEmailData {
    email: string;
    resetLink: string;
}

export async function sendPasswordReset(data: PasswordResetEmailData) {
    if (!resend) {
        console.log('Email not configured - skipping password reset email');
        return { success: false, error: 'Email not configured' };
    }

    try {
        const result = await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: data.email,
            subject: 'Reset your password',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { color: #7c3aed; margin: 0; font-size: 24px; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
            .cta { display: inline-block; background: linear-gradient(to right, #7c3aed, #db2777); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
              </div>
              
              <p>Hi there,</p>
              <p>We received a request to reset your password. Click the button below to choose a new password:</p>
              
              <div style="text-align: center;">
                <a href="${data.resetLink}" class="cta">Reset Password</a>
              </div>
              
              <p>If you didn't ask for this, you can safely ignore this email.</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        return { success: false, error };
    }
}

export interface ScheduleChangeEmailData {
    parentEmail: string;
    parentName: string;
    studentName: string;
    className: string;
    changes: {
        schedule?: { old: string; new: string };
        location?: { old: string; new: string };
        dates?: { old: string; new: string };
    };
}

export async function sendScheduleChangeNotification(data: ScheduleChangeEmailData) {
    if (!resend) {
        console.log('Email not configured - skipping schedule change notification');
        return { success: false, error: 'Email not configured' };
    }

    try {
        const changeList = [];
        if (data.changes.schedule) {
            changeList.push(`<li><strong>Schedule:</strong> Changed from "${data.changes.schedule.old}" to "${data.changes.schedule.new}"</li>`);
        }
        if (data.changes.location) {
            changeList.push(`<li><strong>Location:</strong> Changed from "${data.changes.location.old}" to "${data.changes.location.new}"</li>`);
        }
        if (data.changes.dates) {
            changeList.push(`<li><strong>Dates:</strong> Changed from "${data.changes.dates.old}" to "${data.changes.dates.new}"</li>`);
        }

        const result = await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: data.parentEmail,
            subject: `Schedule Change: ${data.className}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { color: #f59e0b; margin: 0; font-size: 24px; }
            .alert-badge { display: inline-block; background: #fef3c7; color: #d97706; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
            .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
            .cta { display: inline-block; background: linear-gradient(to right, #7c3aed, #db2777); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="alert-badge">Class Details Updated</div>
              </div>
              
              <p>Hi ${data.parentName},</p>
              <p>The details for <strong>${data.className}</strong> have been updated. Please review the changes below:</p>
              
              <div class="details">
                <ul>
                  ${changeList.join('')}
                </ul>
              </div>

              <p>These changes apply to <strong>${data.studentName}</strong>'s enrollment.</p>
              
              <div style="text-align: center;">
                 <a href="${process.env.NEXT_PUBLIC_APP_URL}/parent/enrollments" class="cta">View Updated Schedule</a>
              </div>
              
              <p>If you have conflicts with this new schedule, please contact us immediately.</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Failed to send schedule change email:', error);
        return { success: false, error };
    }
}
