import { describe, it, expect } from 'vitest';
import {
  resolveBlockName,
  toUpcomingClass,
  sortUpcomingClasses,
  type CalendarEventRow,
} from '../NextClassCard';

/** Helper to build a minimal CalendarEventRow with required fields filled. */
function makeRow(partial: {
  date?: string | null;
  block?: string | null;
  location?: string | null;
  class?: {
    name: string;
    location?: string | null;
    block?: string | null;
    schedule_config?: { day: string; block: string; recurring: boolean } | null;
  };
}): CalendarEventRow {
  return {
    date: partial.date ?? '2026-03-01',
    block: partial.block ?? null,
    location: partial.location ?? null,
    ...(partial.class !== undefined
      ? {
          class: {
            name: partial.class.name,
            location: partial.class.location ?? null,
            block: partial.class.block ?? null,
            ...(partial.class.schedule_config !== undefined
              ? { schedule_config: partial.class.schedule_config }
              : {}),
          },
        }
      : {}),
  };
}

describe('NextClassCard helpers', () => {
  // ─── resolveBlockName ───────────────────────────────────────────────────

  describe('resolveBlockName', () => {
    it('returns event.block when present', () => {
      const row = makeRow({
        block: 'Block 3',
        class: {
          name: 'Art',
          block: 'Block 1',
          schedule_config: { day: 'Monday', block: 'Block 2', recurring: true },
        },
      });
      expect(resolveBlockName(row)).toBe('Block 3');
    });

    it('falls back to class.block when event.block is missing', () => {
      const row = makeRow({
        class: {
          name: 'Art',
          block: 'Block 1',
          schedule_config: { day: 'Monday', block: 'Block 2', recurring: true },
        },
      });
      expect(resolveBlockName(row)).toBe('Block 1');
    });

    it('falls back to schedule_config.block when class.block is also missing', () => {
      const row = makeRow({
        class: {
          name: 'Art',
          schedule_config: { day: 'Wednesday', block: 'Block 5', recurring: true },
        },
      });
      expect(resolveBlockName(row)).toBe('Block 5');
    });

    it('returns TBA when no block info exists anywhere', () => {
      const row = makeRow({ class: { name: 'Art' } });
      expect(resolveBlockName(row)).toBe('TBA');
    });

    it('returns TBA when class is missing entirely', () => {
      const row = makeRow({});
      expect(resolveBlockName(row)).toBe('TBA');
    });

    it('returns TBA when schedule_config is null', () => {
      const row = makeRow({
        class: { name: 'Music', schedule_config: null },
      });
      expect(resolveBlockName(row)).toBe('TBA');
    });
  });

  // ─── toUpcomingClass ────────────────────────────────────────────────────

  describe('toUpcomingClass', () => {
    it('maps a full event row correctly', () => {
      const row = makeRow({
        date: '2026-03-15',
        block: 'Block 2',
        location: 'Room 101',
        class: { name: 'Science Lab', location: 'Building A' },
      });
      const result = toUpcomingClass(row);

      expect(result.className).toBe('Science Lab');
      expect(result.block).toBe('Block 2');
      expect(result.location).toBe('Room 101');
      expect(result.date.toISOString()).toContain('2026-03-15');
    });

    it('falls back to class location when event location is missing', () => {
      const row = makeRow({
        date: '2026-03-15',
        block: 'Block 1',
        class: { name: 'Math', location: 'Building B' },
      });
      expect(toUpcomingClass(row).location).toBe('Building B');
    });

    it('defaults location to TBD when all location fields are missing', () => {
      const row = makeRow({
        date: '2026-03-15',
        block: 'Block 1',
        class: { name: 'English' },
      });
      expect(toUpcomingClass(row).location).toBe('TBD');
    });

    it('defaults className to "Untitled Class" when class is missing', () => {
      const row = makeRow({ date: '2026-03-15' });
      expect(toUpcomingClass(row).className).toBe('Untitled Class');
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
