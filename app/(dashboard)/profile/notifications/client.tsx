"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  BellRing,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Info,
  Calendar,
  Check,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/layout";
import {
  checkPermission,
  isPushSupported,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from "@/lib/notifications";
import { createBrowserClient } from "@/lib/supabase/client";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface NotificationPreferences {
  trip_reminder: boolean;
  trip_confirmed: boolean;
  trip_update: boolean;
  unassigned_reminder: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  trip_reminder: true,
  trip_confirmed: true,
  trip_update: true,
  unassigned_reminder: true,
};

const NOTIFICATION_TYPES: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "trip_reminder",
    label: "Rappel la veille",
    description: "Rappel la veille avec le conducteur et l'heure de départ",
    icon: <Calendar className="w-5 h-5 text-primary" />,
  },
  {
    key: "trip_confirmed",
    label: "Trajet confirmé",
    description: "Quand un conducteur confirme son trajet",
    icon: <Check className="w-5 h-5 text-success" />,
  },
  {
    key: "trip_update",
    label: "Modifications",
    description: "Changement de conducteur, annulation, passagers modifiés",
    icon: <RefreshCw className="w-5 h-5 text-secondary" />,
  },
  {
    key: "unassigned_reminder",
    label: "Trajet sans conducteur",
    description: "Alerte quand un trajet du lendemain n'a pas de conducteur",
    icon: <AlertCircle className="w-5 h-5 text-warning" />,
  },
];

