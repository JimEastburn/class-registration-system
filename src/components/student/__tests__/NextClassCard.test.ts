import { describe, it, expect } from 'vitest';
import {
  resolveBlockName,
  toUpcomingClass,
  sortUpcomingClasses,
  type CalendarEventRow,
} from '../NextClassCard';

describe('NextClassCard helpers', () => {
  // ─── resolveBlockName ───────────────────────────────────────────────────

  describe('resolveBlockName', () => {
    it('returns event.block when present', () => {
      const event: CalendarEventRow = {
        date: '2026-03-01',
        block: 'Block 3',
        class: {
          name: 'Art',
          block: 'Block 1',
          schedule_config: { block: 'Block 2' },
        },
      };
      expect(resolveBlockName(event)).toBe('Block 3');
    });

    it('falls back to class.block when event.block is missing', () => {
      const event: CalendarEventRow = {
        date: '2026-03-01',
        class: {
          name: 'Art',
          block: 'Block 1',
          schedule_config: { block: 'Block 2' },
        },
      };
      expect(resolveBlockName(event)).toBe('Block 1');
    });

    it('falls back to schedule_config.block when class.block is also missing', () => {
      const event: CalendarEventRow = {
        date: '2026-03-01',
        class: {
          name: 'Art',
          schedule_config: { block: 'Block 5' },
        },
      };
      expect(resolveBlockName(event)).toBe('Block 5');
    });

    it('returns TBA when no block info exists anywhere', () => {
      const event: CalendarEventRow = {
        date: '2026-03-01',
        class: { name: 'Art' },
      };
      expect(resolveBlockName(event)).toBe('TBA');
    });

    it('returns TBA when class is missing entirely', () => {
      const event: CalendarEventRow = { date: '2026-03-01' };
      expect(resolveBlockName(event)).toBe('TBA');
    });

    it('returns TBA when schedule_config is null', () => {
      const event: CalendarEventRow = {
        date: '2026-03-01',
        class: { name: 'Music', schedule_config: null },
      };
      expect(resolveBlockName(event)).toBe('TBA');
    });
  });

  // ─── toUpcomingClass ────────────────────────────────────────────────────

  describe('toUpcomingClass', () => {
    it('maps a full event row correctly', () => {
      const event: CalendarEventRow = {
        date: '2026-03-15',
        block: 'Block 2',
        location: 'Room 101',
        class: { name: 'Science Lab', location: 'Building A' },
      };
      const result = toUpcomingClass(event);

      expect(result.className).toBe('Science Lab');
      expect(result.block).toBe('Block 2');
      expect(result.location).toBe('Room 101');
      expect(result.date.toISOString()).toContain('2026-03-15');
    });

    it('falls back to class location when event location is missing', () => {
      const event: CalendarEventRow = {
        date: '2026-03-15',
        block: 'Block 1',
        class: { name: 'Math', location: 'Building B' },
      };
      expect(toUpcomingClass(event).location).toBe('Building B');
    });

    it('defaults location to TBD when all location fields are missing', () => {
      const event: CalendarEventRow = {
        date: '2026-03-15',
        block: 'Block 1',
        class: { name: 'English' },
      };
      expect(toUpcomingClass(event).location).toBe('TBD');
    });

    it('defaults className to "Untitled Class" when class.name is missing', () => {
      const event: CalendarEventRow = { date: '2026-03-15' };
      expect(toUpcomingClass(event).className).toBe('Untitled Class');
    });
  });

  // ─── sortUpcomingClasses ────────────────────────────────────────────────

  describe('sortUpcomingClasses', () => {
    it('sorts by date ascending', () => {
      const classes = [
        { className: 'Late', date: new Date('2026-03-20'), block: 'Block 1', location: 'A' },
        { className: 'Early', date: new Date('2026-03-10'), block: 'Block 1', location: 'B' },
        { className: 'Mid', date: new Date('2026-03-15'), block: 'Block 1', location: 'C' },
      ];

      const sorted = sortUpcomingClasses(classes);
      expect(sorted.map((c) => c.className)).toEqual(['Early', 'Mid', 'Late']);
    });

    it('sorts by block name when dates are the same', () => {
      const sameDate = new Date('2026-03-15');
      const classes = [
        { className: 'C', date: sameDate, block: 'Block 3', location: 'A' },
        { className: 'A', date: sameDate, block: 'Block 1', location: 'B' },
        { className: 'B', date: sameDate, block: 'Block 2', location: 'C' },
      ];

      const sorted = sortUpcomingClasses(classes);
      expect(sorted.map((c) => c.className)).toEqual(['A', 'B', 'C']);
    });

    it('does not mutate the original array', () => {
      const original = [
        { className: 'B', date: new Date('2026-03-20'), block: 'Block 1', location: 'A' },
        { className: 'A', date: new Date('2026-03-10'), block: 'Block 1', location: 'B' },
      ];
      const copy = [...original];

      sortUpcomingClasses(original);
      expect(original).toEqual(copy);
    });

    it('returns empty array for empty input', () => {
      expect(sortUpcomingClasses([])).toEqual([]);
    });
  });
});
