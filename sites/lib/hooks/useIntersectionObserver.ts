/**
 * Intersection Observer Hook
 * 用于检测文章可见性和停留时间
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  onEnter?: (target: Element) => void;
  onLeave?: (target: Element, dwellTime: number) => void;
  trackDwellTime?: boolean;
}

interface IntersectionInfo {
  isIntersecting: boolean;
  intersectionRatio: number;
  target: Element | null;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const {
    threshold = 0.5,
    rootMargin = "0px",
    onEnter,
    onLeave,
    trackDwellTime = true,
  } = options;

  const [intersectionInfo, setIntersectionInfo] = useState<IntersectionInfo>({
    isIntersecting: false,
    intersectionRatio: 0,
    target: null,
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<Element | null>(null);
  const enterTimeRef = useRef<number | null>(null);

  const observe = useCallback(
    (element: Element | null) => {
      if (observerRef.current && elementRef.current) {
        observerRef.current.unobserve(elementRef.current);
      }

      elementRef.current = element;

      if (element) {
        if (!observerRef.current) {
          observerRef.current = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                const isEntering = entry.isIntersecting;
                const wasIntersecting = intersectionInfo.isIntersecting;

                setIntersectionInfo({
                  isIntersecting: entry.isIntersecting,
                  intersectionRatio: entry.intersectionRatio,
                  target: entry.target,
                });

                if (isEntering && !wasIntersecting) {
                  // 元素进入视口
                  if (trackDwellTime) {
                    enterTimeRef.current = Date.now();
                  }
                  onEnter?.(entry.target);
                } else if (!isEntering && wasIntersecting) {
                  // 元素离开视口
                  if (trackDwellTime && enterTimeRef.current) {
                    const dwellTime = Date.now() - enterTimeRef.current;
                    onLeave?.(entry.target, dwellTime);
                    enterTimeRef.current = null;
                  } else {
                    onLeave?.(entry.target, 0);
                  }
                }
              });
            },
            {
              threshold,
              rootMargin,
            }
          );
        }

        observerRef.current.observe(element);
      }
    },
    [
      threshold,
      rootMargin,
      onEnter,
      onLeave,
      trackDwellTime,
      intersectionInfo.isIntersecting,
    ]
  );

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    elementRef.current = null;
    enterTimeRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    observe,
    disconnect,
    isIntersecting: intersectionInfo.isIntersecting,
    intersectionRatio: intersectionInfo.intersectionRatio,
    target: intersectionInfo.target,
  };
}

/**
 * 批量观察多个文章元素的Hook
 */
export function useMultipleIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const {
    threshold = 0.5,
    rootMargin = "0px",
    onEnter,
    onLeave,
    trackDwellTime = true,
  } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<Element, number>>(new Map());
  const [visibleElements, setVisibleElements] = useState<Set<Element>>(
    new Set()
  );

  const observe = useCallback(
    (element: Element, articleId?: string) => {
      if (!element) return;

      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const element = entry.target;
              const isEntering = entry.isIntersecting;
              const wasVisible = visibleElements.has(element);

              if (isEntering && !wasVisible) {
                // 元素进入视口
                if (trackDwellTime) {
                  elementsRef.current.set(element, Date.now());
                }
                setVisibleElements((prev) => new Set(Array.from(prev).concat(element)));
                onEnter?.(element);
              } else if (!isEntering && wasVisible) {
                // 元素离开视口
                setVisibleElements((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(element);
                  return newSet;
                });

                if (trackDwellTime && elementsRef.current.has(element)) {
                  const enterTime = elementsRef.current.get(element)!;
                  const dwellTime = Date.now() - enterTime;
                  onLeave?.(element, dwellTime);
                  elementsRef.current.delete(element);
                } else {
                  onLeave?.(element, 0);
                }
              }
            });
          },
          {
            threshold,
            rootMargin,
          }
        );
      }

      observerRef.current.observe(element);
    },
    [threshold, rootMargin, onEnter, onLeave, trackDwellTime, visibleElements]
  );

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
      elementsRef.current.delete(element);
      setVisibleElements((prev) => {
        const newSet = new Set(prev);
        newSet.delete(element);
        return newSet;
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    elementsRef.current.clear();
    setVisibleElements(new Set());
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    observe,
    unobserve,
    disconnect,
    visibleElements: Array.from(visibleElements),
    visibleCount: visibleElements.size,
  };
}
