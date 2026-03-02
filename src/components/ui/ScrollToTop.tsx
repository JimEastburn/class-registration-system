'use client';

import { useEffect } from 'react';

/**
 * Scrolls the page to the top on mount.
 * Useful for pages that share a layout and may inherit
 * a parent page's scroll position during soft navigation.
 */
export function ScrollToTop() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return null;
}
