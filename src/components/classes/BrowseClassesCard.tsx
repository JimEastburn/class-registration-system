import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function BrowseClassesCard() {
  return (
    <Link href="/parent/browse" className="block md:hidden">
      <Card className="hover:border-primary/50 cursor-pointer border-primary/20 bg-primary/5 transition-colors hover:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Browse Classes</CardTitle>
          <BookOpen className="text-primary h-4 w-4" />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground flex items-center gap-1 text-sm">
            Tap to view classes
            <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
