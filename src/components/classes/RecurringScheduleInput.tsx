'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

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
}

export default function RecurringScheduleInput({
    defaultPattern = 'none',
    defaultDays = [],
    defaultTime = '',
    defaultDuration,
}: RecurringScheduleInputProps) {
    const [pattern, setPattern] = useState(defaultPattern);
    const [selectedDays, setSelectedDays] = useState<string[]>(defaultDays);

    const handleDayToggle = (day: string, checked: boolean) => {
        if (checked) {
            setSelectedDays([...selectedDays, day]);
        } else {
            setSelectedDays(selectedDays.filter(d => d !== day));
        }
    };

    const showDaysSelector = pattern === 'weekly' || pattern === 'biweekly';
    const showTimeFields = pattern !== 'none';

    // Generate schedule preview text
    const generatePreview = () => {
        if (pattern === 'none') return '';

        let text = '';

        if (showDaysSelector && selectedDays.length > 0) {
            const dayLabels = selectedDays
                .map(d => WEEKDAYS.find(w => w.value === d)?.label)
                .filter(Boolean);
            text = dayLabels.join(', ');
        } else {
            text = pattern.charAt(0).toUpperCase() + pattern.slice(1);
        }

        return text;
    };

    return (
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
            <div>
                <Label htmlFor="recurrence_pattern">Schedule Pattern</Label>
                <Select
                    name="recurrence_pattern"
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
                    <Label>Days of the Week</Label>
                    <p className="text-sm text-slate-500 mb-2">Select which days the class meets</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {WEEKDAYS.map((day) => (
                            <label
                                key={day.value}
                                className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${selectedDays.includes(day.value)
                                        ? 'bg-purple-100 border-purple-300'
                                        : 'bg-white border-slate-200 hover:border-purple-200'
                                    }`}
                            >
                                <Checkbox
                                    checked={selectedDays.includes(day.value)}
                                    onCheckedChange={(checked) => handleDayToggle(day.value, checked as boolean)}
                                />
                                <span className="text-sm">{day.label.slice(0, 3)}</span>
                            </label>
                        ))}
                    </div>
                    {/* Hidden input to pass selected days to form */}
                    <input
                        type="hidden"
                        name="recurrence_days"
                        value={JSON.stringify(selectedDays)}
                    />
                </div>
            )}

            {showTimeFields && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="recurrence_time">Start Time</Label>
                        <Input
                            type="time"
                            id="recurrence_time"
                            name="recurrence_time"
                            defaultValue={defaultTime}
                        />
                    </div>
                    <div>
                        <Label htmlFor="recurrence_duration">Duration</Label>
                        <Select
                            name="recurrence_duration"
                            defaultValue={defaultDuration?.toString()}
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
