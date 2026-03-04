"use client";

import { useState, useEffect } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    function handleOnline() {
      setIsOnline(true);
      // Track that we came back online (for showing "back online" toast)
      if (!isOnline) {
        setWasOffline(true);
        // Reset after a short delay
        setTimeout(() => setWasOffline(false), 3000);
      }
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
}
