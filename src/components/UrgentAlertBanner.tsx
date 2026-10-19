"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { CertificateResult } from "@/types";

interface Alert {
  id: string;
  message: string;
  type: "error" | "warning" | "info";
  domain?: string;
}

interface UrgentAlertBannerProps {
  results?: CertificateResult[];
  onSelectDomain?: (domain: string) => void;
}

export function UrgentAlertBanner({
  results = [],
  onSelectDomain,
}: UrgentAlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const derivedAlerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];
    for (const r of results) {
      if (r.status === "expired") {
        list.push({
          id: `expired-${r.domain}`,
          domain: r.domain,
          type: "error",
          message: "Certificado SSL expirado! Renovação imediata necessária.",
        });
      } else if (r.status === "expiring_soon") {
        list.push({
          id: `expiring-${r.domain}`,
          domain: r.domain,
          type: "warning",
          message: `Certificado expira em ${r.validity}.`,
        });
      } else if (r.status === "error") {
        list.push({
          id: `error-${r.domain}`,
          domain: r.domain,
          type: "error",
          message: r.error || "Falha na verificação do certificado SSL.",
        });
      } else if (r.vulnerabilities && r.vulnerabilities.length > 0) {
        list.push({
          id: `vuln-${r.domain}`,
          domain: r.domain,
          type: "warning",
          message: `Vulnerabilidades detectadas: ${r.vulnerabilities.join(", ")}.`,
        });
      }
    }
    return list;
  }, [results]);

  const activeAlerts = derivedAlerts.filter((a) => !dismissed.has(a.id));

  if (activeAlerts.length === 0) return null;

  return (
    <div className="border-b border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 divide-y divide-amber-200/60 dark:divide-amber-800/50">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3"
        >
          <div
            className={`p-1.5 rounded-md shrink-0 ${
              alert.type === "error"
                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200 leading-tight">
              {alert.domain ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      alert.domain && onSelectDomain?.(alert.domain)
                    }
                    className="font-bold uppercase text-xs text-rose-600 dark:text-rose-400 mr-2 hover:underline cursor-pointer"
                  >
                    {alert.domain}
                  </button>
                  {alert.message}
                </>
              ) : (
                alert.message
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

