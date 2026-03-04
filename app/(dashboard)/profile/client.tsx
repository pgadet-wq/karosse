"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Phone,
  Bell,
  BellOff,
  Car,
  LogOut,
  ChevronRight,
  Loader2,
  Shield,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/layout";
import { Avatar } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  checkPermission,
  isPushSupported,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notifications";

interface ProfileClientProps {
  user: {
    id: string;
    email: string;
    displayName: string;
    phone: string | null;
  };
  isDriver: boolean;
  driverId: string | null;
}

const APP_VERSION = "1.0.0";

export function ProfileClient({ user, isDriver, driverId }: ProfileClientProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationState, setNotificationState] = useState<
    "loading" | "enabled" | "disabled" | "denied" | "unsupported"
  >("loading");
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);

  // Check notification state on mount
  useEffect(() => {
    async function checkNotificationState() {
      if (!isPushSupported()) {
        setNotificationState("unsupported");
        return;
      }

      const permission = checkPermission();
      if (permission === "denied") {
        setNotificationState("denied");
        return;
      }

      if (permission === "granted") {
        const subscribed = await isSubscribed();
        setNotificationState(subscribed ? "enabled" : "disabled");
      } else {
        setNotificationState("disabled");
      }
    }

    checkNotificationState();
  }, []);

  async function handleToggleNotifications() {
    if (notificationState === "denied" || notificationState === "unsupported") {
      return;
    }

    setIsTogglingNotifications(true);

    try {
      if (notificationState === "enabled") {
        await unsubscribeFromPush();
        setNotificationState("disabled");
        toast.success("Notifications désactivées");
      } else {
        const subscription = await subscribeToPush();
        if (subscription) {
          setNotificationState("enabled");
          toast.success("Notifications activées");
        } else {
          toast.error("Impossible d'activer les notifications");
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsTogglingNotifications(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Erreur lors de la déconnexion");
      setIsLoggingOut(false);
    }
  }

  return (
    <PageShell title="Mon profil">
      <div className="space-y-4">
        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.displayName} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {user.displayName}
              </h2>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <Mail className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                  <Phone className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Notifications Toggle */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {notificationState === "enabled" ? (
                <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" aria-hidden="true" />
              )}
              <div>
                <p className="text-gray-700 font-medium">Notifications</p>
                <p className="text-xs text-gray-500">
                  {notificationState === "loading"
                    ? "Chargement..."
                    : notificationState === "enabled"
                    ? "Activées"
                    : notificationState === "denied"
                    ? "Bloquées dans le navigateur"
                    : notificationState === "unsupported"
                    ? "Non supportées"
                    : "Désactivées"}
                </p>
              </div>
            </div>

            {notificationState !== "loading" &&
              notificationState !== "denied" &&
              notificationState !== "unsupported" && (
                <button
                  onClick={handleToggleNotifications}
                  disabled={isTogglingNotifications}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    notificationState === "enabled" ? "bg-success" : "bg-gray-300"
                  } ${isTogglingNotifications ? "opacity-50" : ""}`}
                  aria-label={
                    notificationState === "enabled"
                      ? "Désactiver les notifications"
                      : "Activer les notifications"
                  }
                  aria-pressed={notificationState === "enabled"}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      notificationState === "enabled"
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  >
                    {isTogglingNotifications && (
                      <Loader2 className="w-3 h-3 animate-spin text-gray-400 absolute top-1 left-1" />
                    )}
                  </div>
                </button>
              )}

            {notificationState === "denied" && (
              <Link
                href="/profile/notifications"
                className="text-sm text-primary hover:underline"
              >
                Configurer
              </Link>
            )}
          </div>

          {/* My Vehicle (if driver) */}
          {isDriver && driverId && (
            <Link
              href="/drivers"
              className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-gray-400" aria-hidden="true" />
                <span className="text-gray-700">Mon véhicule</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </Link>
          )}

          {/* Security */}
          <Link
            href="/profile/security"
            className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" aria-hidden="true" />
              <span className="text-gray-700">Sécurité</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" aria-hidden="true" />
          </Link>

          {/* Help */}
          <Link
            href="/profile/help"
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-400" aria-hidden="true" />
              <span className="text-gray-700">Aide</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" aria-hidden="true" />
          </Link>
        </div>

        {/* Logout Button */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-danger hover:bg-danger/5 transition-colors disabled:opacity-50"
            aria-label="Se déconnecter"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>Déconnexion...</span>
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5" aria-hidden="true" />
                <span>Se déconnecter</span>
              </>
            )}
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-gray-400 pt-4">
          KAROSSE v{APP_VERSION}
        </p>
      </div>
    </PageShell>
  );
}
