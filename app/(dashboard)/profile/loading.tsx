import { PageShell } from "@/components/layout";
import { SkeletonProfile } from "@/components/ui";

export default function ProfileLoading() {
  return (
    <PageShell title="Mon profil">
      <SkeletonProfile />
    </PageShell>
  );
}
