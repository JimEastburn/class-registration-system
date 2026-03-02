import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/parent/browse',
}));

import { useScrollRestore } from '../useScrollRestore';

describe('useScrollRestore', () => {
  const STORAGE_KEY = 'scroll:/parent/browse';

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores saved scroll position on mount', () => {
    sessionStorage.setItem(STORAGE_KEY, '450');

    renderHook(() => useScrollRestore());

    expect(window.scrollTo).toHaveBeenCalledWith(0, 450);
  });

  it('clears saved position after restoring', () => {
    sessionStorage.setItem(STORAGE_KEY, '450');

    renderHook(() => useScrollRestore());

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not call scrollTo when no saved position exists', () => {
    renderHook(() => useScrollRestore());

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('uses custom key when provided', () => {
    const CUSTOM_KEY = 'scroll:custom-key';
    sessionStorage.setItem(CUSTOM_KEY, '100');

    renderHook(() => useScrollRestore('custom-key'));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 100);
    expect(sessionStorage.getItem(CUSTOM_KEY)).toBeNull();
  });

  it('saveScroll stores current scrollY to sessionStorage', () => {
    Object.defineProperty(window, 'scrollY', { value: 320, writable: true, configurable: true });

    const { result } = renderHook(() => useScrollRestore());

    act(() => {
      result.current.saveScroll();
    });

    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('320');
  });

  it('saveScroll overwrites previously saved value', () => {
    sessionStorage.setItem(STORAGE_KEY, '100');

    // Mount consumes the saved value
    const { result } = renderHook(() => useScrollRestore());

    Object.defineProperty(window, 'scrollY', { value: 600, writable: true, configurable: true });

    act(() => {
      result.current.saveScroll();
    });

    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('600');
  });
});
