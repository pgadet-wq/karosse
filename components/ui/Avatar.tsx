"use client";

import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const COLORS = [
  "bg-primary",
  "bg-secondary",
  "bg-accent",
  "bg-success",
  "bg-pink-500",
  "bg-purple-500",
  "bg-indigo-500",
  "bg-teal-500",
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold",
        bgColor,
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
