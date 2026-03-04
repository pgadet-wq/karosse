import { PageShell } from "@/components/layout";
import { SkeletonDriverList } from "@/components/ui";

export default function DriversLoading() {
  return (
    <PageShell title="Conducteurs">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Drivers list */}
        <SkeletonDriverList />
      </div>
    </PageShell>
  );
}
