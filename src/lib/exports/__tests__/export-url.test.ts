import { describe, expect, it } from 'vitest';
import { buildExportUrl, hasExportFilters } from '@/lib/exports/export-url';

describe('export URLs', () => {
  it('keeps class filters and sorting for matching exports but drops pagination', () => {
    const url = new URL(
      buildExportUrl({
        type: 'classes',
        scope: 'matching',
        currentParams: 'search=Art&page=3&limit=50&sort=enrolled&dir=desc',
      }),
      'https://example.test'
    );

    expect(url.searchParams.get('search')).toBe('Art');
    expect(url.searchParams.get('sort')).toBe('enrolled');
    expect(url.searchParams.get('dir')).toBe('desc');
    expect(url.searchParams.has('page')).toBe(false);
    expect(url.searchParams.has('limit')).toBe(false);
  });

  it('drops active filters for all exports while retaining class sort order', () => {
    const url = new URL(
      buildExportUrl({
        type: 'classes',
        scope: 'all',
        currentParams: 'search=Art&sort=name&dir=asc',
      }),
      'https://example.test'
    );

    expect(url.searchParams.has('search')).toBe(false);
    expect(url.searchParams.get('sort')).toBe('name');
    expect(url.searchParams.get('dir')).toBe('asc');
  });

  it('uses fixed filters for a class-scoped scheduler roster', () => {
    const url = new URL(
      buildExportUrl({
        type: 'enrollments',
        scope: 'matching',
        currentParams: '',
        fixedParams: { classId: 'class-123', roster: 'active' },
      }),
      'https://example.test'
    );

    expect(url.searchParams.get('classId')).toBe('class-123');
    expect(url.searchParams.get('roster')).toBe('active');
    expect(
      hasExportFilters('enrollments', '', {
        classId: 'class-123',
        roster: 'active',
      })
    ).toBe(true);
  });

  it('does not treat pagination or class sorting as an active data filter', () => {
    expect(
      hasExportFilters('classes', 'page=2&limit=50&sort=name&dir=asc')
    ).toBe(false);
  });

  it('keeps audit person, action, and date filters for matching exports', () => {
    const url = new URL(
      buildExportUrl({
        type: 'audit',
        scope: 'matching',
        currentParams:
          'actor=Ada+Admin&action=UPDATE_ENROLLMENT_STATUS&startDate=2026-08-01&endDate=2026-08-31&page=2',
      }),
      'https://example.test'
    );

    expect(url.searchParams.get('actor')).toBe('Ada Admin');
    expect(url.searchParams.get('action')).toBe('UPDATE_ENROLLMENT_STATUS');
    expect(url.searchParams.get('startDate')).toBe('2026-08-01');
    expect(url.searchParams.get('endDate')).toBe('2026-08-31');
    expect(url.searchParams.has('page')).toBe(false);
    expect(
      hasExportFilters(
        'audit',
        'actor=Ada+Admin&action=UPDATE_ENROLLMENT_STATUS'
      )
    ).toBe(true);
  });
});
