import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useEffect, useRef, useState } from 'react';

const DEFAULT_STEP = 20;
const LOAD_MORE_THRESHOLD = 180;
const LOAD_MORE_DELAY_MS = 220;

export function useInfiniteList<T>(items: T[], step = DEFAULT_STEP) {
  const [visibleCount, setVisibleCount] = useState(step);
  const [loadingMore, setLoadingMore] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisibleCount(step);
    setLoadingMore(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [items, step]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  function loadMore() {
    if (!hasMore || loadingMore) {
      return;
    }

    setLoadingMore(true);
    timeoutRef.current = setTimeout(() => {
      setVisibleCount((current) => Math.min(items.length, current + step));
      setLoadingMore(false);
      timeoutRef.current = null;
    }, LOAD_MORE_DELAY_MS);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!hasMore || loadingMore) {
      return;
    }

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);

    if (distanceFromBottom <= LOAD_MORE_THRESHOLD) {
      loadMore();
    }
  }

  return {
    visibleItems,
    hasMore,
    loadingMore,
    onScroll,
    visibleCount,
    totalCount: items.length,
  };
}
