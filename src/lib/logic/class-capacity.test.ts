import { describe, it, expect } from 'vitest';
import {
  LOW_SEAT_THRESHOLD,
  getSeatsTaken,
  getSeatsRemaining,
  getCapacityState,
  isClassFull,
} from './class-capacity';

describe('class-capacity', () => {
  describe('getSeatsTaken', () => {
    it('counts confirmed and pending, because both hold a seat', () => {
      expect(getSeatsTaken({ confirmed_count: 3, pending_count: 4 })).toBe(7);
    });

    it('is zero for an empty class', () => {
      expect(getSeatsTaken({ confirmed_count: 0, pending_count: 0 })).toBe(0);
    });
  });

  describe('getSeatsRemaining', () => {
    it('returns the difference when there is room', () => {
      expect(getSeatsRemaining(4, 10)).toBe(6);
    });

    it('never goes negative when oversubscribed', () => {
      expect(getSeatsRemaining(15, 10)).toBe(0);
    });
  });

  describe('getCapacityState', () => {
    it('is open with room to spare', () => {
      expect(getCapacityState(0, 10)).toBe('open');
    });

    it('is open just above the low-seat threshold', () => {
      expect(getCapacityState(10 - (LOW_SEAT_THRESHOLD + 1), 10)).toBe('open');
    });

    it('is limited at the low-seat threshold', () => {
      expect(getCapacityState(10 - LOW_SEAT_THRESHOLD, 10)).toBe('limited');
    });

    it('is limited with a single seat left', () => {
      expect(getCapacityState(9, 10)).toBe('limited');
    });

    it('is full at exactly capacity', () => {
      expect(getCapacityState(10, 10)).toBe('full');
    });

    it('is full when oversubscribed', () => {
      expect(getCapacityState(12, 10)).toBe('full');
    });

    it('treats a zero-capacity class as full', () => {
      expect(getCapacityState(0, 0)).toBe('full');
    });
  });

  describe('isClassFull', () => {
    it('matches the enroll_student rule at the boundary', () => {
      expect(isClassFull(9, 10)).toBe(false);
      expect(isClassFull(10, 10)).toBe(true);
      expect(isClassFull(11, 10)).toBe(true);
    });
  });
});
