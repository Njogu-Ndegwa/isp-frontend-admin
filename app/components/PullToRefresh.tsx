'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  pullDistance?: number;
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  className = '',
  pullDistance = 120 
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTouchingRef = useRef(false);
  const isHorizontalScrollRef = useRef(false);
  const moveCountRef = useRef(0);

  // Check if element is at the top
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop <= 0;
  }, []);

  // Check if element or any of its parents are horizontally scrollable
  const isInHorizontalScroller = useCallback((element: HTMLElement | null): boolean => {
    if (!element) return false;
    
    let current: HTMLElement | null = element;
    while (current && current !== containerRef.current) {
      const overflowX = window.getComputedStyle(current).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isAtTop() || isRefreshing) return;
    
    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
    isTouchingRef.current = true;
    isHorizontalScrollRef.current = false;
    moveCountRef.current = 0;
  }, [isAtTop, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchingRef.current || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = currentY - startYRef.current;
    const diffX = currentX - startXRef.current;
    
    moveCountRef.current += 1;
    
    // After a few move events, determine if this is horizontal scrolling
    if (moveCountRef.current === 3) {
      // If horizontal movement is greater than vertical, it's likely a horizontal scroll
      if (Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontalScrollRef.current = true;
        return;
      }
      
      // Check if we're inside a horizontally scrollable element
      if (isInHorizontalScroller(e.target as HTMLElement)) {
        isHorizontalScrollRef.current = true;
        return;
      }
    }
    
    // If we're in a horizontal scroller and moving horizontally, don't pull
    if (isHorizontalScrollRef.current) {
      return;
    }
    
    if (diffY > 10 && !isPulling) {
      setIsPulling(true);
    }
    
    if (isPulling && diffY > 0) {
      // Only allow pulling down when at top
      e.preventDefault();
      const progress = Math.min(diffY / pullDistance, 1.5);
      setPullProgress(progress);
    }
  }, [isPulling, isRefreshing, pullDistance, isInHorizontalScroller]);

  const handleTouchEnd = useCallback(async () => {
    isTouchingRef.current = false;
    
    if (isHorizontalScrollRef.current) {
      isHorizontalScrollRef.current = false;
      return;
    }
    
    if (!isPulling || isRefreshing) return;
    
    if (pullProgress >= 1) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullProgress(1);
      
      try {
        await onRefresh();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1000);
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullProgress(0);
        setIsPulling(false);
      }
    } else {
      // Snap back
      setPullProgress(0);
      setIsPulling(false);
    }
  }, [isPulling, isRefreshing, pullProgress, onRefresh]);

  // Prevent default touchmove when pulling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventScroll = (e: TouchEvent) => {
      if (isPulling && isAtTop() && !isHorizontalScrollRef.current) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', preventScroll, { passive: false });
    return () => container.removeEventListener('touchmove', preventScroll);
  }, [isPulling, isAtTop]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull Indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-200"
        style={{
          height: `${Math.max(pullProgress * pullDistance, 0)}px`,
          opacity: pullProgress > 0 ? 1 : 0,
        }}
      >
        <div className="flex flex-col items-center">
          {isRefreshing ? (
            // Refreshing spinner
            <svg className="w-6 h-6 text-accent-primary animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : showSuccess ? (
            // Success checkmark
            <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            // Arrow with rotation based on pull progress
            <>
              <svg 
                className="w-6 h-6 text-accent-primary transition-transform duration-200"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                style={{
                  transform: `rotate(${Math.min(pullProgress * 180, 180)}deg)`,
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="text-xs text-foreground-muted mt-1">
                {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content with transform */}
      <div 
        style={{
          transform: `translateY(${isPulling ? pullProgress * pullDistance * 0.5 : 0}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
