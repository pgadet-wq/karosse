"use client";

import { ReactNode } from "react";
import { ErrorBoundary, OfflineBanner } from "@/components/ui";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      {children}
    </ErrorBoundary>
  );
}
