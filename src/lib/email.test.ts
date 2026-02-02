
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mock is available in factory
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: mockSend,
    }
  },
}));

describe('Email Templates', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    mockSend.mockResolvedValue({ id: 'test-email-id' });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  describe('sendPasswordReset', () => {
    it('should generate correct HTML with reset link', async () => {
      // Dynamic import
      const { sendPasswordReset } = await import('./email');
      
      const data = {
        email: 'test@example.com',
        resetLink: 'http://localhost:3000/reset-password?token=xyz',
      };

      const result = await sendPasswordReset(data);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: data.email,
        subject: 'Reset your password',
      }));

      const htmlCall = mockSend.mock.calls[0][0].html;
      expect(htmlCall).toContain(data.resetLink);
      expect(htmlCall).toContain('Reset Password');
      expect(htmlCall).toContain('Hi there,');
    });

    it('should handle missing API key', async () => {
       vi.resetModules();
       delete process.env.RESEND_API_KEY;
       
       const { sendPasswordReset } = await import('./email');
       
       const data = {
         email: 'test@example.com',
         resetLink: 'http://link',
       };

       const result = await sendPasswordReset(data);
       expect(result.success).toBe(false);
       expect(result.error).toBe('Email not configured');
    });
  });

  describe('Other Templates (Smoke Tests)', () => {
      it('sendEnrollmentConfirmation should contain student name', async () => {
          const { sendEnrollmentConfirmation } = await import('./email');
          const data = {
              parentEmail: 'parent@test.com',
              parentName: 'Parent',
              studentName: 'Student',
              className: 'Math 101',
              teacherName: 'Teacher',
              schedule: 'Mon 10am',
              location: 'Room 1',
              startDate: '2023-01-01',
              fee: 100
          };
          
          await sendEnrollmentConfirmation(data);
          
          expect(mockSend).toHaveBeenCalled();
          const htmlCall = mockSend.mock.calls[0][0].html;
          expect(htmlCall).toContain('Student');
          expect(htmlCall).toContain('Math 101');
      });
  });
  describe('sendScheduleChangeNotification', () => {
    it('should generate correct HTML with schedule changes', async () => {
        const { sendScheduleChangeNotification } = await import('./email');
        const data = {
            parentEmail: 'parent@test.com',
            parentName: 'Parent',
            studentName: 'Student',
            className: 'Math 101',
            changes: {
                schedule: { old: 'Mon 10am', new: 'Tue 10am' }
            }
        };

        const result = await sendScheduleChangeNotification(data);

        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            to: data.parentEmail,
            subject: `Schedule Change: ${data.className}`,
        }));

        const htmlCall = mockSend.mock.calls[0][0].html;
        expect(htmlCall).toContain('Schedule:</strong> Changed from "Mon 10am" to "Tue 10am"');
        expect(htmlCall).not.toContain('Location:</strong>');
    });

    it('should generate correct HTML with multiple changes', async () => {
        const { sendScheduleChangeNotification } = await import('./email');
        const data = {
            parentEmail: 'parent@test.com',
            parentName: 'Parent',
            studentName: 'Student',
            className: 'Math 101',
            changes: {
                location: { old: 'Room 1', new: 'Room 2' },
                dates: { old: 'Jan 1', new: 'Feb 1' }
            }
        };

        const result = await sendScheduleChangeNotification(data);
        expect(result.success).toBe(true);
        const htmlCall = mockSend.mock.calls[0][0].html;

        expect(htmlCall).toContain('Location:</strong> Changed from "Room 1" to "Room 2"');
        expect(htmlCall).toContain('Dates:</strong> Changed from "Jan 1" to "Feb 1"');
    });
  });
});
