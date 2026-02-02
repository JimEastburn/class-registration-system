'use client';

import { ClassMaterial } from '@/types';
import { deleteMaterial } from '@/lib/actions/materials';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Link as LinkIcon, 
  Video, 
  MoreHorizontal, 
  Trash2,
  ExternalLink 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

interface MaterialsListProps {
  materials: ClassMaterial[];
}

export function MaterialsList({ materials }: MaterialsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deleteMaterial(id);
      if (result.success) {
        toast.success('Material deleted');
      } else {
        toast.error(result.error || 'Failed to delete material');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'video':
        return <Video className="h-5 w-5 text-blue-500" />;
      case 'link':
      default:
        return <LinkIcon className="h-5 w-5 text-green-500" />;
    }
  };

  if (materials.length === 0) {
    return (
      <div className="flex min-h-[150px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No materials yet</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Add files or links to share with your students.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {materials.map((material) => (
        <Card key={material.id} className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <div className="rounded-md bg-muted p-2">
                {getIcon(material.type)}
              </div>
              <div className="space-y-1">
                <CardTitle className="line-clamp-1 text-base">
                  {material.title}
                </CardTitle>
                <CardDescription className="capitalize">
                  {material.type}
                </CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDelete(material.id)}
                  disabled={deletingId === material.id}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full justify-start"
              asChild
            >
              <a
                href={material.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Resource
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
