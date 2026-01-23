import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserRoleLegend from '../UserRoleLegend';

describe('UserRoleLegend', () => {
    it('renders the collapsed state initially', () => {
        render(<UserRoleLegend />);

        expect(screen.getByText('Understanding User Roles')).toBeInTheDocument();
        // The descriptions should not be visible initially
        expect(screen.queryByText(/Manage family, enroll children, pay fees/i)).not.toBeInTheDocument();
    });

    it('expands when clicked and shows all roles', () => {
        render(<UserRoleLegend />);

        const trigger = screen.getByText('Understanding User Roles');
        fireEvent.click(trigger);

        // Check for role titles
        expect(screen.getByText('Parent')).toBeInTheDocument();
        expect(screen.getByText('Teacher')).toBeInTheDocument();
        expect(screen.getByText('Student')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();

        // Check for descriptions
        expect(screen.getByText(/Primary account holders who manage family profiles/i)).toBeInTheDocument();
        expect(screen.getByText(/Instructors who can create and manage their own classes/i)).toBeInTheDocument();
        expect(screen.getByText(/Family members enrolled in classes/i)).toBeInTheDocument();
        expect(screen.getByText(/System administrators with full access to all data/i)).toBeInTheDocument();
    });
});
