import { getSetting } from '@/lib/actions/settings';
import { RegistrationSettingsForm } from '@/components/admin/settings/RegistrationSettingsForm';
import { ClassDefaultsForm } from '@/components/admin/settings/ClassDefaultsForm';
import { RegistrationSettingsFormData, ClassDefaultsFormData } from '@/lib/validations';

export default async function SettingsPage() {
    const [regRes, classRes] = await Promise.all([
        getSetting('registration_settings'),
        getSetting('class_defaults')
    ]);

    const defaultReg: RegistrationSettingsFormData = {
        registrationOpen: false,
        semesterStart: undefined,
        semesterEnd: undefined
    };

    const defaultClass: ClassDefaultsFormData = {
        defaultCapacity: 20,
        paymentDeadlineDays: 7
    };

    const regData = (regRes.success && regRes.data?.value) 
        ? (regRes.data.value as unknown as RegistrationSettingsFormData) 
        : defaultReg;
        
    const classData = (classRes.success && classRes.data?.value)
        ? (classRes.data.value as unknown as ClassDefaultsFormData)
        : defaultClass;

    return (
        <div className="space-y-6 container mx-auto py-6 max-w-4xl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            </div>
            
            <RegistrationSettingsForm initialData={regData} />
            <ClassDefaultsForm initialData={classData} />
        </div>
    );
}
