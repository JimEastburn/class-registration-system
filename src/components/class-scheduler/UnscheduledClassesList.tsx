import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Class } from '@/types';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface UnscheduledClassesListProps {
    classes: Class[];
}

export function UnscheduledClassesList({ classes }: UnscheduledClassesListProps) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Unscheduled Classes</CardTitle>
                <CardDescription>Draft classes needing schedule assignment.</CardDescription>
            </CardHeader>
            <CardContent>
                {classes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No unscheduled classes found.</p>
                ) : (
                    <div className="space-y-4">
                        {classes.map((c) => (
                            <div key={c.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">{c.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Capacity: {c.capacity}
                                    </p>
                                </div>
                                <Button size="sm" variant="ghost" asChild>
                                    <Link href={`/class-scheduler/classes/${c.id}`}>
                                        Schedule <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
