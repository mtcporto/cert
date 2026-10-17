"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, X } from "lucide-react";

interface Alert {
  id: string;
  message: string;
  type: "error" | "warning" | "info";
  domain?: string;
}

export function UrgentAlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data: any) => setAlerts(data.alerts || []))
      .catch(() => {
        // Sem alertas se falhar
      });
  }, []);

  const activeAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (activeAlerts.length === 0) return null;

  return (
    <div className="border-b border-card-border bg-amber-50 dark:bg-amber-900/20">
      {activeAlerts.map((alert) => (
        <div key={alert.id} className="px-6 py-3 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20">
          <div className={`p-2 rounded ${alert.type === "error" ? "bg-rose-500/20" : "bg-amber-500/20"}`}>
            <AlertTriangle className={`w-4 h-4 ${alert.type === "error" ? "text-rose-500" : "text-amber-500"}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {alert.domain ? `<span class="font-bold uppercase text-[10px]">${alert.domain}</span> ${alert.message}` : alert.message}
            </p>
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
