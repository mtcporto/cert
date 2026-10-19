import { CheckCircle, AlertTriangle, Clock, AlertCircle, ShieldAlert } from "lucide-react";

export type FilterStatus = "all" | "valid" | "expiring_soon" | "expired" | "insecure" | "error";

interface SummaryCardProps {
  label: string;
  value: number;
  color: "emerald" | "amber" | "rose" | "purple" | "slate";
  icon: React.ElementType;
  active?: boolean;
  onClick?: () => void;
}

function SummaryCard({
  label,
  value,
  color,
  icon: Icon,
  active = false,
  onClick,
}: SummaryCardProps) {
  const colorMap: Record<string, string> = {
    emerald:
      "bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/70 dark:text-emerald-300",
    amber:
      "bg-amber-50/80 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/70 dark:text-amber-300",
    rose:
      "bg-rose-50/80 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/70 dark:text-rose-300",
    purple:
      "bg-purple-50/80 border-purple-200 text-purple-800 dark:bg-purple-950/30 dark:border-purple-800/70 dark:text-purple-300",
    slate:
      "bg-slate-100/80 border-slate-200 text-slate-800 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-300",
  };

  const iconBgMap: Record<string, string> = {
    emerald: "bg-emerald-100 dark:bg-emerald-900/60",
    amber: "bg-amber-100 dark:bg-amber-900/60",
    rose: "bg-rose-100 dark:bg-rose-900/60",
    purple: "bg-purple-100 dark:bg-purple-900/60",
    slate: "bg-slate-200/70 dark:bg-slate-800",
  };

  const ringMap: Record<string, string> = {
    emerald: "ring-2 ring-emerald-500 dark:ring-emerald-400",
    amber: "ring-2 ring-amber-500 dark:ring-amber-400",
    rose: "ring-2 ring-rose-500 dark:ring-rose-400",
    purple: "ring-2 ring-purple-500 dark:ring-purple-400",
    slate: "ring-2 ring-indigo-500 dark:ring-indigo-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all duration-150 hover:shadow-md cursor-pointer ${colorMap[color]} ${
        active ? ringMap[color] : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${iconBgMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
        </div>
      </div>
    </button>
  );
}

export interface StatusSummaryProps {
  summary: {
    valid: number;
    expiring: number;
    expired: number;
    insecure: number;
    errors: number;
    total: number;
  };
  selectedStatus?: FilterStatus;
  onSelectStatus?: (status: FilterStatus) => void;
}

export function StatusSummary({
  summary,
  selectedStatus = "all",
  onSelectStatus,
}: StatusSummaryProps) {
  const handleToggle = (target: FilterStatus) => {
    if (!onSelectStatus) return;
    onSelectStatus(selectedStatus === target ? "all" : target);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      <SummaryCard
        label="Certificados válidos"
        value={summary.valid}
        color="emerald"
        icon={CheckCircle}
        active={selectedStatus === "valid"}
        onClick={() => handleToggle("valid")}
      />
      <SummaryCard
        label="Expirando em breve"
        value={summary.expiring}
        color="amber"
        icon={AlertTriangle}
        active={selectedStatus === "expiring_soon"}
        onClick={() => handleToggle("expiring_soon")}
      />
      <SummaryCard
        label="Certificados expirados"
        value={summary.expired}
        color="rose"
        icon={AlertCircle}
        active={selectedStatus === "expired"}
        onClick={() => handleToggle("expired")}
      />
      <SummaryCard
        label="Inseguros (T/M/F)"
        value={summary.insecure}
        color="purple"
        icon={ShieldAlert}
        active={selectedStatus === "insecure"}
        onClick={() => handleToggle("insecure")}
      />
      <SummaryCard
        label="Com erros / Pendentes"
        value={summary.errors}
        color="slate"
        icon={Clock}
        active={selectedStatus === "error"}
        onClick={() => handleToggle("error")}
      />
    </div>
  );
}

