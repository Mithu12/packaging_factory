// Lightweight, dependency-free helpers for exporting tabular data to CSV and
// for printing arbitrary HTML via a clean print window. Shared across pages so
// list/detail exports stay consistent.

type CsvCell = string | number | null | undefined;

const csvEscape = (v: CsvCell): string => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Build a CSV (with UTF-8 BOM for Excel) and trigger a browser download. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: CsvCell[][]
): void {
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Escape a value for safe interpolation into print HTML. */
export function escapeHtml(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 24px; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  .num { text-align: right; }
  .section { margin-bottom: 16px; }
  .kv { display: grid; grid-template-columns: 180px 1fr; gap: 4px 12px; }
  .kv dt { color: #666; }
  .kv dd { margin: 0; font-weight: 500; }
  @media print { body { margin: 0; } }
`;

/**
 * Open a print-ready window with the supplied title and body HTML, then invoke
 * the browser print dialog. Returns false if the popup was blocked.
 */
export function printHtml(title: string, bodyHtml: string): boolean {
  const win = window.open("", "_blank", "width=900,height=650");
  if (!win) return false;
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
      title
    )}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}` +
      `<script>window.onload=function(){window.focus();window.print();}<\/script>` +
      `</body></html>`
  );
  win.document.close();
  return true;
}
