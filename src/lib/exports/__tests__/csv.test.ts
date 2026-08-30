import { describe, expect, it } from 'vitest';
import { encodeCsv } from '@/lib/exports/csv';

describe('encodeCsv', () => {
  it('always emits a UTF-8 CSV with headers, including for an empty export', () => {
    expect(encodeCsv(['Name', 'Email'], [])).toBe('\uFEFF"Name","Email"\r\n');
  });

  it('quotes fields, doubles quotes, and neutralizes spreadsheet formulas', () => {
    const csv = encodeCsv(
      ['Value'],
      [
        ['=SUM(1,2)'],
        ['+1'],
        ['-1'],
        ['@command'],
        ['\tformula'],
        ['\rformula'],
        ['\nformula'],
        ['A "quoted", value'],
      ]
    );

    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain('"\'+1"');
    expect(csv).toContain('"\'-1"');
    expect(csv).toContain('"\'@command"');
    expect(csv).toContain('"\'\tformula"');
    expect(csv).toContain('"\'\rformula"');
    expect(csv).toContain('"\'\nformula"');
    expect(csv).toContain('"A ""quoted"", value"');
  });
});
