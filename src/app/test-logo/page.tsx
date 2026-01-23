'use client';
import DashboardLayout, { HomeIcon } from '@/components/dashboard/DashboardLayout';

export default function TestLogoPage() {
    const user = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'admin'
    };
    const navItems = [
        { href: '/test-logo', label: 'Test', icon: <HomeIcon className="h-5 w-5" /> }
    ];
    return (
        <DashboardLayout user={user} navItems={navItems} title="Testing Resized Logo">
            <div>Logo should be slightly bigger now.</div>
        </DashboardLayout>
    );
}
