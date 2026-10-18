"use client";

import { AlertCircle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { getGradeColor, getStatusColor } from "@/lib/utils";
import type { CertificateResult } from "@/types";

interface DomainCardProps {
  result: CertificateResult;
  onSelect: (domain: string) => void;
}

const statusIconMap: Record<string, React.ElementType> = {
  valid: CheckCircle2,
  expired: AlertCircle,
  expiring_soon: AlertCircle,
  error: AlertCircle,
  pending: Clock,
  timeout: Clock,
};

export function DomainCard({ result, onSelect }: DomainCardProps) {
  const Icon = statusIconMap[result.status] || Clock;
  const isPending = result.status === "pending";

  return (
    <div
      onClick={() => onSelect(result.domain)}
      className="group cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-lg transition-all duration-200"
    >
      {/* Header com domínio e status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate group-hover:underline" title={result.domain}>
            {result.domain}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Última verificação:{" "}
            {new Date(result.checkedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(result.status)}`}>
          <Icon className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
          {result.statusText}
          {result.cached && <span className="text-[10px] opacity-70 ml-1">cache</span>}
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avaliação</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-lg font-bold ${getGradeColor(result.grade)}`}>
              {result.grade}
            </span>
            {result.protocols?.length && (
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {result.protocols.join(", ")}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Validade</span>
          <div className="mt-0.5">
            <span className={`text-sm font-medium ${
              result.validityDays !== undefined && result.validityDays <= 30
                ? "text-rose-600 dark:text-rose-400"
                : result.validityDays !== undefined && result.validityDays <= 90
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {result.validity}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <a
          href={`https://${result.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> Abrir site
        </a>
      </div>

      {/* Indicador de carregamento no canto */}
      {isPending && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      )}
    </div>
  );
}
