export function getAuditActionFilterTerms(
  action: string | null | undefined
): string[] {
  const terms = (action || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

  return [...new Set(terms)];
}
