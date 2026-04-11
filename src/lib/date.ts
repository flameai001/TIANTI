import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export function formatDate(date: string | Date, pattern = "yyyy.MM.dd") {
  const value = typeof date === "string" ? new Date(date) : date;
  return format(value, pattern, { locale: zhCN });
}

export function formatDateRange(startsAt: string, endsAt?: string | null) {
  if (!endsAt) {
    return formatDate(startsAt);
  }

  const start = formatDate(startsAt, "MM.dd");
  const end = formatDate(endsAt, "MM.dd");
  const year = formatDate(startsAt, "yyyy");
  return `${year}.${start}-${end}`;
}