export function NotificationsClient() {
  const router = useRouter();
  const [permission, setPermission] = useState<PermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [savingPref, setSavingPref] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: member } = await supabase
      .from("members")
      .select("id, notification_preferences")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (member) {
      setMemberId(member.id);
      if (member.notification_preferences) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...member.notification_preferences });
      }
    }
  }, []);

  // Check initial state
  useEffect(() => {
    async function checkState() {
      if (!isPushSupported()) {
        setPermission("unsupported");
        setIsLoading(false);
        return;
      }

      const perm = checkPermission();
      setPermission(perm);

      if (perm === "granted") {
        const sub = await isSubscribed();
        setSubscribed(sub);
      }

      await loadPreferences();
      setIsLoading(false);
    }

    checkState();
  }, [loadPreferences]);

  async function handleEnableNotifications() {
    setIsToggling(true);

    try {
      const granted = await requestPermission();

      if (granted) {
        setPermission("granted");
        const subscription = await subscribeToPush();

        if (subscription) {
          setSubscribed(true);
          toast.success("Notifications activées !");
        } else {
          toast.error("Erreur lors de l'inscription");
        }
      } else {
        setPermission(checkPermission());
        if (checkPermission() === "denied") {
          toast.error("Notifications refusées");
        }
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error(message);
    } finally {
      setIsToggling(false);
    }
  }

  async function handleToggleSubscription() {
    setIsToggling(true);

    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
        toast.success("Notifications désactivées");
      } else {
        const subscription = await subscribeToPush();
        if (subscription) {
          setSubscribed(true);
          toast.success("Notifications activées !");
        } else {
          toast.error("Erreur lors de l'inscription");
        }
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error(message);
    } finally {
      setIsToggling(false);
    }
  }

  async function togglePreference(key: keyof NotificationPreferences) {
    if (!memberId) return;

    const newValue = !preferences[key];
    const newPrefs = { ...preferences, [key]: newValue };

    setSavingPref(key);
    setPreferences(newPrefs);

    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("members")
      .update({ notification_preferences: newPrefs })
      .eq("id", memberId);

    if (error) {
      console.error("Error saving preferences:", error);
      setPreferences({ ...preferences });
      toast.error("Erreur lors de la sauvegarde");
    }

    setSavingPref(null);
  }

  async function handleTestNotification() {
    if (!subscribed) return;

    try {
      if (Notification.permission === "granted") {
        new Notification("Test KAROSSE", {
          body: "Les notifications fonctionnent correctement !",
          icon: "/icons/icon-192x192.png",
        });
        toast.success("Notification de test envoyée");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast.error("Erreur lors du test");
    }
  }

  return (
    <PageShell
      title="Notifications"
      action={
        <button
          onClick={() => router.back()}
          className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Main Status Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              {permission === "unsupported" ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-gray-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Notifications non supportées
                  </h2>
                  <p className="text-sm text-gray-500">
                    Votre navigateur ne supporte pas les notifications push.
                    Essayez avec Chrome, Firefox ou Safari.
                  </p>
                </div>
              ) : permission === "denied" ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BellOff className="w-8 h-8 text-danger" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Notifications bloquées
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Les notifications sont bloquées dans les réglages de votre
                    navigateur.
                  </p>
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-left">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <p className="font-medium mb-1">
                          Pour activer les notifications :
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-gray-600">
                          <li>Cliquez sur l&apos;icône de cadenas dans la barre d&apos;adresse</li>
                          <li>Trouvez &quot;Notifications&quot;</li>
                          <li>Changez le paramètre en &quot;Autoriser&quot;</li>
                          <li>Rechargez la page</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              ) : permission === "granted" ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          subscribed ? "bg-success/10" : "bg-gray-100"
                        }`}
                      >
                        {subscribed ? (
                          <BellRing className="w-6 h-6 text-success" />
                        ) : (
                          <Bell className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">
                          Notifications push
                        </h2>
                        <p className="text-sm text-gray-500">
                          {subscribed ? "Activées" : "Désactivées"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleSubscription}
                      disabled={isToggling}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        subscribed ? "bg-success" : "bg-gray-300"
                      } ${isToggling ? "opacity-50" : ""}`}
                    >
                      <div
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                          subscribed ? "translate-x-7" : "translate-x-1"
                        }`}
                      >
                        {isToggling && (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute top-1 left-1" />
                        )}
                      </div>
                    </button>
                  </div>

                  {subscribed && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Vous recevrez les notifications activées ci-dessous</span>
                      </div>

                      <button
                        onClick={handleTestNotification}
                        className="w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        Envoyer une notification de test
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Activer les notifications
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Recevez des rappels la veille de vos trajets et soyez
                    informé des changements.
                  </p>
                  <button
                    onClick={handleEnableNotifications}
                    disabled={isToggling}
                    className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isToggling ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Activation...
                      </>
                    ) : (
                      <>
                        <Bell className="w-5 h-5" />
                        Activer les notifications
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Notification Type Preferences - Checkboxes */}
            {permission === "granted" && subscribed && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-medium text-gray-900">
                    Choisissez vos notifications
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cochez les notifications que vous souhaitez recevoir
                  </p>
                </div>
                {NOTIFICATION_TYPES.map((item) => {
                  const isChecked = preferences[item.key];
                  const isSaving = savingPref === item.key;

                  return (
                    <button
                      key={item.key}
                      onClick={() => togglePreference(item.key)}
                      disabled={isSaving}
                      className={`w-full flex items-center gap-3 px-4 py-4 border-b border-gray-100 last:border-b-0 transition-colors text-left ${
                        isSaving ? "opacity-50" : "hover:bg-gray-50"
                      }`}
                      aria-pressed={isChecked}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked
                            ? "bg-primary border-primary"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isChecked && (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        {isSaving && (
                          <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                        )}
                      </div>

                      {/* Icon */}
                      <div className="flex-shrink-0">{item.icon}</div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isChecked ? "text-gray-900" : "text-gray-500"}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Info Card */}
            {permission === "granted" && subscribed && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium text-gray-900 mb-1">
                      Comment ça fonctionne ?
                    </p>
                    <p>
                      Les notifications apparaissent en bannière sur votre téléphone, même quand
                      l&apos;application est fermée. Le rappel quotidien est envoyé à 19h (heure de Nouméa).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
