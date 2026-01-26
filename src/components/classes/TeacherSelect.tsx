import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';


interface TeacherSelectProps {
    teachers: { id: string; full_name: string }[];
    value?: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export default function TeacherSelect({ teachers, value, onChange, disabled }: TeacherSelectProps) {
    return (
        <Select onValueChange={onChange} defaultValue={value} value={value} disabled={disabled}>
            <SelectTrigger>
                <SelectValue placeholder="Select a teacher" />
            </SelectTrigger>
            <SelectContent>
                {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
