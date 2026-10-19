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

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://cert-ssl-api-d1.mosaicoworkers.workers.dev";

export function UrgentAlertBanner({
  results = [],
  onSelectDomain,
}: UrgentAlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [serverAlerts, setServerAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    async function fetchServerEvents() {
      try {
        const res = await fetch(`${API_BASE}/events`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.events)) {
            const unread = data.events
              .filter((e: any) => !e.isRead)
              .map((e: any) => ({
                id: `server-event-${e.id}`,
                domain: e.domain,
                type: e.severity as Alert["type"],
                message: `${e.title}: ${e.message}`,
              }));
            setServerAlerts(unread);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchServerEvents();
  }, []);

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
      } else if (r.status === "insecure") {
        list.push({
          id: `insecure-${r.domain}`,
          domain: r.domain,
          type: "error",
          message: `${r.statusText} (Nota ${r.grade}).`,
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

  const activeAlerts = useMemo(() => {
    const seen = new Set<string>();
    const combined: Alert[] = [];
    for (const a of [...derivedAlerts, ...serverAlerts]) {
      const key = `${a.domain}:${a.message}`;
      if (!seen.has(key) && !dismissed.has(a.id)) {
        seen.add(key);
        combined.push(a);
      }
    }
    return combined;
  }, [derivedAlerts, serverAlerts, dismissed]);

  const handleDismiss = (alert: Alert) => {
    setDismissed((prev) => new Set([...prev, alert.id]));
    if (alert.id.startsWith("server-event-")) {
      const eventId = Number(alert.id.replace("server-event-", ""));
      fetch(`${API_BASE}/events/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId }),
      }).catch(() => {});
    }
  };

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
            onClick={() => handleDismiss(alert)}
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

