import { Resend } from 'resend';

// Initialize Resend client if API key is available
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Must be an address on a domain verified in Resend. `austinaac.org` is the
// verified one; the subdomain this used to default to
// (class-registration.austinaac.org) is a separate, unverified domain in Resend,
// so every send from it was rejected. Verifying the subdomain is not a realistic
// fix either -- the DNS is on Wix, which will not create the subdomain MX record
// Resend's SPF check needs.
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@austinaac.org';
const APP_NAME = 'AAC Class Registration';

/**
 * Result of an attempted send. A discriminated union, unlike the old per-sender
 * shape which mixed `data` and `error` members and could not be narrowed.
 */
export type EmailResult =
  | { success: true; id: string | null }
  | { success: false; error: string };

/**
 * Single choke point for every outgoing email.
 *
 * Two things this exists to fix. First, `resend.emails.send()` RESOLVES with
 * `{ data: null, error }` on an API rejection rather than throwing, and the
 * error codes include `monthly_quota_exceeded`, `daily_quota_exceeded` and
 * `rate_limit_exceeded`. Every sender used to `return { success: true }` on that
 * path, so exhausting the Resend quota looked exactly like delivering. Second,
 * an unset RESEND_API_KEY produced a `console.log` and a `{ success: false }`
 * that no caller checked -- which is how a total email outage went unnoticed for
 * months.
 *
 * Every failure is now logged at error level with the template name and the
 * recipient, so grepping `[email]` in the Vercel logs says what did not go out
 * and why.
 */
