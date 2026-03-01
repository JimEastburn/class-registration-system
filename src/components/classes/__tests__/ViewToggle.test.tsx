import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ViewToggle } from '../ViewToggle';

describe('ViewToggle', () => {
  it('renders Cards as active when calendarView is false', () => {
    render(<ViewToggle calendarView={false} onToggle={vi.fn()} />);

    const cardsBtn = screen.getByTestId('view-toggle-cards');
    const calendarBtn = screen.getByTestId('view-toggle-calendar');

    expect(cardsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(calendarBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders Calendar as active when calendarView is true', () => {
    render(<ViewToggle calendarView={true} onToggle={vi.fn()} />);

    const cardsBtn = screen.getByTestId('view-toggle-cards');
    const calendarBtn = screen.getByTestId('view-toggle-calendar');

    expect(cardsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(calendarBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onToggle(true) when Calendar button is clicked', () => {
    const onToggle = vi.fn();
    render(<ViewToggle calendarView={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByTestId('view-toggle-calendar'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('calls onToggle(false) when Cards button is clicked', () => {
    const onToggle = vi.fn();
    render(<ViewToggle calendarView={true} onToggle={onToggle} />);

    fireEvent.click(screen.getByTestId('view-toggle-cards'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
