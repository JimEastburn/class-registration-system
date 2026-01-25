import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import DashboardLayout from '../DashboardLayout';
import { useRouter, usePathname } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
    usePathname: vi.fn(),
}));

// Mock the icons since they are functional components
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('lucide-react')>();
    return {
        ...actual,
        Loader2: () => <div data-testid="loader">Loader</div>,
        XIcon: () => <div data-testid="x-icon">X</div>,
    };
});

describe('DashboardLayout', () => {
    const mockUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'teacher',
    };

    const mockNavItems = [
        { href: '/teacher', label: 'Dashboard', icon: <span>Icon</span> },
    ];

    const mockPush = vi.fn();

    beforeEach(() => {
        (useRouter as Mock).mockReturnValue({
            push: mockPush,
        });
        (usePathname as Mock).mockReturnValue('/teacher');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders children and navigation', () => {
        render(
            <DashboardLayout user={mockUser} navItems={mockNavItems} title="Dashboard">
                <div data-testid="child-content">Child Content</div>
            </DashboardLayout>
        );

        expect(screen.getByTestId('child-content')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('renders role switcher for teacher/admin', () => {
        render(
            <DashboardLayout user={mockUser} navItems={mockNavItems} title="Dashboard">
                <div>Content</div>
            </DashboardLayout>
        );

        expect(screen.getByText('Teacher View')).toBeInTheDocument();
        expect(screen.getByText('Parent View')).toBeInTheDocument();
    });

    it('switches to parent view when clicked', async () => {
        const user = userEvent.setup();
        render(
            <DashboardLayout user={mockUser} navItems={mockNavItems} title="Dashboard">
                <div>Content</div>
            </DashboardLayout>
        );

        const parentTab = screen.getByText('Parent View');
        await user.click(parentTab);

        expect(mockPush).toHaveBeenCalledWith('/parent');
    });

    it('switches to role view when clicked', async () => {
        const user = userEvent.setup();
        (usePathname as Mock).mockReturnValue('/parent');

        render(
            <DashboardLayout user={mockUser} navItems={mockNavItems} title="Dashboard">
                <div>Content</div>
            </DashboardLayout>
        );

        const roleTab = screen.getByText('Teacher View');
        await user.click(roleTab);

        expect(mockPush).toHaveBeenCalledWith('/teacher');
    });
});
