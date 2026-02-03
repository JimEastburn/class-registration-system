
import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  familyMemberSchema,
  scheduleConfigSchema,
  classSchema,
  enrollmentSchema,
  calendarEventSchema,
  registrationSettingsSchema,
  classDefaultsSchema
} from './validations';

describe('validations', () => {
  describe('loginSchema', () => {
    it('accepts valid input', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: 'password' });
      expect(result.success).toBe(true);
    });
    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({ email: 'invalid', password: 'password' });
      expect(result.success).toBe(false);
    });
    it('rejects empty password', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
      role: 'parent',
      codeOfConduct: true
    };

    it('accepts valid input', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects passwords that do not match', () => {
      const result = registerSchema.safeParse({ ...validData, confirmPassword: 'Password2' });
      expect(result.success).toBe(false);
    });

    it('rejects weak passwords', () => {
      const result = registerSchema.safeParse({ ...validData, password: 'weak', confirmPassword: 'weak' });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('rejects passwords that do not match', () => {
        const result = resetPasswordSchema.safeParse({
            password: 'Password1',
            confirmPassword: 'Password2'
        });
        expect(result.success).toBe(false);
    });
  });

  describe('profileSchema', () => {
      it('validates bio length', () => {
          const longBio = 'a'.repeat(501);
          const result = profileSchema.safeParse({
              firstName: 'Test',
              lastName: 'User',
              bio: longBio
          });
          expect(result.success).toBe(false);
      });
  });

  describe('scheduleConfigSchema', () => {
    it('accepts valid schedule', () => {
        const result = scheduleConfigSchema.safeParse({
            day: 'Tuesday/Thursday',
            block: 'Block 1',
            recurring: true
        });
        expect(result.success).toBe(true);
    });
    
    it('rejects invalid day', () => {
        const result = scheduleConfigSchema.safeParse({
            day: 'Monday',
            block: 'Block 1',
            recurring: true
        });
        expect(result.success).toBe(false);
    });

    it('rejects invalid block', () => {
         const result = scheduleConfigSchema.safeParse({
            day: 'Tuesday',
            block: 'Block 9',
            recurring: true
        });
        expect(result.success).toBe(false);
    });
  });

  describe('classSchema', () => {
      it('validates capacity range', () => {
          expect(classSchema.safeParse({
              title: 'Class',
              capacity: 0,
              price: 10
          }).success).toBe(false);
          
           expect(classSchema.safeParse({
              title: 'Class',
              capacity: 101,
              price: 10
          }).success).toBe(false);
      });
  });

  describe('forgotPasswordSchema', () => {
      it('validates email', () => {
          expect(forgotPasswordSchema.safeParse({ email: 'test@example.com' }).success).toBe(true);
          expect(forgotPasswordSchema.safeParse({ email: 'invalid' }).success).toBe(false);
      });
  });

  describe('familyMemberSchema', () => {
      it('requires names', () => {
          expect(familyMemberSchema.safeParse({ 
              firstName: 'Child', 
              lastName: 'One', 
              email: 'test@example.com', 
              relationship: 'Parent/Guardian' 
          }).success).toBe(true);
          expect(familyMemberSchema.safeParse({ firstName: '' }).success).toBe(false);
      });
      it('validates optional email', () => {
          expect(familyMemberSchema.safeParse({ 
              firstName: 'A', 
              lastName: 'B', 
              email: 'valid@test.com',
              relationship: 'Parent/Guardian'
          }).success).toBe(true);
          expect(familyMemberSchema.safeParse({ 
              firstName: 'A', 
              lastName: 'B', 
              email: 'invalid',
              relationship: 'Parent/Guardian'
          }).success).toBe(false);
      });
  });

  describe('enrollmentSchema', () => {
      it('validates uuids', () => {
           expect(enrollmentSchema.safeParse({
               studentId: crypto.randomUUID(),
               classId: crypto.randomUUID()
           }).success).toBe(true);

           expect(enrollmentSchema.safeParse({
               studentId: '123',
               classId: crypto.randomUUID()
           }).success).toBe(false);
      });
  });

  describe('calendarEventSchema', () => {
      it('validates date format', () => {
          const valid = {
              classId: crypto.randomUUID(),
              date: '2023-10-10',
              block: 'Block 1'
          };
          expect(calendarEventSchema.safeParse(valid).success).toBe(true);
          expect(calendarEventSchema.safeParse({ ...valid, date: '10-10-2023' }).success).toBe(false);
      });
  });

  describe('settings schemas', () => {
      it('validates registration settings', () => {
          expect(registrationSettingsSchema.safeParse({ registrationOpen: true }).success).toBe(true);
      });

      it('validates class defaults', () => {
          expect(classDefaultsSchema.safeParse({ defaultCapacity: 10, paymentDeadlineDays: 5 }).success).toBe(true);
          expect(classDefaultsSchema.safeParse({ defaultCapacity: 0, paymentDeadlineDays: -1 }).success).toBe(false);
      });
  });

});
