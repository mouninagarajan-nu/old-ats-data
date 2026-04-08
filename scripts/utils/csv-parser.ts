import { parse } from "csv-parse/sync";
import fs from "fs";

export function parseCSV<T = Record<string, string>>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
  }) as T[];
}
