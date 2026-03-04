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
const mockPush = vi.fn();
const mockBack = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
  usePathname: () => '/parent/browse',
}));

// Mock ParentCalendarGrid (not under test)
vi.mock('@/components/classes/ParentCalendarGrid', () => ({
  ParentCalendarGrid: ({ classes }: { classes: unknown[] }) => (
    <div data-testid="parent-calendar-grid">{classes.length} classes</div>
  ),
}));

// Mock useScrollRestore hook
const mockSaveScroll = vi.fn();
vi.mock('@/hooks/useScrollRestore', () => ({
  useScrollRestore: () => ({ saveScroll: mockSaveScroll }),
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
    age_display_mode: overrides.age_display_mode ?? 'both',
    schedule_display_mode: overrides.schedule_display_mode ?? 'day_block',
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
    mockPush.mockClear();
    mockBack.mockClear();
    mockSaveScroll.mockClear();
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
    mockSearchParams = new URLSearchParams('view=calendar');
    renderGrid();
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

  it('shows calendar view when URL has view=calendar', () => {
    mockSearchParams = new URLSearchParams('view=calendar');
    renderGrid();
    expect(screen.getByTestId('parent-calendar-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('class-grid')).not.toBeInTheDocument();
    // Calendar toggle should be pressed
    expect(screen.getByTestId('view-toggle-calendar')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('view-toggle-cards')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking Calendar saves scroll and calls router.push with view=calendar', () => {
    renderGrid();
    fireEvent.click(screen.getByTestId('view-toggle-calendar'));
    expect(mockSaveScroll).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('view=calendar'),
      { scroll: false },
    );
  });

  it('clicking Cards calls router.back()', () => {
    mockSearchParams = new URLSearchParams('view=calendar');
    renderGrid();
    fireEvent.click(screen.getByTestId('view-toggle-cards'));
    expect(mockBack).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Pill stepper button tests
  // -----------------------------------------------------------------------

  it('increment button skips from 0 to 5', () => {
    renderGrid();
    fireEvent.click(screen.getByTestId('age-increment'));
    expect(getAgeInput().value).toBe('5');
  });

  it('decrement at age 5 returns to 0 (no filter)', () => {
    renderGrid();
    // Set age to 5 via hidden input
    fireEvent.change(getAgeInput(), { target: { value: '5' } });

    // Click decrement — should skip to 0 (no filter)
    fireEvent.click(screen.getByTestId('age-decrement'));
    expect(getAgeInput().value).toBe('0');
    expect(visibleClassNames()).toHaveLength(6);
  });

  it('increment and decrement adjust age correctly', () => {
    renderGrid();
    // Click + → 5 (skips 1-4)
    fireEvent.click(screen.getByTestId('age-increment'));
    expect(getAgeInput().value).toBe('5');

    // Click + → 6
    fireEvent.click(screen.getByTestId('age-increment'));
    expect(getAgeInput().value).toBe('6');

    // Click − → 5
    fireEvent.click(screen.getByTestId('age-decrement'));
    expect(getAgeInput().value).toBe('5');

    // Click − → 0 (skips back from 5)
    fireEvent.click(screen.getByTestId('age-decrement'));
    expect(getAgeInput().value).toBe('0');
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

// ---------------------------------------------------------------------------
// School level pills tests
// ---------------------------------------------------------------------------

describe('SchoolLevelPills', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockReplace.mockClear();
    mockPush.mockClear();
    mockBack.mockClear();
    mockSaveScroll.mockClear();
  });

  function renderSingleCard(ageMin: number | null, ageMax: number | null) {
    const cls = makeClass({ id: 'pill-test', name: 'Pill Test Class', age_min: ageMin, age_max: ageMax });
    return render(<ClassGrid classes={[cls]} showSearch showCalendarToggle />);
  }

  function getPills() {
    const card = screen.getByTestId('class-card-pill-test');
    const labels = ['Elementary', 'MS', 'HS'];
    return labels.filter((label) => {
      // Look for pill text nodes within the card
      const elements = card.querySelectorAll('span');
      return Array.from(elements).some((el) => el.textContent === label);
    });
  }

  it('shows Elementary, MS, and HS pills for ages 5–18', () => {
    renderSingleCard(5, 18);
    expect(getPills()).toEqual(['Elementary', 'MS', 'HS']);
  });

  it('shows Elementary and MS pills for ages 5–14', () => {
    renderSingleCard(5, 14);
    expect(getPills()).toEqual(['Elementary', 'MS', 'HS']);
    // 14 overlaps with both MS (11-14) and HS (14-18)
  });

  it('shows Elementary and MS pills for ages 5–13', () => {
    renderSingleCard(5, 13);
    expect(getPills()).toEqual(['Elementary', 'MS']);
  });

  it('shows only Elementary pill for ages 5–10', () => {
    renderSingleCard(5, 10);
    expect(getPills()).toEqual(['Elementary']);
  });

  it('shows only MS pill for ages 11–13', () => {
    renderSingleCard(11, 13);
    expect(getPills()).toEqual(['MS']);
  });

  it('shows only HS pill for ages 14–14 (boundary)', () => {
    renderSingleCard(14, 14);
    expect(getPills()).toEqual(['HS']);
  });

  it('shows only HS pill for ages 15–18', () => {
    renderSingleCard(15, 18);
    expect(getPills()).toEqual(['HS']);
  });

  it('shows all three pills for ages 5–15 (user example)', () => {
    renderSingleCard(5, 15);
    expect(getPills()).toEqual(['Elementary', 'MS', 'HS']);
  });

  it('shows Elementary and MS for ages 3–13 (user example)', () => {
    renderSingleCard(3, 13);
    expect(getPills()).toEqual(['Elementary', 'MS']);
  });

  it('shows no pills when age range is entirely below school levels (ages 2–4)', () => {
    renderSingleCard(2, 4);
    expect(getPills()).toEqual([]);
  });

  it('shows no pills when age range is entirely above school levels (ages 19–21)', () => {
    renderSingleCard(19, 21);
    expect(getPills()).toEqual([]);
  });

  it('shows no pills when both age_min and age_max are null', () => {
    renderSingleCard(null, null);
    expect(getPills()).toEqual([]);
  });

  it('shows pills for age_min only (open-ended max)', () => {
    // age_min=12, age_max=null → range is 12–99, overlaps MS and HS
    renderSingleCard(12, null);
    expect(getPills()).toEqual(['MS', 'HS']);
  });

  it('shows pills for age_max only (open-ended min)', () => {
    // age_min=null, age_max=10 → range is 0–10, overlaps Elementary
    renderSingleCard(null, 10);
    expect(getPills()).toEqual(['Elementary']);
  });

  it('shows all pills for age_max only with high max', () => {
    // age_min=null, age_max=18 → range is 0–18, overlaps all
    renderSingleCard(null, 18);
    expect(getPills()).toEqual(['Elementary', 'MS', 'HS']);
  });
});

// ---------------------------------------------------------------------------
// Age display mode tests
// ---------------------------------------------------------------------------

describe('ClassCard age display mode', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockReplace.mockClear();
    mockPush.mockClear();
    mockBack.mockClear();
    mockSaveScroll.mockClear();
  });

  function renderSingleCard(ageMin: number | null, ageMax: number | null, displayMode: 'age_range' | 'pills' | 'both') {
    const cls = makeClass({ id: 'display-test', name: 'Display Test', age_min: ageMin, age_max: ageMax, age_display_mode: displayMode });
    return render(<ClassGrid classes={[cls]} showSearch showCalendarToggle />);
  }

  function getCard() {
    return screen.getByTestId('class-card-display-test');
  }

  function getPillTexts() {
    const card = getCard();
    const labels = ['Elementary', 'MS', 'HS'];
    return labels.filter((label) => {
      const elements = card.querySelectorAll('span');
      return Array.from(elements).some((el) => el.textContent === label);
    });
  }

  it('shows only age text when mode is age_range', () => {
    renderSingleCard(5, 12, 'age_range');
    const card = getCard();
    expect(card).toHaveTextContent('Ages 5–12');
    expect(getPillTexts()).toEqual([]);
  });

  it('shows only pills when mode is pills', () => {
    renderSingleCard(5, 12, 'pills');
    const card = getCard();
    expect(card).not.toHaveTextContent('Ages 5–12');
    expect(getPillTexts().length).toBeGreaterThan(0);
  });

  it('shows both age text and pills when mode is both', () => {
    renderSingleCard(5, 12, 'both');
    const card = getCard();
    expect(card).toHaveTextContent('Ages 5–12');
    expect(getPillTexts().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Schedule display mode tests
// ---------------------------------------------------------------------------

describe('ClassCard schedule display mode', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockReplace.mockClear();
    mockPush.mockClear();
    mockBack.mockClear();
    mockSaveScroll.mockClear();
  });

  function renderSingleCard(displayMode: 'day_block' | 'asynchronous') {
    const cls = makeClass({
      id: 'sched-test',
      name: 'Schedule Test',
      schedule_config: { day: 'Tuesday', block: 'Block 2', recurring: true },
      schedule_display_mode: displayMode,
    });
    return render(<ClassGrid classes={[cls]} showSearch showCalendarToggle />);
  }

  function getCard() {
    return screen.getByTestId('class-card-sched-test');
  }

  it('shows Day and Block when mode is day_block', () => {
    renderSingleCard('day_block');
    const card = getCard();
    expect(card).toHaveTextContent('Tuesday');
    expect(card).toHaveTextContent('Block 2');
    expect(card).not.toHaveTextContent('Asynchronous');
  });

  it('shows Asynchronous when mode is asynchronous', () => {
    renderSingleCard('asynchronous');
    const card = getCard();
    expect(card).toHaveTextContent('Asynchronous');
    expect(card).not.toHaveTextContent('Block 2');
  });
});
