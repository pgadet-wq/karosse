import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  hideHeader?: boolean;
  action?: React.ReactNode;
}

export function PageShell({
  children,
  title,
  className,
  hideHeader = false,
  action,
}: PageShellProps) {
  return (
    <div className={cn("min-h-screen pb-safe-bottom", className)}>
      {!hideHeader && title && (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-display font-semibold text-primary">
              {title}
            </h1>
            {action}
          </div>
        </header>
      )}
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
