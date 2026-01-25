'use client';

import {
    Info,
    User,
    Users,
    GraduationCap,
    ShieldCheck,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const roles = [
    {
        name: 'Parent',
        id: 'parent',
        icon: User,
        color: 'bg-[#4c7c92]/10 text-[#4c7c92]',
        description: 'Primary account holders who manage family profiles, enroll children in classes, and handle fee payments.',
        access: 'Access to Parent Portal'
    },
    {
        name: 'Teacher',
        id: 'teacher',
        icon: Users,
        color: 'bg-blue-100 text-blue-700',
        description: 'Instructors who can create and manage their own classes, view student rosters, and also manage their own family.',
        access: 'Access to Teacher & Parent Portals'
    },
    {
        name: 'Student',
        id: 'student',
        icon: GraduationCap,
        color: 'bg-green-100 text-green-700',
        description: 'Family members enrolled in classes. They can view their own schedules and class details.',
        access: 'Access to Student Portal'
    },
    {
        name: 'Admin',
        id: 'admin',
        icon: ShieldCheck,
        color: 'bg-red-100 text-red-700',
        description: 'System administrators with full access to all data, management tools, and reporting exports.',
        access: 'Full System Access'
    },
    {
        name: 'Class Scheduler',
        id: 'class_scheduler',
        icon: ShieldCheck,
        color: 'bg-purple-100 text-purple-700',
        description: 'Authorized personnel who can create/manage classes, enrolled students, and waitlists while maintaining parent view.',
        access: 'Class Management + Parent Portal'
    }
];

export default function UserRoleLegend() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card className="border-0 shadow-md bg-slate-50/50 overflow-hidden mt-4">
            <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Info className="w-4 h-4 text-[#4c7c92]" />
                    <span>Understanding User Roles</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>

            {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-2">
                        {roles.map((item) => (
                            <div key={item.id} className="space-y-2 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <item.icon className="w-4 h-4 text-slate-400" />
                                    <Badge className={`${item.color} border-0`}>
                                        {item.name}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {item.description}
                                </p>
                                <div className="pt-2 border-t border-slate-50">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                        Primary Access
                                    </p>
                                    <p className="text-[10px] text-slate-500 italic">
                                        {item.access}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
