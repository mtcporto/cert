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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card text-card-foreground shadow-2xl rounded-xl border border-card-border mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-semibold">
            <span className="mr-2 text-primary">{result.domain}</span>
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status principal */}
          <div className="rounded-xl border border-card-border bg-secondary/50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(result.status)}`}>
                <Icon className="w-3 h-3" />
                {result.statusText}
              </span>
              <span className={`text-2xl font-bold ${getGradeColor(result.grade)}`}>
                {result.grade}
              </span>
            </div>
            <a
              href={`https://${result.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="Button flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Acessar {result.domain}
            </a>
          </div>

          {/* Métricas em grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-card-border bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Validade</p>
              <p className="text-lg font-medium">
                {result.validityDays !== undefined ? formatDaysRemaining(result.validityDays) : result.validity}
              </p>
            </div>
            {result.expiryDate && (
              <div className="rounded-xl border border-card-border bg-secondary/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Expira em</p>
                <p className="text-lg font-medium">{new Date(result.expiryDate).toLocaleDateString("pt-BR")}</p>
              </div>
            )}
            {result.issuer && (
              <div className="rounded-xl border border-card-border bg-secondary/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Emissor</p>
                <p className="text-lg font-medium text-sm truncate">{result.issuer}</p>
              </div>
            )}
            {result.totalValidityDays !== undefined && (
              <div className="rounded-xl border border-card-border bg-secondary/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Duração total</p>
                <p className="text-lg font-medium">{result.totalValidityDays} dias</p>
              </div>
            )}
            {result.percentRemaining !== undefined && (
              <div className="rounded-xl border border-card-border bg-secondary/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tempo restante</p>
                <p className="text-lg font-medium">{result.percentRemaining}%</p>
              </div>
            )}
            <div className="rounded-xl border border-card-border bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Última verificação</p>
              <p className="text-lg font-medium text-sm">{new Date(result.checkedAt).toLocaleString("pt-BR")}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-card-border bg-secondary/50 px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
