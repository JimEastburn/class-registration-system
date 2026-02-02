import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Link as LinkIcon, Download, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Material {
    id: string;
    title: string;
    file_url: string;
    type: string;
}

export function ClassMaterialsList({ materials }: { materials: Material[] | null }) {
  const getIcon = (type: string) => {
      switch (type) {
          case 'video': return <Video className="h-4 w-4" />;
          case 'link': return <LinkIcon className="h-4 w-4" />;
          default: return <FileText className="h-4 w-4" />;
      }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Materials</CardTitle>
      </CardHeader>
      <CardContent>
        {!materials || materials.length === 0 ? (
            <p className="text-muted-foreground text-sm">No materials posted yet.</p>
        ) : (
            <ul className="space-y-2">
                {materials.map(m => (
                    <li key={m.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-primary/10 rounded-full text-primary">
                                {getIcon(m.type)}
                            </div>
                            <span className="font-medium text-sm truncate">{m.title}</span>
                        </div>
                        <Link href={m.file_url} target="_blank" rel="noopener noreferrer">
                             <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Download</span>
                             </Button>
                        </Link>
                    </li>
                ))}
            </ul>
        )}
      </CardContent>
    </Card>
  );
}
