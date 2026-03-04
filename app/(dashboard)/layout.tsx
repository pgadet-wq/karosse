import { BottomNav } from "@/components/layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Add authentication check here
  // For now, render the layout without auth verification

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <BottomNav />
    </div>
  );
}
