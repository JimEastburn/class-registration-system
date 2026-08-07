import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mock is available in factory
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: mockSend,
    };
  },
}));

describe('Email Templates', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    // The real SDK resolves with { data, error } — it does not throw on API
    // rejections. Mirroring that shape here is what makes the quota test below
    // meaningful.
    mockSend.mockResolvedValue({ data: { id: 'test-email-id' }, error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  /**
   * Regression guard for the bug the dispatch() wrapper was written to fix:
   * resend.emails.send() RESOLVES with { data: null, error } when the API
   * rejects a send — quota exhaustion, rate limits, a bad from-address. The old
   * per-sender code only caught thrown exceptions, so it returned
   * { success: true } on every one of those and a blown quota was
   * indistinguishable from delivery.
   */
  describe('dispatch (shared send path)', () => {
    it('reports failure when Resend rejects the send', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: {
          name: 'monthly_quota_exceeded',
          message: 'You have reached your monthly quota',
          statusCode: 429,
        },
      });
      const { sendClassCancellation } = await import('./email');

      const result = await sendClassCancellation({
        parentEmail: 'parent@test.com',
        parentName: 'A Parent',
        studentName: 'A Student',
        className: 'Art 101',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('monthly_quota_exceeded');
      }
    });

    it('logs the template name and recipient when a send fails', async () => {
      const errorLog = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockSend.mockResolvedValue({
        data: null,
        error: {
          name: 'rate_limit_exceeded',
          message: 'Too many requests',
          statusCode: 429,
        },
      });
      const { sendClassCancellation } = await import('./email');

      await sendClassCancellation({
        parentEmail: 'parent@test.com',
        parentName: 'A Parent',
        studentName: 'A Student',
        className: 'Art 101',
      });

      const logged = errorLog.mock.calls.flat().join(' ');
      expect(logged).toContain('class-cancellation');
      expect(logged).toContain('parent@test.com');
      expect(logged).toContain('rate_limit_exceeded');
      errorLog.mockRestore();
    });

    it('reports failure, loudly, when the API key is missing', async () => {
      vi.resetModules();
      delete process.env.RESEND_API_KEY;
      const errorLog = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const { sendClassCancellation } = await import('./email');

      const result = await sendClassCancellation({
        parentEmail: 'parent@test.com',
        parentName: 'A Parent',
        studentName: 'A Student',
        className: 'Art 101',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('Email not configured');
      // console.error, not console.log: a silent outage is the failure mode.
      expect(errorLog).toHaveBeenCalled();
      errorLog.mockRestore();
    });

    it('returns the Resend message id on success', async () => {
      const { sendClassCancellation } = await import('./email');

      const result = await sendClassCancellation({
        parentEmail: 'parent@test.com',
        parentName: 'A Parent',
        studentName: 'A Student',
        className: 'Art 101',
      });

      expect(result.success).toBe(true);
      if (result.success) expect(result.id).toBe('test-email-id');
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
        fee: 100,
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
          schedule: { old: 'Mon 10am', new: 'Tue 10am' },
        },
      };

      const result = await sendScheduleChangeNotification(data);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: data.parentEmail,
          subject: `Schedule Change: ${data.className}`,
        })
      );

      const htmlCall = mockSend.mock.calls[0][0].html;
      expect(htmlCall).toContain(
        'Schedule:</strong> Changed from "Mon 10am" to "Tue 10am"'
      );
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
          dates: { old: 'Jan 1', new: 'Feb 1' },
        },
      };

      const result = await sendScheduleChangeNotification(data);
      expect(result.success).toBe(true);
      const htmlCall = mockSend.mock.calls[0][0].html;

      expect(htmlCall).toContain(
        'Location:</strong> Changed from "Room 1" to "Room 2"'
      );
      expect(htmlCall).toContain(
        'Dates:</strong> Changed from "Jan 1" to "Feb 1"'
      );
    });
  });

  describe('sendTeacherEnrollmentNotification', () => {
    const data = {
      teacherEmail: 'teacher@test.com',
      teacherName: 'Ms. Rivera',
      studentName: 'Kid Test',
      className: 'Art 101',
    };

    it('emails the teacher with the student and class', async () => {
      const { sendTeacherEnrollmentNotification } = await import('./email');

      const result = await sendTeacherEnrollmentNotification(data);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: data.teacherEmail,
          subject: 'New Enrollment: Kid Test joined Art 101',
        })
      );
      const htmlCall = mockSend.mock.calls[0][0].html;
      expect(htmlCall).toContain('Kid Test');
      expect(htmlCall).toContain('Art 101');
      expect(htmlCall).toContain('Ms. Rivera');
    });

    it('handles missing API key', async () => {
      vi.resetModules();
      delete process.env.RESEND_API_KEY;

      const { sendTeacherEnrollmentNotification } = await import('./email');

      const result = await sendTeacherEnrollmentNotification(data);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('Email not configured');
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('sendTeacherUnenrollmentNotification', () => {
    const data = {
      teacherEmail: 'teacher@test.com',
      teacherName: 'Ms. Rivera',
      studentName: 'Kid Test',
      className: 'Art 101',
    };

    it('emails the teacher about the removal', async () => {
      const { sendTeacherUnenrollmentNotification } = await import('./email');

      const result = await sendTeacherUnenrollmentNotification(data);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: data.teacherEmail,
          subject: 'Enrollment Removed: Kid Test left Art 101',
        })
      );
      const htmlCall = mockSend.mock.calls[0][0].html;
      expect(htmlCall).toContain('Kid Test');
      expect(htmlCall).toContain('Art 101');
      expect(htmlCall).toContain('no longer enrolled');
    });

    it('handles missing API key', async () => {
      vi.resetModules();
      delete process.env.RESEND_API_KEY;

      const { sendTeacherUnenrollmentNotification } = await import('./email');

      const result = await sendTeacherUnenrollmentNotification(data);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('Email not configured');
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
