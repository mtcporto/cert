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
    <div className="border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
      {activeAlerts.map((alert) => (
        <div key={alert.id} className="px-6 py-3 flex items-center gap-3">
          <div className={`p-2 rounded-md ${alert.type === "error" ? "bg-rose-500/20" : "bg-amber-500/20"}`}>
            <AlertTriangle className={`w-4 h-4 ${alert.type === "error" ? "text-rose-500" : "text-amber-500"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 leading-tight">
              {alert.domain ? (
                <>
                  <span className="font-bold uppercase text-[10px] text-rose-600 dark:text-rose-400 mr-1.5">
                    {alert.domain}
                  </span>
                  {alert.message}
                </>
              ) : (
                alert.message
              )}
            </p>
          </div>
          <button
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
