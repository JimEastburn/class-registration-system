import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowseClassesCard } from '../BrowseClassesCard';

describe('BrowseClassesCard', () => {
  it('renders the card title "Browse Classes"', () => {
    render(<BrowseClassesCard />);
    expect(screen.getByText('Browse Classes')).toBeInTheDocument();
  });

  it('renders the helper text "Tap to view classes"', () => {
    render(<BrowseClassesCard />);
    expect(screen.getByText('Tap to view classes')).toBeInTheDocument();
  });

  it('links to /parent/browse', () => {
    render(<BrowseClassesCard />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/parent/browse');
  });

  it('has md:hidden class for mobile-only visibility', () => {
    render(<BrowseClassesCard />);
    const link = screen.getByRole('link');
    expect(link.className).toMatch(/md:hidden/);
  });
});
