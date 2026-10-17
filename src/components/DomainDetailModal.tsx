"use client";

import { X, ExternalLink, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CertificateResult } from "@/types";
import { formatDaysRemaining, getStatusColor, getGradeColor } from "@/lib/utils";

interface DomainDetailModalProps {
  open: boolean;
  onClose: () => void;
  result: CertificateResult | null;
}

const statusIconMap: Record<string, React.ElementType> = {
  valid: CheckCircle2,
  expired: AlertCircle,
  expiring_soon: AlertCircle,
  error: AlertCircle,
  pending: Clock,
  timeout: Clock,
};

export function DomainDetailModal({ open, onClose, result }: DomainDetailModalProps) {
  if (!open || !result) return null;

  const Icon = statusIconMap[result.status] || Clock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800 mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {result.domain}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status principal */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(result.status)}`}>
                <Icon className={`w-3 h-3 ${result.status === "pending" ? "animate-spin" : ""}`} />
                {result.statusText}
              </span>
              <span className={`text-3xl font-bold ${getGradeColor(result.grade)}`}>
                {result.grade}
              </span>
            </div>
            <a
              href={`https://${result.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="Button flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Acessar {result.domain}
            </a>
          </div>

          {/* Métricas em grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Validade"
              value={result.validityDays !== undefined ? formatDaysRemaining(result.validityDays) : result.validity}
              color="text-emerald-600 dark:text-emerald-400"
            />
            {result.expiryDate && (
              <MetricCard
                title="Expira em"
                value={new Date(result.expiryDate).toLocaleDateString("pt-BR")}
                color="text-slate-600 dark:text-slate-300"
              />
            )}
            {result.issuer && (
              <MetricCard
                title="Emissor"
                value={result.issuer}
                color="text-slate-600 dark:text-slate-300"
                small
              />
            )}
            {result.totalValidityDays !== undefined && (
              <MetricCard
                title="Duração total"
                value={result.totalValidityDays === 1 ? "1 dia" : `${result.totalValidityDays} dias`}
                color="text-slate-600 dark:text-slate-300"
              />
            )}
            {result.percentRemaining !== undefined && (
              <MetricCard
                title="Tempo restante"
                value={`${result.percentRemaining}%`}
                color="text-slate-600 dark:text-slate-300"
              />
            )}
            <MetricCard
              title="Última verificação"
              value={new Date(result.checkedAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              color="text-slate-500 dark:text-slate-400"
              small
            />
          </div>

          {/* Protocolos */}
          {result.protocols?.length && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Protocolos suportados</h3>
              <div className="flex flex-wrap gap-2">
                {result.protocols.map((p) => (
                  <span key={p} className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs border border-indigo-100 dark:border-indigo-800">
                    {p}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Vulnerabilidades */}
          {result.vulnerabilities?.length && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Vulnerabilidades detectadas</h3>
              <div className="space-y-1">
                {result.vulnerabilities.map((v) => (
                  <div key={v} className="flex items-center gap-2 p-2 rounded bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs text-rose-700 dark:text-rose-300">{v}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!result.protocols?.length && !result.vulnerabilities?.length && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Informações detalhadas de protocolos e vulnerabilidades não disponíveis para este domínio.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  color,
  small = false,
}: {
  title: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-3">
      <p className={`text-[10px] font-bold ${color} uppercase tracking-wider mb-1`}>
        {title}
      </p>
      <p className={`text-sm font-medium text-slate-900 dark:text-white ${small ? "truncate" : ""}`} title={value}>
        {value}
      </p>
    </div>
  );
}
