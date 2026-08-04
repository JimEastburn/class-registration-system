import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassCapacityBadge } from '../ClassCapacityBadge';

describe('ClassCapacityBadge', () => {
  describe('detail variant', () => {
    it('states that the next signup joins the waitlist when full', () => {
      render(<ClassCapacityBadge seatsTaken={12} capacity={12} />);

      expect(
        screen.getByText(/next signup joins the waitlist/i)
      ).toBeInTheDocument();
      expect(screen.getByText('12 of 12 filled')).toBeInTheDocument();
    });

    it('includes the waitlist size when there is one', () => {
      render(
        <ClassCapacityBadge seatsTaken={12} capacity={12} waitlistedCount={3} />
      );

      expect(
        screen.getByText('12 of 12 filled · 3 on waitlist')
      ).toBeInTheDocument();
    });

    it('omits the waitlist clause when nobody is waiting', () => {
      render(
        <ClassCapacityBadge seatsTaken={12} capacity={12} waitlistedCount={0} />
      );

      expect(screen.getByText('12 of 12 filled')).toBeInTheDocument();
      expect(screen.queryByText(/on waitlist/i)).not.toBeInTheDocument();
    });

    it('warns when the class is nearly full', () => {
      render(<ClassCapacityBadge seatsTaken={10} capacity={12} />);

      expect(screen.getByText('Only 2 seats left')).toBeInTheDocument();
    });

    it('uses the singular for a last remaining seat', () => {
      render(<ClassCapacityBadge seatsTaken={11} capacity={12} />);

      expect(screen.getByText('Only 1 seat left')).toBeInTheDocument();
    });

    it('shows counts without a badge when there is room to spare', () => {
      render(<ClassCapacityBadge seatsTaken={2} capacity={12} />);

      expect(screen.getByText('2 of 12 filled')).toBeInTheDocument();
      expect(screen.queryByText(/waitlist/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/seats left/i)).not.toBeInTheDocument();
    });

    it('still reads as full when oversubscribed', () => {
      render(<ClassCapacityBadge seatsTaken={14} capacity={12} />);

      expect(
        screen.getByText(/next signup joins the waitlist/i)
      ).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('tags a full class', () => {
      render(
        <ClassCapacityBadge seatsTaken={12} capacity={12} variant="compact" />
      );

      expect(screen.getByText('12 / 12')).toBeInTheDocument();
      expect(screen.getByText('Full')).toBeInTheDocument();
    });

    it('tags remaining seats when nearly full', () => {
      render(
        <ClassCapacityBadge seatsTaken={11} capacity={12} variant="compact" />
      );

      expect(screen.getByText('11 / 12')).toBeInTheDocument();
      expect(screen.getByText('1 left')).toBeInTheDocument();
    });

    it('shows the ratio alone when there is room', () => {
      render(
        <ClassCapacityBadge seatsTaken={3} capacity={12} variant="compact" />
      );

      expect(screen.getByText('3 / 12')).toBeInTheDocument();
      expect(screen.queryByText('Full')).not.toBeInTheDocument();
      expect(screen.queryByText(/left/i)).not.toBeInTheDocument();
    });
  });
});
