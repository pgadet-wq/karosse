"use client";

import { useState, useRef, useCallback, ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // Only enable pull-to-refresh if scrolled to top
      if (container.scrollTop > 0) return;

      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);

      // Apply resistance (diminishing returns)
      const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(resistedDistance);
    },
    [isPulling, disabled, isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled || isRefreshing) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden transition-transform"
        style={{
          height: pullDistance,
          transform: `translateY(${-threshold + pullDistance}px)`,
        }}
      >
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
            isRefreshing
              ? "bg-primary text-white"
              : shouldTrigger
              ? "bg-primary/20 text-primary"
              : "bg-gray-100 text-gray-400"
          }`}
          style={{
            opacity: pullProgress,
            transform: `scale(${0.5 + pullProgress * 0.5}) rotate(${
              pullProgress * 180
            }deg)`,
          }}
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ArrowDown className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
