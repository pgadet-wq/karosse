"use client";

import { WifiOff, Wifi } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all duration-300 ${
        isOnline
          ? "bg-success text-white translate-y-0"
          : "bg-warning text-white translate-y-0"
      }`}
      role="alert"
      aria-live="polite"
    >
      {isOnline ? (
        <div className="flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4" aria-hidden="true" />
          <span>Connexion rétablie</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" aria-hidden="true" />
          <span>Mode hors-ligne — certaines données peuvent ne pas être à jour</span>
        </div>
      )}
    </div>
  );
}
