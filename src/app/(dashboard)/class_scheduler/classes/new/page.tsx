'use client';

import ClassForm from '@/components/classes/ClassForm';

export default function NewClassPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Create New Class</h2>
                <p className="text-muted-foreground">Set up a new class for students</p>
            </div>
            <ClassForm redirectUrl="/class_scheduler/classes" />
        </div>
    );
}
