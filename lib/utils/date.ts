import { format, formatDistance, formatRelative, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDate(date: Date | string, formatStr: string = "PPP") {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, formatStr, { locale: fr });
}

export function formatRelativeDate(date: Date | string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatRelative(d, new Date(), { locale: fr });
}

export function formatTimeAgo(date: Date | string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true, locale: fr });
}
