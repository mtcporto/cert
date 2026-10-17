import { CheckCircle, AlertTriangle, Clock, AlertCircle } from "lucide-react";

interface SummaryCardProps {
  label: string;
  value: number;
  color: "emerald" | "amber" | "rose" | "slate";
  icon: React.ElementType;
}

function SummaryCard({ label, value, color, icon: Icon }: SummaryCardProps) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color === "emerald" ? "bg-emerald-100" : color === "amber" ? "bg-amber-100" : color === "rose" ? "bg-rose-100" : "bg-slate-100"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

export interface StatusSummaryProps {
  summary: {
    valid: number;
    expiring: number;
    expired: number;
    errors: number;
    total: number;
  };
}

export function StatusSummary({ summary }: StatusSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard
        label="Certificados válidos"
        value={summary.valid}
        color="emerald"
        icon={CheckCircle}
      />
      <SummaryCard
        label="Expirando em breve"
        value={summary.expiring}
        color="amber"
        icon={AlertTriangle}
      />
      <SummaryCard
        label="Certificados expirados"
        value={summary.expired}
        color="rose"
        icon={AlertCircle}
      />
      <SummaryCard
        label="Com erros"
        value={summary.errors}
        color="slate"
        icon={Clock}
      />
    </div>
  );
}
