/**
 * Performance utilities for optimizing application performance
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Debounce a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle a function call
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.threshold, options.root, options.rootMargin]);

  return [ref, isIntersecting];
}

/**
 * Hook for lazy loading with visibility trigger
 */
export function useLazyLoad(
  rootMargin = '100px'
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const [ref, isIntersecting] = useIntersectionObserver({
    rootMargin,
    threshold: 0,
  });
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isIntersecting && !hasLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasLoaded(true);
    }
  }, [isIntersecting, hasLoaded]);

  return [ref, hasLoaded];
}

/**
 * Hook for detecting if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook for virtualizing large lists
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 3
): {
  virtualItems: { index: number; item: T; style: React.CSSProperties }[];
  totalHeight: number;
  scrollTo: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
} {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    startIndex + visibleCount + overscan * 2
  );

  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      item: items[i],
      style: {
        position: 'absolute' as const,
        top: i * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    });
  }

  const scrollTo = useCallback(
    (index: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    },
    [itemHeight]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return {
    virtualItems,
    totalHeight: items.length * itemHeight,
    scrollTo,
    containerRef,
  };
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * Preconnect to critical origins
 */
export function preconnect(href: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Request idle callback wrapper with fallback
 */
export function requestIdleCallback(
  callback: () => void,
  options?: IdleRequestOptions
): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  return setTimeout(callback, 1) as unknown as number;
}

/**
 * Cancel idle callback wrapper
 */
export function cancelIdleCallback(handle: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

/**
 * Hook for deferring non-critical work
 */
export function useDeferredValue<T>(value: T, delay = 0): T {
  const [deferredValue, setDeferredValue] = useState(value);

  useEffect(() => {
    if (delay === 0) {
      const handle = requestIdleCallback(() => {
        setDeferredValue(value);
      });
      return () => cancelIdleCallback(handle);
    } else {
      const timeoutId = setTimeout(() => {
        setDeferredValue(value);
      }, delay);
      return () => clearTimeout(timeoutId);
    }
  }, [value, delay]);

  return deferredValue;
}
