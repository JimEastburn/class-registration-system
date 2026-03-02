'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Saves and restores scroll position using sessionStorage.
 *
 * Returns a `saveScroll` callback that should be called before
 * navigating away (e.g. in an onClick handler on a Link).
 * On mount, restores the saved position if one exists.
 *
 * @param key Optional override for the storage key (defaults to pathname).
 */
export function useScrollRestore(key?: string) {
  const pathname = usePathname();
  const storageKey = `scroll:${key ?? pathname}`;

  // Restore on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const y = parseInt(saved, 10);
      sessionStorage.removeItem(storageKey);

      if (!isNaN(y) && y > 0) {
        // Poll until the document is tall enough to scroll to the saved position.
        // Handles Suspense where content loads after mount.
        let attempts = 0;
        const maxAttempts = 30;
        let rafId: number;

        const tryRestore = () => {
          attempts++;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll >= y || attempts >= maxAttempts) {
            window.scrollTo(0, Math.min(y, maxScroll));
          } else {
            rafId = requestAnimationFrame(tryRestore);
          }
        };

        rafId = requestAnimationFrame(tryRestore);

        return () => cancelAnimationFrame(rafId);
      }
    }
  }, [storageKey]);

  // Save scroll position imperatively (call before navigation)
  const saveScroll = useCallback(() => {
    sessionStorage.setItem(storageKey, String(window.scrollY));
  }, [storageKey]);

  return { saveScroll };
}
