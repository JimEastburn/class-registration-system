import { render, screen, fireEvent } from '@testing-library/react';
import { ClassGrid } from '../ClassGrid';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Class } from '@/types';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/navigation
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/parent/browse',
}));

// Mock ParentCalendarGrid (not under test)
vi.mock('@/components/classes/ParentCalendarGrid', () => ({
  ParentCalendarGrid: ({ classes }: { classes: unknown[] }) => (
    <div data-testid="parent-calendar-grid">{classes.length} classes</div>
  ),
}));

// Mock useScrollRestore hook
vi.mock('@/hooks/useScrollRestore', () => ({
  useScrollRestore: () => ({ saveScroll: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClass(
  overrides: Partial<Class> & { teacher?: { id: string; first_name: string | null; last_name: string | null } | null }
): Class & { teacher: { id: string; first_name: string | null; last_name: string | null } | null } {
  const base: Class = {
    id: overrides.id ?? crypto.randomUUID(),
    teacher_id: 't1',
    name: overrides.name ?? 'Test Class',
    description: overrides.description ?? null,
    capacity: overrides.capacity ?? 20,
    price: overrides.price ?? 30,
    location: overrides.location ?? null,
    schedule_config: overrides.schedule_config ?? null,
    status: overrides.status ?? 'published',
    day: overrides.day ?? null,
    block: overrides.block ?? null,
    start_date: overrides.start_date ?? null,
    end_date: overrides.end_date ?? null,
    age_min: overrides.age_min ?? null,
    age_max: overrides.age_max ?? null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
  return {
    ...base,
    ...overrides,
    teacher: overrides.teacher ?? { id: 't1', first_name: 'Test', last_name: 'Teacher' },
  };
}

const CLASSES = [
  makeClass({ id: 'elem', name: 'Elementary Art', age_min: 6, age_max: 11 }),
  makeClass({ id: 'ms', name: 'Middle School Science', age_min: 11, age_max: 14 }),
  makeClass({ id: 'hs', name: 'AP Chemistry', age_min: 14, age_max: 18 }),
  makeClass({ id: 'open-min', name: 'Advanced Choir', age_min: 12, age_max: null }),
  makeClass({ id: 'open-max', name: 'Intro to Music', age_min: null, age_max: 10 }),
  makeClass({ id: 'no-range', name: 'HS Algebra I', age_min: null, age_max: null }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClassGrid age filter', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockReplace.mockClear();
  });

  function renderGrid() {
    return render(
      <ClassGrid classes={CLASSES} showSearch showCalendarToggle />
    );
  }

  function getAgeInput(): HTMLInputElement {
    return screen.getByTestId('child-age-input') as HTMLInputElement;
  }

  function visibleClassNames(): string[] {
    return screen
      .getAllByTestId(/^class-card-/)
      .map((el) => el.getAttribute('data-testid')!.replace('class-card-', ''));
  }

  it('renders the age input when showCalendarToggle is true', () => {
    renderGrid();
    expect(getAgeInput()).toBeInTheDocument();
    expect(screen.getByText("Child's age")).toBeInTheDocument();
  });

  it('does NOT render the age input when showCalendarToggle is false', () => {
    render(<ClassGrid classes={CLASSES} showSearch />);
    expect(screen.queryByTestId('child-age-input')).not.toBeInTheDocument();
  });

  it('shows all classes when age is 0 (no filter)', () => {
    renderGrid();
    expect(getAgeInput().value).toBe('0');
    expect(visibleClassNames()).toEqual(
      expect.arrayContaining(['elem', 'ms', 'hs', 'open-min', 'open-max', 'no-range'])
    );
    expect(visibleClassNames()).toHaveLength(6);
  });

  it('filters to only matching classes when age is entered (age 8)', () => {
    renderGrid();
    fireEvent.change(getAgeInput(), { target: { value: '8' } });

    const ids = visibleClassNames();
    // Should match: Elementary Art (6-11), Intro to Music (null-10), HS Algebra I (null-null)
    expect(ids).toContain('elem');
    expect(ids).toContain('open-max');
    expect(ids).toContain('no-range');
    // Should NOT match: Middle School Science (11-14), AP Chemistry (14-18), Advanced Choir (12+)
    expect(ids).not.toContain('ms');
    expect(ids).not.toContain('hs');
    expect(ids).not.toContain('open-min');
  });

  it('filters correctly for age at boundary (age 11)', () => {
    renderGrid();
    fireEvent.change(getAgeInput(), { target: { value: '11' } });

    const ids = visibleClassNames();
    // Should match: Elementary Art (6-11 inclusive), Middle School Science (11-14 inclusive),
    //               HS Algebra I (no range), no match for open-max (max=10)
    expect(ids).toContain('elem');     // 11 is within 6-11
    expect(ids).toContain('ms');       // 11 is within 11-14
    expect(ids).toContain('no-range'); // always shown
    expect(ids).not.toContain('hs');       // 14-18
    expect(ids).not.toContain('open-max'); // max 10
  });

  it('shows classes with only age_min when age meets minimum (age 15)', () => {
    renderGrid();
    fireEvent.change(getAgeInput(), { target: { value: '15' } });

    const ids = visibleClassNames();
    // Advanced Choir (12+) should be visible
    expect(ids).toContain('open-min');
    // AP Chemistry (14-18) should be visible
    expect(ids).toContain('hs');
    expect(ids).toContain('no-range');
    // Elementary Art (6-11) should NOT be visible
    expect(ids).not.toContain('elem');
  });

  it('hides classes with only age_min when age is below minimum', () => {
    renderGrid();
    fireEvent.change(getAgeInput(), { target: { value: '10' } });

    const ids = visibleClassNames();
    // Advanced Choir (12+) should NOT be visible
    expect(ids).not.toContain('open-min');
    // Intro to Music (max 10) should be visible
    expect(ids).toContain('open-max');
  });

  it('always shows classes with no age range set', () => {
    renderGrid();
    fireEvent.change(getAgeInput(), { target: { value: '5' } });
    expect(visibleClassNames()).toContain('no-range');

    fireEvent.change(getAgeInput(), { target: { value: '18' } });
    expect(visibleClassNames()).toContain('no-range');

    fireEvent.change(getAgeInput(), { target: { value: '99' } });
    expect(visibleClassNames()).toContain('no-range');
  });

  it('restores all classes when age input is cleared', () => {
    renderGrid();
    fireEvent.change(getAgeInput(), { target: { value: '8' } });
    expect(visibleClassNames().length).toBeLessThan(6);

    fireEvent.change(getAgeInput(), { target: { value: '0' } });
    expect(visibleClassNames()).toHaveLength(6);
  });

  it('shows result count when age filter is active', () => {
    renderGrid();
    fireEvent.change(getAgeInput(), { target: { value: '8' } });
    expect(screen.getByText(/3 classes found/)).toBeInTheDocument();
  });

  it('shows empty state when no classes match', () => {
    renderGrid();
    fireEvent.change(getAgeInput(), { target: { value: '3' } });
    // Only no-range (HS Algebra I) should match — age 3 is below all minimums
    // open-max has max=10 so age 3 passes, and no-range always passes
    const ids = visibleClassNames();
    expect(ids).toContain('no-range');
    expect(ids).toContain('open-max');
  });

  it('combines age filter with text search', () => {
    renderGrid();
    // Set age to 8 — matches elem, open-max, no-range
    fireEvent.change(getAgeInput(), { target: { value: '8' } });
    // Then also search for "Elementary"
    fireEvent.change(screen.getByTestId('class-search-input'), {
      target: { value: 'Elementary' },
    });

    const ids = visibleClassNames();
    expect(ids).toEqual(['elem']);
  });

  it('filters calendar view classes by age too', () => {
    renderGrid();
    // Toggle calendar view on via segmented control
    fireEvent.click(screen.getByTestId('view-toggle-calendar'));
    // Set age filter
    fireEvent.change(getAgeInput(), { target: { value: '8' } });

    // Calendar grid should receive the filtered count
    expect(screen.getByTestId('parent-calendar-grid')).toHaveTextContent('3 classes');
  });

  it('renders segmented toggle with Cards active by default', () => {
    renderGrid();
    const cardsBtn = screen.getByTestId('view-toggle-cards');
    const calendarBtn = screen.getByTestId('view-toggle-calendar');
    expect(cardsBtn).toBeInTheDocument();
    expect(calendarBtn).toBeInTheDocument();
    // Cards should be pressed by default
    expect(cardsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(calendarBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles back to cards view when Cards button clicked', () => {
    renderGrid();
    // Switch to calendar
    fireEvent.click(screen.getByTestId('view-toggle-calendar'));
    expect(screen.getByTestId('parent-calendar-grid')).toBeInTheDocument();

    // Switch back to cards
    fireEvent.click(screen.getByTestId('view-toggle-cards'));
    expect(screen.getByTestId('class-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('parent-calendar-grid')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Pill stepper button tests
  // -----------------------------------------------------------------------

  it('increment button sets age from 0 to 1', () => {
    renderGrid();
    fireEvent.click(screen.getByTestId('age-increment'));
    expect(getAgeInput().value).toBe('1');
  });

  it('decrement at age 1 returns to 0 (no filter)', () => {
    renderGrid();
    // Set age to 1 via hidden input
    fireEvent.change(getAgeInput(), { target: { value: '1' } });
    // Age 1 matches: open-max (≤10) and no-range (always) = 2 classes
    expect(visibleClassNames().length).toBe(2);

    // Click decrement — should go to 0 (no filter)
    fireEvent.click(screen.getByTestId('age-decrement'));
    expect(getAgeInput().value).toBe('0');
    expect(visibleClassNames()).toHaveLength(6);
  });

  it('increment and decrement adjust age correctly', () => {
    renderGrid();
    // Click + → 1
    fireEvent.click(screen.getByTestId('age-increment'));
    expect(getAgeInput().value).toBe('1');

    // Click + → 2
    fireEvent.click(screen.getByTestId('age-increment'));
    expect(getAgeInput().value).toBe('2');

    // Click − → 1
    fireEvent.click(screen.getByTestId('age-decrement'));
    expect(getAgeInput().value).toBe('1');
  });

  it('initializes child age from URL search param "age"', () => {
    mockSearchParams = new URLSearchParams('age=8');
    renderGrid();

    // Age should be initialized to 8
    expect(getAgeInput().value).toBe('8');

    // Only age-8-matching classes should be visible
    const ids = visibleClassNames();
    expect(ids).toContain('elem');      // 6-11
    expect(ids).toContain('open-max');   // ≤10
    expect(ids).toContain('no-range');   // always
    expect(ids).not.toContain('ms');     // 11-14
    expect(ids).not.toContain('hs');     // 14-18
    expect(ids).not.toContain('open-min'); // 12+
  });
});
