"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gray-200",
        className
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("bg-white rounded-xl shadow-sm p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <SkeletonCircle />
        <div className="flex-1 space-y-2">
          <SkeletonText className="w-2/3" />
          <SkeletonText className="w-1/2 h-3" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCalendar() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary/20 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="text-center space-y-1">
            <Skeleton className="w-24 h-4 mx-auto" />
            <Skeleton className="w-32 h-5 mx-auto" />
          </div>
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
      </div>

      {/* Days grid */}
      <div className="p-3">
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center p-2 space-y-2">
              <Skeleton className="w-8 h-3" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1 w-full">
                <Skeleton className="w-full h-5 rounded" />
                <Skeleton className="w-full h-5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex justify-center gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <Skeleton className="w-3 h-3 rounded" />
              <Skeleton className="w-12 h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonDriverList() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonMemberList() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="w-24 h-5" />
      </div>
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <SkeletonCircle />
            <div className="flex-1 space-y-1">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-20 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="space-y-4">
      {/* User card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-32 h-5" />
            <Skeleton className="w-48 h-4" />
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-32 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
