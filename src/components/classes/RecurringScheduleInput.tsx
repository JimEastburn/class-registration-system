import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
    { value: '60', label: '1 hour' },
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
    defaultPattern = 'none',
    defaultDays = [],
    defaultTime = '',
    defaultDuration,
    onChange,
}: RecurringScheduleInputProps) {
    const [pattern, setPattern] = useState(defaultPattern);
    const [selectedDays, setSelectedDays] = useState<string[]>(defaultDays);
    const [time, setTime] = useState(defaultTime);
    const [duration, setDuration] = useState<number | undefined>(defaultDuration);

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

// function removed

    const showDaysSelector = pattern === 'weekly' || pattern === 'biweekly';
    const showTimeFields = pattern !== 'none';

    // Generate schedule preview text
    const generatePreview = () => {
        if (pattern === 'none') return '';

        let text = pattern.charAt(0).toUpperCase() + pattern.slice(1);

        if (showDaysSelector && selectedDays.length > 0) {
            const dayLabels = selectedDays
                .map(d => WEEKDAYS.find(w => w.value === d)?.label)
                .filter(Boolean);
            text = `${text} on ${dayLabels.join(', ')}`;
        }
        
        if (time) {
            // Format time (simple check)
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

    return (
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
            <div>
                <Label htmlFor="recurrence_pattern">Schedule Pattern</Label>
                <Select
                    value={pattern}
                    onValueChange={setPattern}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No recurring schedule</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                </Select>
            </div>


            {showDaysSelector && (
                <div>
                    <Label>Class Days</Label>
                    <Select
                        value={selectedDays.join(',')}
                        onValueChange={(val) => {
                            if (val === 'tuesday,thursday') setSelectedDays(['tuesday', 'thursday']);
                            else if (val === 'wednesday') setSelectedDays(['wednesday']);
                            else setSelectedDays([]);
                        }}
                    >
                        <SelectTrigger>
                             <SelectValue placeholder="Select class days" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="tuesday,thursday">Tuesday & Thursday</SelectItem>
                            <SelectItem value="wednesday">Wednesday Only</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                        Classes can only be scheduled on Tue/Thu or Wed.
                    </p>
                </div>
            )}

            {showTimeFields && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="recurrence_time">Start Time</Label>
                        <Input
                            type="time"
                            id="recurrence_time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="recurrence_duration">Duration</Label>
                        <Select
                            value={duration?.toString() || ''}
                            onValueChange={(v) => setDuration(parseInt(v))}
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
