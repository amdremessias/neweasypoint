import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (e) {
    return dateStr;
  }
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch (e) {
    return dateStr;
  }
}

export function formatTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), "HH:mm", { locale: ptBR });
  } catch (e) {
    return dateStr;
  }
}

export function formatMinutes(minutes?: number | null): string {
  if (minutes == null) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}
