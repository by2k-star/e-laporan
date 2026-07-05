export type ActivityStatus =
  | "sudah_dilaksanakan"
  | "belum_dilaksanakan"
  | "dibatalkan"
  | "tidak_terlaksana";

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  sudah_dilaksanakan: "Sudah Dilaksanakan",
  belum_dilaksanakan: "Belum Dilaksanakan",
  dibatalkan: "Dibatalkan",
  tidak_terlaksana: "Tidak Terlaksana",
};

export const STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = (
  Object.keys(STATUS_LABEL) as ActivityStatus[]
).map((v) => ({ value: v, label: STATUS_LABEL[v] }));

export const STATUS_BADGE: Record<ActivityStatus, string> = {
  sudah_dilaksanakan: "bg-emerald-100 text-emerald-800 border-emerald-200",
  belum_dilaksanakan: "bg-amber-100 text-amber-900 border-amber-200",
  dibatalkan: "bg-slate-100 text-slate-700 border-slate-200",
  tidak_terlaksana: "bg-rose-100 text-rose-800 border-rose-200",
};

export function formatIDR(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  if (!isFinite(v)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function pct(realization: number | string, budget: number | string): number {
  const r = Number(realization) || 0;
  const b = Number(budget) || 0;
  if (b <= 0) return 0;
  return Math.round((r / b) * 100 * 10) / 10;
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
