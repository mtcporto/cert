"use client";

import { AlertCircle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { getGradeColor, getStatusColor, formatDaysRemaining } from "@/lib/utils";
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
  const thumbnailUrl = `https://image.thum.io/get/width/400/crop/600/noanimate/https://${result.domain}`;
  const Icon = statusIconMap[result.status] || Clock;

  return (
    <div
      onClick={() => onSelect(result.domain)}
      className="group cursor-pointer rounded-xl border border-card-border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200"
    >
      {/* Preview / print da tela */}
      <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800 relative">
        <img
          src={thumbnailUrl}
          alt={`Preview de ${result.domain}`}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='18' fill='%2394a3b8'%3ESem preview%3C/text%3E%3C/svg%3E";
          }}
        />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-white/90 dark:bg-slate-900 px-3 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
            {result.domain}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-foreground truncate group-hover:underline" title={result.domain}>
          {result.domain}
        </h3>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(result.status)}`}>
          <Icon className="w-3 h-3" />
          {result.statusText}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-bold ${getGradeColor(result.grade)}`}>
          {result.grade}
        </span>
        <span className="text-muted-foreground">
          {result.validityDays !== undefined ? formatDaysRemaining(result.validityDays) : result.validity}
        </span>
      </div>

      <div className="mt-3 flex items-center text-xs text-muted-foreground">
        <ExternalLink className="w-3 h-3 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="group-hover:text-primary/70 transition-colors">Abrir site</span>
      </div>
    </div>
  );
}
