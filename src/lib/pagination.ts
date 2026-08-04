/** Page sizes offered by rows-per-page pickers. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Resolve a `limit` search param to a supported page size, falling back to the
 * default for anything unrecognized (hand-edited URLs, stale bookmarks).
 */
export function resolvePageSize(limit?: string): number {
  const parsed = Number(limit);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_PAGE_SIZE;
}
