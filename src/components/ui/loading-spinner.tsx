import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function LoadingSpinner({ className, ...props }: LoadingSpinnerProps) {
    return (
        <div className={cn("flex justify-center items-center", className)} {...props}>
            <Loader2 className={cn("animate-spin text-current", className)} />
        </div>
    );
}
