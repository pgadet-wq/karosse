import Link from "next/link";
import { Car, Users, Shield, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary to-primary-700">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            KAROSSE
          </h1>
          <p className="text-xl text-white/80">
            Covoiturage scolaire Nouméa
          </p>
        </header>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 mb-12 max-w-lg mx-auto">
          <FeatureCard
            icon={<Car className="w-8 h-8" />}
            title="Trajets"
            description="Partagez vos trajets"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Communauté"
            description="Parents de confiance"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Sécurité"
            description="Profils vérifiés"
          />
          <FeatureCard
            icon={<Clock className="w-8 h-8" />}
            title="Temps"
            description="Gagnez du temps"
          />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          <Link
            href="/connexion"
            className="block w-full py-3 px-6 bg-white text-primary font-semibold text-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="block w-full py-3 px-6 bg-accent text-white font-semibold text-center rounded-lg hover:bg-accent-600 transition-colors"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center text-white">
      <div className="flex justify-center mb-2">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-white/70">{description}</p>
    </div>
  );
}
