'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
    type: string;
    label: string;
    description: string;
}

function ExportButton({ type, label, description }: ExportButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleExport = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/export?type=${type}`);

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="font-semibold text-lg">{label}</h3>
                        <p className="text-slate-500 text-sm">{description}</p>
                    </div>
                    <Button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-[#4c7c92] to-[#9BBFD3]"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="mr-2 h-4 w-4" />
                                Download CSV
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    );
}

export default function ExportPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Export Data</h2>
                <p className="text-slate-500">Download your data as CSV files</p>
            </div>

            <div className="grid gap-4">
                <ExportButton
                    type="users"
                    label="Users"
                    description="Export all user accounts including names, emails, roles, and join dates"
                />

                <ExportButton
                    type="classes"
                    label="Classes"
                    description="Export all classes with teacher info, schedules, fees, and enrollment counts"
                />

                <ExportButton
                    type="enrollments"
                    label="Enrollments"
                    description="Export all enrollments with student names, class names, and status"
                />

                <ExportButton
                    type="payments"
                    label="Payments"
                    description="Export all payment records with amounts, status, and Stripe IDs"
                />
            </div>

            <Card className="border-0 shadow-lg bg-slate-50">
                <CardHeader>
                    <CardTitle className="text-base">Export Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                    <p>• Files are exported in CSV format, compatible with Excel, Google Sheets, and other spreadsheet applications.</p>
                    <p>• All dates are formatted as MM/DD/YYYY.</p>
                    <p>• Large exports may take a few seconds to prepare.</p>
                    <p>• Sensitive data (like passwords) is never included in exports.</p>
                </CardContent>
            </Card>
        </div>
    );
}
