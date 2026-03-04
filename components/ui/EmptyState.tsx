"use client";

import { ReactNode } from "react";
import { Calendar, Car, Users, UserPlus, Share2 } from "lucide-react";

type EmptyStateType = "calendar" | "drivers" | "children" | "group" | "custom";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
}

const EMPTY_STATE_CONFIG: Record<
  Exclude<EmptyStateType, "custom">,
  { icon: ReactNode; title: string; description: string; actionLabel: string }
> = {
  calendar: {
    icon: <Calendar className="w-12 h-12" />,
    title: "Aucun trajet planifié",
    description: "Planifiez les trajets de la semaine pour commencer.",
    actionLabel: "Planifier",
  },
  drivers: {
    icon: <Car className="w-12 h-12" />,
    title: "Aucun conducteur",
    description: "Ajoutez votre premier conducteur pour organiser le covoiturage.",
    actionLabel: "Ajouter un conducteur",
  },
  children: {
    icon: <Users className="w-12 h-12" />,
    title: "Aucun enfant inscrit",
    description: "Inscrivez vos enfants pour les ajouter aux trajets.",
    actionLabel: "Inscrire un enfant",
  },
  group: {
    icon: <UserPlus className="w-12 h-12" />,
    title: "Groupe vide",
    description: "Invitez d'autres parents pour former votre groupe de covoiturage.",
    actionLabel: "Inviter des parents",
  },
};

export function EmptyState({
  type = "custom",
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  const config = type !== "custom" ? EMPTY_STATE_CONFIG[type] : null;

  const displayIcon = icon || config?.icon || <Share2 className="w-12 h-12" />;
  const displayTitle = title || config?.title || "Aucun élément";
  const displayDescription = description || config?.description || "";
  const displayActionLabel = action?.label || config?.actionLabel || "Ajouter";

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon */}
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
        {displayIcon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{displayTitle}</h3>

      {/* Description */}
      {displayDescription && (
        <p className="text-sm text-gray-500 max-w-xs mb-6">{displayDescription}</p>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={displayActionLabel}
        >
          {displayActionLabel}
        </button>
      )}
    </div>
  );
}
