import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TIME_BLOCKS } from '@/lib/schedule-helpers';
// Checkbox import removed

const WEEKDAYS = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
];

const DURATIONS = [
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '50', label: '50 minutes' },
    { value: '60', label: '1 hour' },
    { value: '70', label: '1 hour 10 mins' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: '180', label: '3 hours' },
];

interface RecurringScheduleInputProps {
    defaultPattern?: string;
    defaultDays?: string[];
    defaultTime?: string;
    defaultDuration?: number;
    onChange?: (schedule: {
        pattern: string;
        days: string[];
        time: string;
        duration: number;
    }) => void;
}


export default function RecurringScheduleInput({
    defaultDays = [],
    defaultTime = '',
    defaultDuration,
    onChange,
}: RecurringScheduleInputProps) {
    // We primarily track selectedDays. 
    // If days are selected, pattern is effectively 'weekly'.
    // If no days are selected, pattern is 'none'.
    const [selectedDays, setSelectedDays] = useState<string[]>(defaultDays);
    const [time, setTime] = useState(defaultTime);
    const [duration, setDuration] = useState<number | undefined>(defaultDuration);

    // Derived pattern state
    const pattern = selectedDays.length > 0 ? 'weekly' : 'none';

    useEffect(() => {
        if (onChange) {
            onChange({
                pattern,
                days: selectedDays,
                time,
                duration: duration || 0,
            });
        }
    }, [pattern, selectedDays, time, duration, onChange]);

    // Helper to find selected block
    const selectedBlock = TIME_BLOCKS.find(b => b.startTime === time);

    const handleBlockChange = (blockId: string) => {
        const block = TIME_BLOCKS.find(b => b.id === blockId);
        if (block) {
            setTime(block.startTime);
            // Auto-set duration based on block type
            if (block.id === 'lunch') {
                setDuration(50);
            } else {
                setDuration(70);
            }
        }
    };

    // Generate schedule preview text
    const generatePreview = () => {
        if (pattern === 'none') return '';

        let text = 'Weekly';

        if (selectedDays.length > 0) {
            const dayLabels = selectedDays
                .map(d => WEEKDAYS.find(w => w.value === d)?.label)
                .filter(Boolean);
            text = `${text} on ${dayLabels.join(', ')}`;
        }
        
        if (selectedBlock) {
             text += ` during ${selectedBlock.label} (${selectedBlock.timeRange})`;
        } else if (time) {
            // Fallback for custom time
             const [h, m] = time.split(':');
             if (h) {
                 const hour = parseInt(h);
                 const ampm = hour >= 12 ? 'PM' : 'AM';
                 const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                 text += ` at ${displayHour}:${m} ${ampm}`;
             }
        }

        if (duration) {
             text += ` (${duration} mins)`;
        }

        return text;
    };

    // Determine current days value for Select
    let currentDaysValue = '';
    const sortedDays = [...selectedDays].sort();
    const daysStr = sortedDays.join(',');
    
    if (daysStr === 'tuesday') currentDaysValue = 'tuesday';
    else if (daysStr === 'thursday') currentDaysValue = 'thursday';
    else if (daysStr === 'thursday,tuesday') currentDaysValue = 'tuesday,thursday'; // sort order: thursday comes before tuesday alphabetically? 'h' vs 'u'. "thursday" < "tuesday". Wait. 'th' vs 'tu'. 'h' < 'u'. So sorted is thursday, tuesday.
    
    if (selectedDays.length === 1 && selectedDays[0] === 'tuesday') currentDaysValue = 'tuesday';
    else if (selectedDays.length === 1 && selectedDays[0] === 'thursday') currentDaysValue = 'thursday';
    else if (selectedDays.length === 1 && selectedDays[0] === 'wednesday') currentDaysValue = 'wednesday';
    else if (selectedDays.length === 2 && selectedDays.includes('tuesday') && selectedDays.includes('thursday')) currentDaysValue = 'tuesday,thursday';
    
    return (
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
            <div>
                <Label>Class Days</Label>
                <Select
                    value={currentDaysValue}
                    onValueChange={(val) => {
                        if (val === 'tuesday,thursday') setSelectedDays(['tuesday', 'thursday']);
                        else if (val === 'tuesday') setSelectedDays(['tuesday']);
                        else if (val === 'thursday') setSelectedDays(['thursday']);
                        else if (val === 'wednesday') setSelectedDays(['wednesday']);
                        else setSelectedDays([]); // Should act as reset/none? Or maybe we don't allow clearing here easily without an explicit "None" option.
                        // Let's add a "None / Clear" option? The requirement says "no Schedule Pattern select".
                        // If user wants to clear, they might select "none".
                    }}
                >
                    <SelectTrigger>
                         <SelectValue placeholder="Select class days" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="tuesday">Tuesday Only</SelectItem>
                        <SelectItem value="thursday">Thursday Only</SelectItem>
                        <SelectItem value="tuesday,thursday">Tuesday & Thursday</SelectItem>
                        <SelectItem value="wednesday">Wednesday Only</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                    Select days to enable recurring schedule.
                </p>
            </div>

            {selectedDays.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="recurrence_block">Time Block</Label>
                        <Select
                            value={selectedBlock?.id || ''}
                            onValueChange={handleBlockChange}
                        >
                            <SelectTrigger id="recurrence_block">
                                <SelectValue placeholder="Select time block" />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_BLOCKS.filter(b => b.id !== 'lunch').map(block => (
                                    <SelectItem key={block.id} value={block.id}>
                                        {block.label} ({block.timeRange})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="recurrence_duration">Duration</Label>
                        <Select
                            value={duration?.toString() || ''}
                            onValueChange={(v) => setDuration(parseInt(v))}
                            disabled={!!selectedBlock}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                                {DURATIONS.map((d) => (
                                    <SelectItem key={d.value} value={d.value}>
                                        {d.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedBlock && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Duration determined by block.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {pattern !== 'none' && (
                <div className="pt-2 border-t">
                    <p className="text-sm text-slate-500">
                        <strong>Preview:</strong>{' '}
                        {generatePreview() || 'Configure schedule above'}
                    </p>
                </div>
            )}
        </div>
    );
}

