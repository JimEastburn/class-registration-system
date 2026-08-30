const FORMULA_PREFIX = /^[=+\-@\t\r\n\0\uFF1D\uFF0B\uFF0D\uFF20]/;

function encodeCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);

  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Encode a human-facing UTF-8 CSV.
 *
 * Every cell is quoted, untrusted spreadsheet formulas are neutralized, and a
 * UTF-8 BOM is included so Excel opens names with non-ASCII characters cleanly.
 */
export function encodeCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[]
): string {
  const lines = [headers, ...rows].map((row) => row.map(encodeCell).join(','));

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
