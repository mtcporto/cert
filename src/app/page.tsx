"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusSummary } from "@/components/StatusSummary";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UrgentAlertBanner } from "@/components/UrgentAlertBanner";
import { DomainCard } from "@/components/DomainCard";
import { DomainDetailModal } from "@/components/DomainDetailModal";
import { DomainManager } from "@/components/DomainManager";
import { useCertificates } from "@/hooks/useCertificates";
import type { CertificateResult } from "@/types";

export default function Home() {
  const {
    results,
    domains,
    setDomains,
    isLoading,
    error,
    activeDomain,
    refresh,
  } = useCertificates();

  const [domainModalOpen, setDomainModalOpen] = useState<boolean>(false);
  const [newDomain, setNewDomain] = useState<string>("");
  const [addError, setAddError] = useState<string>("");
  const [selectedResult, setSelectedResult] = useState<CertificateResult | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  const summary = {
    valid: results.filter((r) => r.status === "valid").length,
    expiring: results.filter((r) => r.status === "expiring_soon").length,
    expired: results.filter((r) => r.status === "expired").length,
    errors: results.filter((r) => r.status === "error").length,
    total: results.length,
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    const trimmed = newDomain.trim();
    if (!trimmed) return;

    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])+$/.test(trimmed)) {
      setAddError("Formato de domínio inválido.");
      return;
    }

    if (domains.includes(trimmed)) {
      setAddError("Este domínio já está na lista.");
      return;
    }

    setDomains([...domains, trimmed]);
    setNewDomain("");
  };

  const handleSelectDomain = (domain: string) => {
    const result = results.find((r) => r.domain === domain);
    setSelectedResult(result ?? null);
    setDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Aviso urgente no topo */}
      <UrgentAlertBanner />

      <nav className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                SSL
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                CertMonitor
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDomainModalOpen(true)}
                className="hidden sm:block"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Domínios
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Verificação de Certificados SSL
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Monitore a validade e segurança dos certificados SSL de múltiplos domínios.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-700 flex items-center gap-3">
            <span className="w-4 h-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3" />
              </svg>
            </span>
            <span>{error}</span>
          </div>
        )}

        <StatusSummary summary={summary} />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </span>
            <h2 className="font-semibold text-lg text-slate-900 dark:text-white">Domínios</h2>
          </div>
          <Button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {isLoading ? "Verificando..." : "Atualizar"}
          </Button>
        </div>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Nenhum resultado disponível.</p>
              <Button onClick={refresh} className="px-6 py-2">
                Atualizar verificações
              </Button>
            </div>
          )}
          {results.map((result) => (
            <DomainCard key={result.domain} result={result} onSelect={handleSelectDomain} />
          ))}
        </div>

        {domainModalOpen && (
          <DomainManager
            domains={domains}
            onSave={setDomains}
            onClose={() => setDomainModalOpen(false)}
            isLoading={isLoading}
          />
        )}

        <DomainDetailModal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          result={selectedResult}
        />
      </main>
    </div>
  );
}