async function dispatch(
  template: string,
  message: { to: string; subject: string; html: string }
): Promise<EmailResult> {
  if (!resend) {
    console.error(
      `[email] ${template} -> ${message.to}: NOT SENT, RESEND_API_KEY is not set`
    );
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      ...message,
    });

    if (error) {
      // error.name is the machine-readable code, e.g. monthly_quota_exceeded.
      console.error(
        `[email] ${template} -> ${message.to}: REJECTED by Resend (${error.name}): ${error.message}`
      );
      return { success: false, error: `${error.name}: ${error.message}` };
    }

    console.log(`[email] ${template} -> ${message.to}: sent (${data?.id})`);
    return { success: true, id: data?.id ?? null };
  } catch (err) {
    // Transport-level failures still throw.
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[email] ${template} -> ${message.to}: THREW: ${detail}`);
    return { success: false, error: detail };
  }
}

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
  return dispatch('enrollment-confirmation', {
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
}

export async function sendPaymentReceipt(data: PaymentEmailData) {
  return dispatch('payment-receipt', {
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
}

export interface WaitlistJoinedEmailData {
  parentEmail: string;
  parentName: string;
  studentName: string;
  className: string;
  position: number;
}

/**
 * Sent when a student lands on a waitlist. Distinct from
 * sendWaitlistNotification, which fires later when a seat opens and they are
 * promoted — joining used to be silent, so a family had no confirmation that
 * anything had happened at all.
 */
export async function sendWaitlistJoined(data: WaitlistJoinedEmailData) {
  return dispatch('waitlist-joined', {
    to: data.parentEmail,
    subject: `Waitlisted: ${data.studentName} for ${data.className}`,
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
            .header h1 { color: #4C7C92; margin: 0; font-size: 24px; }
            .badge { display: inline-block; background: #fef3c7; color: #b45309; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
            .position { text-align: center; padding: 24px; margin: 24px 0; }
            .position-value { font-size: 48px; font-weight: 700; color: #4C7C92; }
            .position-label { color: #6b7280; font-size: 14px; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
            .cta { display: inline-block; background: #4C7C92; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="badge">On the Waitlist</div>
              </div>

              <p>Hi ${data.parentName},</p>
              <p><strong>${data.className}</strong> is currently full, so <strong>${data.studentName}</strong> has been added to the waitlist.</p>

              <div class="position">
                <div class="position-value">#${data.position}</div>
                <div class="position-label">current position on the waitlist</div>
              </div>

              <p>If a seat opens up we'll move students up in order and email you right away. There's nothing you need to do in the meantime, and there's no charge for holding a waitlist spot.</p>

              <p style="color: #6b7280;">Your position can move up as other families change their plans.</p>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/parent/enrollments" class="cta">View Enrollments</a>
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
  return dispatch('waitlist-promoted', {
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
}

export interface CancellationEmailData {
  parentEmail: string;
  parentName: string;
  studentName: string;
  className: string;
}

export async function sendClassCancellation(data: CancellationEmailData) {
  return dispatch('class-cancellation', {
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
}

export interface EnrollmentCancelledEmailData {
  parentEmail: string;
  parentName: string;
  studentName: string;
  className: string;
}

/**
 * Sent when a single enrollment is cancelled — by the parent, an admin, the
 * teacher, or a refund. Distinct from sendClassCancellation, which fires when
 * the whole class is called off.
 *
 * Losing one seat used to be entirely silent: cancelling a class emailed every
 * family, but dropping one child from that same class emailed nobody.
 *
 * Deliberately says nothing about refunds. The class-cancellation template used
 * to promise "a full refund will be processed automatically" and no such
 * automation exists; don't reintroduce that here.
 */
export async function sendEnrollmentCancelled(
  data: EnrollmentCancelledEmailData
) {
  return dispatch('enrollment-cancelled', {
    to: data.parentEmail,
    subject: `Enrollment Cancelled: ${data.studentName} in ${data.className}`,
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
            .header h1 { color: #4C7C92; margin: 0; font-size: 24px; }
            .badge { display: inline-block; background: #fee2e2; color: #dc2626; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
            .cta { display: inline-block; background: #4C7C92; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="badge">Enrollment Cancelled</div>
              </div>

              <p>Hi ${data.parentName},</p>
              <p><strong>${data.studentName}</strong> is no longer enrolled in <strong>${data.className}</strong>. The seat has been released.</p>

              <p>If you weren't expecting this, or you have questions about it, please get in touch and we'll sort it out.</p>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/parent/enrollments" class="cta">View Enrollments</a>
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

export async function sendScheduleChangeNotification(
  data: ScheduleChangeEmailData
) {
  const changeList = [];
  if (data.changes.schedule) {
    changeList.push(
      `<li><strong>Schedule:</strong> Changed from "${data.changes.schedule.old}" to "${data.changes.schedule.new}"</li>`
    );
  }
  if (data.changes.location) {
    changeList.push(
      `<li><strong>Location:</strong> Changed from "${data.changes.location.old}" to "${data.changes.location.new}"</li>`
    );
  }
  if (data.changes.dates) {
    changeList.push(
      `<li><strong>Dates:</strong> Changed from "${data.changes.dates.old}" to "${data.changes.dates.new}"</li>`
    );
  }

  return dispatch('schedule-change', {
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
}

export interface TeacherEnrollmentEmailData {
  teacherEmail: string;
  teacherName: string;
  studentName: string;
  className: string;
}

export async function sendTeacherEnrollmentNotification(
  data: TeacherEnrollmentEmailData
) {
  return dispatch('teacher-enrollment', {
    to: data.teacherEmail,
    subject: `New Enrollment: ${data.studentName} joined ${data.className}`,
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
            .header h1 { color: #16a34a; margin: 0; font-size: 24px; }
            .success-badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
            .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #6b7280; }
            .detail-value { font-weight: 600; color: #1f2937; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
            .cta { display: inline-block; background: linear-gradient(to right, #16a34a, #4C7C92); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="success-badge">New Enrollment</div>
              </div>

              <p>Hi ${data.teacherName},</p>
              <p><strong>${data.studentName}</strong> has enrolled in your class <strong>${data.className}</strong>.</p>

              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Student</span>
                  <span class="detail-value">${data.studentName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Class</span>
                  <span class="detail-value">${data.className}</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/teacher/classes" class="cta">View Roster</a>
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
}

export interface TeacherUnenrollmentEmailData {
  teacherEmail: string;
  teacherName: string;
  studentName: string;
  className: string;
}

export async function sendTeacherUnenrollmentNotification(
  data: TeacherUnenrollmentEmailData
) {
  return dispatch('teacher-unenrollment', {
    to: data.teacherEmail,
    subject: `Enrollment Removed: ${data.studentName} left ${data.className}`,
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
            .header h1 { color: #d97706; margin: 0; font-size: 24px; }
            .alert-badge { display: inline-block; background: #fef3c7; color: #d97706; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
            .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #6b7280; }
            .detail-value { font-weight: 600; color: #1f2937; }
            .footer { text-align: center; color: #9ca3af; font-size: 14px; margin-top: 24px; }
            .cta { display: inline-block; background: linear-gradient(to right, #d97706, #4C7C92); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${APP_NAME}</h1>
                <div class="alert-badge">Enrollment Removed</div>
              </div>

              <p>Hi ${data.teacherName},</p>
              <p><strong>${data.studentName}</strong> is no longer enrolled in your class <strong>${data.className}</strong>.</p>

              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Student</span>
                  <span class="detail-value">${data.studentName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Class</span>
                  <span class="detail-value">${data.className}</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/teacher/classes" class="cta">View Roster</a>
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
}
