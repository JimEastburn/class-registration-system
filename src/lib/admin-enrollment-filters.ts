const ADMIN_ENROLLMENT_TIME_ZONE = 'America/Chicago';

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function addUtcCalendarDay(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Convert midnight in the AAC business timezone to an exact UTC instant. */
function zonedMidnightToUtc(value: string): string {
  const utcGuess = new Date(`${value}T00:00:00.000Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ADMIN_ENROLLMENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(utcGuess)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
  const localGuessAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const offset = localGuessAsUtc - utcGuess.getTime();

  return new Date(utcGuess.getTime() - offset).toISOString();
}

export function resolveAdminEnrollmentDateRange(filters?: {
  startDate?: string;
  endDate?: string;
}): {
  startAt?: string;
  endBefore?: string;
  filterError: string | null;
} {
  const startDate = filters?.startDate || undefined;
  const endDate = filters?.endDate || undefined;

  if (
    (startDate && !isValidDateInput(startDate)) ||
    (endDate && !isValidDateInput(endDate))
  ) {
    return { filterError: 'Enter a valid status activity date.' };
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      filterError: 'Start date must be on or before end date.',
    };
  }

  return {
    startAt: startDate ? zonedMidnightToUtc(startDate) : undefined,
    endBefore: endDate
      ? zonedMidnightToUtc(addUtcCalendarDay(endDate))
      : undefined,
    filterError: null,
  };
}
