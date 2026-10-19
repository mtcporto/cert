"use client";

import { useEffect } from "react";
import { X, ExternalLink, Clock, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CertificateResult } from "@/types";
import { formatDaysRemaining, getStatusColor, getGradeColor } from "@/lib/utils";

interface DomainDetailModalProps {
  open: boolean;
  onClose: () => void;
  result: CertificateResult | null;
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

export function DomainDetailModal({
  open,
  onClose,
  result,
  onRefreshDomain,
}: DomainDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !result) return null;

  const Icon = statusIconMap[result.status] || Clock;
  const hasProtocols = Boolean(result.protocols && result.protocols.length > 0);
  const hasVulnerabilities = Boolean(
    result.vulnerabilities && result.vulnerabilities.length > 0
  );
  const isPending = result.status === "pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800 mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {result.domain}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            aria-label="Fechar detalhes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status principal */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center justify-center min-w-[2.75rem] h-11 px-3 rounded-lg text-xl font-bold ${getGradeColor(
                  result.grade
                )}`}
              >
                {result.grade}
              </span>
              <div className="space-y-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                    result.status
                  )}`}
                >
                  <Icon
                    className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`}
                  />
                  {result.statusText}
                </span>
                {result.cached && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Resultado em cache
                  </p>
                )}
              </div>
            </div>
            <a
              href={`https://${result.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir site
            </a>
          </div>

          {/* Métricas em grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard
              title="Validade"
              value={
                result.validityDays !== undefined
                  ? formatDaysRemaining(result.validityDays)
                  : result.validity
              }
              color={
                result.validityDays !== undefined && result.validityDays <= 30
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }
            />
            {result.expiryDate && (
              <MetricCard
                title="Expira em"
                value={new Date(result.expiryDate).toLocaleDateString("pt-BR")}
                color="text-slate-500 dark:text-slate-400"
              />
            )}
            {result.issuer && (
              <MetricCard
                title="Emissor"
                value={result.issuer}
                color="text-slate-500 dark:text-slate-400"
                small
              />
            )}
            {result.totalValidityDays !== undefined && (
              <MetricCard
                title="Duração total"
                value={
                  result.totalValidityDays === 1
                    ? "1 dia"
                    : `${result.totalValidityDays} dias`
                }
                color="text-slate-500 dark:text-slate-400"
              />
            )}
            {result.percentRemaining !== undefined && (
              <MetricCard
                title="Tempo restante"
                value={`${result.percentRemaining}%`}
                color="text-slate-500 dark:text-slate-400"
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
          {hasProtocols && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Protocolos suportados
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.protocols!.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Vulnerabilidades */}
          {hasVulnerabilities ? (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Vulnerabilidades detectadas
              </h3>
              <div className="space-y-1.5">
                {result.vulnerabilities!.map((v) => (
                  <div
                    key={v}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            hasProtocols && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Nenhuma vulnerabilidade conhecida detectada.</span>
              </div>
            )
          )}

          {!hasProtocols && !hasVulnerabilities && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informações detalhadas de protocolos e vulnerabilidades não disponíveis para este domínio. Clique em &ldquo;Reverificar&rdquo; para atualizar os dados completos.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-4 flex items-center justify-between gap-2 rounded-b-xl">
          {onRefreshDomain ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onRefreshDomain(result.domain)}
              className="flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
              />
              {isPending ? "Verificando..." : "Reverificar"}
            </Button>
          ) : (
            <div />
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
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
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-3">
      <p
        className={`text-[10px] font-bold ${color} uppercase tracking-wider mb-1`}
      >
        {title}
      </p>
      <p
        className={`text-sm font-semibold text-slate-900 dark:text-white ${
          small ? "truncate" : ""
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

