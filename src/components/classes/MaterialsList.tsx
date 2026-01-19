'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMaterial, updateMaterial } from '@/lib/actions/materials';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Material {
    id: string;
    name: string;
    description: string | null;
    file_url: string;
    file_type: string;
    is_public: boolean;
    created_at: string;
}

interface MaterialsListProps {
    materials: Material[];
    classId: string;
}

const fileTypeIcons: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    image: '🖼️',
    video: '🎬',
    link: '🔗',
    other: '📎',
};

export default function MaterialsList({ materials, classId }: MaterialsListProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleDelete = async (materialId: string) => {
        if (!confirm('Are you sure you want to delete this material?')) {
            return;
        }

        setLoadingId(materialId);
        const result = await deleteMaterial(materialId);

        if (result.error) {
            alert(result.error);
        } else {
            router.refresh();
        }

        setLoadingId(null);
    };

    const handleToggleVisibility = async (materialId: string, currentlyPublic: boolean) => {
        setLoadingId(materialId);
        const result = await updateMaterial(materialId, { isPublic: !currentlyPublic });

        if (result.error) {
            alert(result.error);
        } else {
            router.refresh();
        }

        setLoadingId(null);
    };

    return (
        <div className="space-y-3">
            {materials.map((material) => (
                <div
                    key={material.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-lg gap-3"
                >
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">
                            {fileTypeIcons[material.file_type] || '📎'}
                        </span>
                        <div>
                            <a
                                href={material.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-purple-600 hover:text-purple-800 hover:underline"
                            >
                                {material.name}
                            </a>
                            {material.description && (
                                <p className="text-sm text-slate-500">{material.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={material.is_public ? 'default' : 'secondary'} className="text-xs">
                                    {material.is_public ? 'Visible to students' : 'Hidden'}
                                </Badge>
                                <span className="text-xs text-slate-400">
                                    {new Date(material.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleVisibility(material.id, material.is_public)}
                            disabled={loadingId === material.id}
                        >
                            {material.is_public ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(material.id)}
                            disabled={loadingId === material.id}
                            className="text-red-600 hover:text-red-700"
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
