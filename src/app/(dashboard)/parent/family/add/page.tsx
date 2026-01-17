import FamilyMemberForm from '@/components/family/FamilyMemberForm';

export const metadata = {
    title: 'Add Family Member | Class Registration System',
};

export default function AddFamilyMemberPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Add Family Member</h2>
                <p className="text-slate-500">Add a child or family member to your account</p>
            </div>
            <FamilyMemberForm />
        </div>
    );
}
