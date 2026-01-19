'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMaterial } from '@/lib/actions/materials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface AddMaterialFormProps {
    classId: string;
}

export default function AddMaterialForm({ classId }: AddMaterialFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [fileType, setFileType] = useState('link');
    const [isPublic, setIsPublic] = useState(true);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const fileUrl = formData.get('fileUrl') as string;

        if (!name || !fileUrl) {
            setMessage({ type: 'error', text: 'Name and URL are required' });
            setIsLoading(false);
            return;
        }

        const result = await addMaterial(classId, {
            name,
            description,
            fileUrl,
            fileType,
            isPublic,
        });

        if (result.error) {
            setMessage({ type: 'error', text: result.error });
        } else {
            setMessage({ type: 'success', text: 'Material added successfully!' });
            (e.target as HTMLFormElement).reset();
            router.refresh();
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name">Material Name *</Label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="e.g., Week 1 Lecture Notes"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="fileType">Type</Label>
                    <Select value={fileType} onValueChange={setFileType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="link">🔗 Link / URL</SelectItem>
                            <SelectItem value="pdf">📄 PDF Document</SelectItem>
                            <SelectItem value="doc">📝 Word Document</SelectItem>
                            <SelectItem value="video">🎬 Video</SelectItem>
                            <SelectItem value="image">🖼️ Image</SelectItem>
                            <SelectItem value="other">📎 Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <input type="hidden" name="fileType" value={fileType} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="fileUrl">URL *</Label>
                <Input
                    id="fileUrl"
                    name="fileUrl"
                    type="url"
                    placeholder="https://..."
                    required
                />
                <p className="text-xs text-slate-500">
                    Paste a link to Google Drive, Dropbox, YouTube, or any other URL
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                    id="description"
                    name="description"
                    placeholder="Brief description of the material"
                />
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                />
                <label
                    htmlFor="isPublic"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Visible to enrolled students
                </label>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600"
            >
                {isLoading ? 'Adding...' : 'Add Material'}
            </Button>
        </form>
    );
}
