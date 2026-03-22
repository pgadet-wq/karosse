"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar,
  Car,
  Users,
  Bell,
  UserPlus,
  HelpCircle,
} from "lucide-react";
import { PageShell } from "@/components/layout";

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Comment planifier les trajets de la semaine ?",
    answer:
      "Allez dans l'onglet Calendrier et appuyez sur le bouton \"Planifier\" en haut. Vous pouvez assigner manuellement les conducteurs ou utiliser la rotation automatique qui équilibre les trajets entre les conducteurs disponibles.",
    icon: <Calendar className="w-5 h-5 text-primary" />,
  },
  {
    question: "Comment devenir conducteur ?",
    answer:
      "Allez dans l'onglet Conducteurs et appuyez sur \"S'inscrire comme conducteur\". Renseignez les informations de votre véhicule (modèle, couleur, nombre de places) et sélectionnez vos jours de disponibilité.",
    icon: <Car className="w-5 h-5 text-primary" />,
  },
  {
    question: "Comment inviter d'autres parents ?",
    answer:
      "Allez dans l'onglet Groupe. Vous trouverez le code d'invitation que vous pouvez copier et partager par message, ou générer un QR Code que les autres parents peuvent scanner.",
    icon: <UserPlus className="w-5 h-5 text-primary" />,
  },
  {
    question: "Comment ajouter un enfant à un trajet ?",
    answer:
      "Dans le Calendrier, appuyez sur un jour pour voir les détails. Si un conducteur est assigné, vous verrez un bouton \"Ajouter un enfant\" sous la liste des passagers. Sélectionnez l'enfant à inscrire.",
    icon: <Users className="w-5 h-5 text-primary" />,
  },
  {
    question: "Comment fonctionnent les notifications ?",
    answer:
      "Les notifications vous alertent la veille d'un trajet sans conducteur, quand un trajet est confirmé ou annulé, et quand un conducteur est modifié. Vous pouvez les configurer dans Profil > Notifications.",
    icon: <Bell className="w-5 h-5 text-primary" />,
  },
  {
    question: "Comment rejoindre un autre groupe ?",
    answer:
      "Allez dans l'onglet Groupe et appuyez sur \"Rejoindre un autre groupe\". Entrez le code d'invitation du nouveau groupe. Vous pouvez être membre de plusieurs groupes simultanément.",
    icon: <Users className="w-5 h-5 text-primary" />,
  },
  {
    question: "Comment annuler un trajet ?",
    answer:
      "Dans le Calendrier, appuyez sur le jour concerné. Dans le détail du trajet, vous trouverez un bouton \"Annuler\" en bas. Tous les membres du groupe seront notifiés de l'annulation.",
    icon: <Calendar className="w-5 h-5 text-primary" />,
  },
];

export function HelpClient() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggleQuestion(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <PageShell
      title="Aide"
      action={
        <button
          onClick={() => router.back()}
          className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
          aria-label="Retour"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      }
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Comment utiliser KAROSSE ?
          </h2>
          <p className="text-sm text-gray-500">
            Trouvez les réponses aux questions les plus fréquentes
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className={`border-b border-gray-100 last:border-b-0 ${
                openIndex === index ? "bg-gray-50" : ""
              }`}
            >
              <button
                onClick={() => toggleQuestion(index)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                aria-expanded={openIndex === index}
              >
                {item.icon}
                <span className="flex-1 font-medium text-gray-900 text-sm">
                  {item.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 pl-12">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 text-center">
            Vous avez d&apos;autres questions ? Contactez l&apos;administrateur de votre groupe.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
