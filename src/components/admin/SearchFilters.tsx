'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SearchBarProps {
    placeholder?: string;
    paramName?: string;
}

export function SearchBar({ placeholder = 'Search...', paramName = 'q' }: SearchBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const currentValue = searchParams.get(paramName) || '';

    const handleSearch = useCallback(
        (value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(paramName, value);
            } else {
                params.delete(paramName);
            }
            startTransition(() => {
                router.replace(`${pathname}?${params.toString()}`);
            });
        },
        [pathname, router, searchParams, paramName]
    );

    return (
        <div className="relative">
            <Input
                type="search"
                placeholder={placeholder}
                defaultValue={currentValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full sm:w-64"
            />
            {isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                </div>
            )}
        </div>
    );
}

interface FilterSelectProps {
    options: { value: string; label: string }[];
    placeholder?: string;
    paramName: string;
    allLabel?: string;
}

export function FilterSelect({
    options,
    placeholder = 'Filter',
    paramName,
    allLabel = 'All',
}: FilterSelectProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();

    const currentValue = searchParams.get(paramName) || '';

    const handleFilter = useCallback(
        (value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value && value !== 'all') {
                params.set(paramName, value);
            } else {
                params.delete(paramName);
            }
            startTransition(() => {
                router.replace(`${pathname}?${params.toString()}`);
            });
        },
        [pathname, router, searchParams, paramName]
    );

    return (
        <Select value={currentValue || 'all'} onValueChange={handleFilter}>
            <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{allLabel}</SelectItem>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

interface ClearFiltersProps {
    paramNames?: string[];
}

export function ClearFilters({ paramNames = ['q', 'role', 'status'] }: ClearFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const hasFilters = paramNames.some((name) => searchParams.has(name));

    if (!hasFilters) return null;

    const handleClear = () => {
        const params = new URLSearchParams(searchParams.toString());
        paramNames.forEach((name) => params.delete(name));
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear filters
        </Button>
    );
}
