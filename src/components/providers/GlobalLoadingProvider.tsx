'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GlobalLoadingContextType {
    isLoading: boolean;
    startLoading: () => void;
    stopLoading: () => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
    const [loadingCount, setLoadingCount] = useState(0);

    const startLoading = useCallback(() => {
        setLoadingCount((prev) => prev + 1);
    }, []);

    const stopLoading = useCallback(() => {
        setLoadingCount((prev) => Math.max(0, prev - 1));
    }, []);

    const isLoading = loadingCount > 0;

    return (
        <GlobalLoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
            {children}
        </GlobalLoadingContext.Provider>
    );
}

export function useGlobalLoading() {
    const context = useContext(GlobalLoadingContext);
    if (context === undefined) {
        throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
    }
    return context;
}
