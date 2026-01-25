import ClassForm from '@/components/classes/ClassForm';

export const metadata = {
    title: 'Create New Class | Class Registration System',
};

export default function NewClassPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Create New Class</h2>
                <p className="text-muted-foreground">Set up a new class for students to enroll in</p>
            </div>
            <ClassForm />
        </div>
    );
}
