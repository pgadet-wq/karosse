/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ============================================================================
// PUSH NOTIFICATION HANDLERS
// ============================================================================

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type?: "trip_reminder" | "trip_update" | "group_invite" | "general";
  icon?: string;
  badge?: string;
  tag?: string;
}

/**
 * Handle incoming push notifications
 */
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) {
    console.warn("Push event received but no data");
    return;
  }

  let payload: PushPayload;

  try {
    payload = event.data.json() as PushPayload;
  } catch {
    // Fallback for plain text payload
    payload = {
      title: "KAROSSE",
      body: event.data.text(),
    };
  }

  // Build notification options (vibrate is supported at runtime but not in TS types)
  const options = {
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/badge-72x72.png",
    tag: payload.tag || payload.type || "default",
    data: {
      url: payload.url || "/calendar",
      type: payload.type,
    },
    vibrate: [100, 50, 100],
    requireInteraction: payload.type === "trip_reminder",
    actions: payload.type === "trip_reminder"
      ? [
          { action: "view", title: "Voir le trajet" },
          { action: "dismiss", title: "Fermer" },
        ]
      : undefined,
  } as NotificationOptions & { vibrate?: number[] };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

/**
 * Handle notification click events
 */
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data as { url?: string; type?: string };

  // Handle dismiss action
  if (action === "dismiss") {
    return;
  }

  // Get the URL to open
  const urlToOpen = notificationData?.url || "/calendar";

  event.waitUntil(
    (async () => {
      // Check if there's already a window open
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          await client.focus();
          // Navigate to the URL
          if ("navigate" in client) {
            await (client as WindowClient).navigate(urlToOpen);
          }
          return;
        }
      }

      // If no window is open, open a new one
      if (self.clients.openWindow) {
        await self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

/**
 * Handle notification close events (for analytics)
 */
self.addEventListener("notificationclose", (event: NotificationEvent) => {
  const notificationData = event.notification.data as { type?: string };
  console.log("Notification closed:", notificationData?.type);
});

/**
 * Handle push subscription change (e.g., when browser refreshes keys)
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("Push subscription changed, re-subscribing...");

  // Re-subscribe with the same options
  event.waitUntil(
    (async () => {
      try {
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          // Note: applicationServerKey would need to be available here
          // This is a simplified handler - full implementation would need the key
        });

        // Send new subscription to server
        // This would typically post to your API endpoint
        console.log("New subscription:", subscription.endpoint);
      } catch (error) {
        console.error("Failed to re-subscribe:", error);
      }
    })()
  );
});
