export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* TODO: Add navigation header */}
      <main className="pb-20">{children}</main>
      {/* TODO: Add bottom navigation */}
    </div>
  );
}
