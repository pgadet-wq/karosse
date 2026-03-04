import { PageShell } from "@/components/layout";
import { SkeletonCalendar, SkeletonCard } from "@/components/ui";

export default function CalendarLoading() {
  return (
    <PageShell title="Calendrier">
      <div className="space-y-4">
        <SkeletonCalendar />

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Upcoming trips */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
