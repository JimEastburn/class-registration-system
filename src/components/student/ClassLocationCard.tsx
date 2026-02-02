import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export function ClassLocationCard({ location }: { location: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div>
                <p className="font-medium">{location || 'TBA'}</p>
                {location && (
                    <p className="text-xs text-muted-foreground mt-1">Check building directory for room number unless specified.</p>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
