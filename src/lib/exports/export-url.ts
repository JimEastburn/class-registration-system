import type { ExportScope, ExportType } from '@/lib/exports/export-data';

const FILTER_KEYS: Record<ExportType, readonly string[]> = {
  users: ['search'],
  classes: ['search'],
  enrollments: [
    'search',
    'status',
    'classId',
    'startDate',
    'endDate',
    'roster',
  ],
};

const PERSISTENT_KEYS: Record<ExportType, readonly string[]> = {
  users: [],
  classes: ['sort', 'dir'],
  enrollments: [],
};

interface ExportUrlOptions {
  type: ExportType;
  scope: ExportScope;
  currentParams: string;
  fixedParams?: Record<string, string>;
}

function activeValue(value: string | null | undefined): boolean {
  return Boolean(value && value !== 'all');
}

export function hasExportFilters(
  type: ExportType,
  currentParams: string,
  fixedParams: Record<string, string> = {}
): boolean {
  const params = new URLSearchParams(currentParams);

  return FILTER_KEYS[type].some((key) =>
    activeValue(fixedParams[key] ?? params.get(key))
  );
}

export function buildExportUrl({
  type,
  scope,
  currentParams,
  fixedParams = {},
}: ExportUrlOptions): string {
  const current = new URLSearchParams(currentParams);
  const output = new URLSearchParams({ type, scope });
  const keys = [
    ...(scope === 'matching' ? FILTER_KEYS[type] : []),
    ...PERSISTENT_KEYS[type],
  ];

  for (const key of keys) {
    const value = fixedParams[key] ?? current.get(key);
    if (activeValue(value)) output.set(key, value!);
  }

  return `/api/export?${output.toString()}`;
}
