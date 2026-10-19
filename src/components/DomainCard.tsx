"use client";

import { AlertCircle, CheckCircle2, Clock, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";
import { getGradeColor, getStatusColor } from "@/lib/utils";
import type { CertificateResult } from "@/types";

interface DomainCardProps {
  result: CertificateResult;
  onSelect: (domain: string) => void;
  onRefreshDomain?: (domain: string) => void;
}

const statusIconMap: Record<string, React.ElementType> = {
  valid: CheckCircle2,
  expired: AlertCircle,
  expiring_soon: AlertCircle,
  error: AlertCircle,
  pending: Clock,
  timeout: Clock,
};

export function DomainCard({ result, onSelect, onRefreshDomain }: DomainCardProps) {
  const Icon = statusIconMap[result.status] || Clock;
  const isPending = result.status === "pending";
  const hasProtocols = Boolean(result.protocols && result.protocols.length > 0);
  const hasVulns = Boolean(result.vulnerabilities && result.vulnerabilities.length > 0);

  return (
    <div
      onClick={() => onSelect(result.domain)}
      className="relative group cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
    >
      <div>
        {/* Header com domínio e status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
              title={result.domain}
            >
              {result.domain}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
              {result.issuer ? `${result.issuer} • ` : ""}
              {new Date(result.checkedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
              result.status
            )}`}
          >
            <Icon className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
            {result.statusText}
            {result.cached && (
              <span className="text-[10px] opacity-70 ml-0.5">(cache)</span>
            )}
          </span>
        </div>

        {/* Grade & Validade */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avaliação
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md text-sm font-bold ${getGradeColor(
                  result.grade
                )}`}
              >
                {result.grade}
              </span>
              {hasProtocols && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                  {result.protocols!.join(", ")}
                </span>
              )}
              {hasVulns && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded"
                  title={`${result.vulnerabilities!.length} vulnerabilidade(s)`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  {result.vulnerabilities!.length}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Validade
            </span>
            <div className="mt-1">
              <span
                className={`text-sm font-semibold ${
                  result.validityDays !== undefined && result.validityDays <= 30
                    ? "text-rose-600 dark:text-rose-400"
                    : result.validityDays !== undefined && result.validityDays <= 60
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {result.validity}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de progresso de validade */}
        {result.percentRemaining !== undefined && (
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                result.validityDays !== undefined && result.validityDays <= 30
                  ? "bg-rose-500"
                  : result.validityDays !== undefined && result.validityDays <= 60
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(4, Math.min(100, result.percentRemaining))}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <a
          href={`https://${result.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> Abrir site
        </a>

        {onRefreshDomain && (
          <button
            type="button"
            disabled={isPending}
            onClick={(e) => {
              e.stopPropagation();
              onRefreshDomain(result.domain);
            }}
            className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors disabled:opacity-40"
            title="Reverificar domínio"
          >
            <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
            Reverificar
          </button>
        )}
      </div>
    </div>
  );
}

