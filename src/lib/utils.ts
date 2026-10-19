export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return `Expirado há ${Math.abs(days)}d`;
  if (days === 0) return "Expira hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    "A+": "bg-emerald-500 text-white dark:bg-emerald-600",
    A: "bg-emerald-500 text-white dark:bg-emerald-600",
    "A-": "bg-emerald-400 text-white dark:bg-emerald-500",
    "B+": "bg-blue-500 text-white dark:bg-blue-600",
    B: "bg-blue-500 text-white dark:bg-blue-600",
    "B-": "bg-blue-400 text-white dark:bg-blue-500",
    "C+": "bg-amber-500 text-white dark:bg-amber-600",
    C: "bg-amber-500 text-white dark:bg-amber-600",
    "C-": "bg-orange-400 text-white dark:bg-orange-500",
    T: "bg-violet-500 text-white dark:bg-violet-600",
    F: "bg-rose-500 text-white dark:bg-rose-600",
    "N/A": "bg-slate-400 text-white dark:bg-slate-600",
    "⏳": "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 animate-pulse",
  };
  return colors[grade] || colors["N/A"];
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    valid:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    expired:
      "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    expiring_soon:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    error:
      "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    pending:
      "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    timeout:
      "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };
  return colors[status] || colors.pending;
}

export function parseSslLabsDetails(rawResponse?: string | Record<string, any> | null): {
  protocols: string[];
  vulnerabilities: string[];
} {
  if (!rawResponse) return { protocols: [], vulnerabilities: [] };
  try {
    const data = typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;
    const details = data?.endpoints?.[0]?.details;
    const protocols: string[] = [];
    const vulnerabilities: string[] = [];

    if (Array.isArray(details?.protocols)) {
      for (const p of details.protocols) {
        const label = [p.name, p.version].filter(Boolean).join(" ");
        if (label && !protocols.includes(label)) {
          protocols.push(label);
        }
      }
    }

    if (details) {
      const vulnFlags: Record<string, string> = {
        heartbleed: "Heartbleed",
        poodle: "POODLE (SSLv3)",
        poodleTls: "POODLE (TLS)",
        freak: "FREAK",
        logjam: "Logjam",
        drownVulnerable: "DROWN",
        ticketbleed: "Ticketbleed",
        bleichenbacher: "ROBOT / Bleichenbacher",
        zombiePoodle: "Zombie POODLE",
        goldenDoodle: "GOLDENDOODLE",
        zeroLengthPaddingOracle: "0-Length Padding Oracle",
        sleepingPoodle: "Sleeping POODLE",
      };

      for (const [key, label] of Object.entries(vulnFlags)) {
        const val = details[key];
        if (val === true || (typeof val === "number" && val > 1)) {
          vulnerabilities.push(label);
        }
      }

      if (details.vulnBeast === true) {
        vulnerabilities.push("BEAST");
      }

      if (details.vulnerabilities && typeof details.vulnerabilities === "object") {
        for (const [key, val] of Object.entries<any>(details.vulnerabilities)) {
          if (val?.vulnerable && !vulnerabilities.includes(key)) {
            vulnerabilities.push(key);
          }
        }
      }
    }

    return { protocols, vulnerabilities };
  } catch {
    return { protocols: [], vulnerabilities: [] };
  }
}

