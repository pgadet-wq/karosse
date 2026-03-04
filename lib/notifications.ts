/**
 * Push Notifications utilities for KAROSSE
 * Handles permission requests, subscription management, and Supabase sync
 */

import { createBrowserClient } from "@/lib/supabase/client";

// VAPID public key from environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer;
}

/**
 * Check current notification permission status
 */
export function checkPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;

  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Request notification permission from user
 */
export async function requestPermission(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn("Push notifications not supported");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

/**
 * Get the current service worker registration
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("Error getting service worker registration:", error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 * Registers with push service and saves subscription to Supabase
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn("Push notifications not supported");
    return null;
  }

  // Request permission if not yet granted
  if (Notification.permission === "default") {
    const granted = await requestPermission();
    if (!granted) {
      console.warn("Notification permission denied by user");
      return null;
    }
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error("VAPID public key not configured");
    return null;
  }

  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      console.error("Service worker not registered");
      return null;
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Save subscription to Supabase
    await saveSubscriptionToSupabase(subscription);

    return subscription;
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return null;
  }
}

/**
 * Save push subscription to Supabase
 */
async function saveSubscriptionToSupabase(
  subscription: PushSubscription
): Promise<void> {
  const supabase = createBrowserClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const subscriptionJson = subscription.toJSON();

  if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
    throw new Error("Invalid subscription object");
  }

  // Upsert subscription (insert or update if endpoint exists)
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscriptionJson.endpoint,
      p256dh: subscriptionJson.keys.p256dh,
      auth: subscriptionJson.keys.auth,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "endpoint",
    }
  );

  if (error) {
    console.error("Error saving subscription to Supabase:", error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return;
    }

    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove from Supabase first
      await removeSubscriptionFromSupabase(subscription.endpoint);

      // Then unsubscribe from push service
      await subscription.unsubscribe();
    }
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
    throw error;
  }
}

/**
 * Remove push subscription from Supabase
 */
async function removeSubscriptionFromSupabase(endpoint: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error("Error removing subscription from Supabase:", error);
    throw error;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return null;
    }

    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error("Error getting current subscription:", error);
    return null;
  }
}

/**
 * Check if user is currently subscribed to push
 */
export async function isSubscribed(): Promise<boolean> {
  const subscription = await getCurrentSubscription();
  return subscription !== null;
}

/**
 * Show a local notification (for testing)
 */
export function showLocalNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (Notification.permission === "granted") {
    new Notification(title, options);
  }
}
