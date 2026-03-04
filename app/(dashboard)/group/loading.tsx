import { PageShell } from "@/components/layout";
import { SkeletonMemberList, Skeleton } from "@/components/ui";

export default function GroupLoading() {
  return (
    <PageShell title="Groupe">
      <div className="space-y-6">
        {/* Invite section */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="w-32 h-5" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="w-40 h-14 rounded-xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-10 rounded-lg" />
            <Skeleton className="w-24 h-10 rounded-lg" />
          </div>
        </div>

        {/* Members section */}
        <SkeletonMemberList />

        {/* Children section */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="w-24 h-5" />
            </div>
            <Skeleton className="w-20 h-8 rounded-lg" />
          </div>
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="w-28 h-4" />
                  <Skeleton className="w-36 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
