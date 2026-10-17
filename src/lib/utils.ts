export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return "Expirado";
  if (days === 0) return "Expira hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    "A+": "bg-emerald-500 text-white",
    A: "bg-emerald-500 text-white",
    "A-": "bg-emerald-400 text-white",
    "B+": "bg-blue-400 text-white",
    B: "bg-blue-400 text-white",
    "B-": "bg-blue-300 text-white",
    "C+": "bg-orange-400 text-white",
    C: "bg-orange-400 text-white",
    "C-": "bg-orange-300 text-white",
    T: "bg-violet-500 text-white",
    F: "bg-rose-500 text-white",
    "N/A": "bg-slate-400 text-white",
    "⏳": "bg-amber-200 text-amber-800 animate-pulse",
  };
  return colors[grade] || colors["N/A"];
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    valid: "bg-emerald-100 text-emerald-800 border-emerald-200",
    expired: "bg-rose-100 text-rose-800 border-rose-200",
    expiring_soon: "bg-amber-100 text-amber-800 border-amber-200",
    error: "bg-rose-100 text-rose-800 border-rose-200",
    pending: "bg-slate-100 text-slate-800 border-slate-200",
    timeout: "bg-slate-100 text-slate-800 border-slate-200",
  };
  return colors[status] || colors.pending;
}
