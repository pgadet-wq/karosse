"use client";

import { useState, useEffect } from "react";
import { Car } from "lucide-react";

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 1500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade out after duration
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 300);

    // Complete after duration
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center transition-opacity duration-300 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Logo */}
      <div className="animate-fade-in">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-6">
          <Car className="w-12 h-12 text-primary" />
        </div>
      </div>

      {/* App name */}
      <h1 className="text-3xl font-display font-bold text-white animate-fade-in-delay">
        KAROSSE
      </h1>

      {/* Tagline */}
      <p className="text-white/80 text-sm mt-2 animate-fade-in-delay-2">
        Covoiturage scolaire
      </p>

      {/* Loading indicator */}
      <div className="absolute bottom-12">
        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}
