import { parse, isValid } from "date-fns";

const DATE_FORMATS = [
  "MMM dd yyyy",     // "May 31 2022"
  "MMM-dd-yyyy",     // "Jun-08-2022"
  "yyyy-MM-dd",      // "2014-01-01"
  "MM/dd/yyyy",      // "01/15/2022"
  "dd-MM-yyyy",      // "31-05-2022"
];

export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;

  const cleaned = dateStr.trim();

  for (const format of DATE_FORMATS) {
    try {
      const parsed = parse(cleaned, format, new Date());
      if (isValid(parsed)) return parsed;
    } catch {
      continue;
    }
  }

  // Fallback: try native Date parsing
  const native = new Date(cleaned);
  if (isValid(native)) return native;

  return null;
}

export function parseDateToString(dateStr: string | undefined | null): string | null {
  const d = parseDate(dateStr);
  return d ? d.toISOString() : null;
}
