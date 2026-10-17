"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus, Save, AlertCircle } from "lucide-react";
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
    loadDomains,
  } = useCertificates();

  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addError, setAddError] = useState("");
  const [selectedResult, setSelectedResult] = useState<CertificateResult | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const summary = {
    valid: results.filter((r) => r.status === "valid").length,
    expiring: results.filter((r) => r.status === "expiring_soon").length,
    expired: results.filter((r) => r.status === "expired").length,
    errors: results.filter((r) => r.status === "error").length,
    total: results.length,
  };

  useEffect(() => {
    if (results.length === 0 && !isLoading) {
      refresh();
    }
  }, [refresh, results.length, isLoading]);

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
    <div className="min-h-screen bg-background">
      {/* Aviso urgente no topo */}
      <UrgentAlertBanner />

      <nav className="sticky top-0 z-20 border-b border-card-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                SSL
              </div>
              <span className="font-bold text-lg tracking-tight">CertMonitor</span>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Verificação de Certificados SSL</h1>
          <p className="text-muted-foreground">
            Monitore a validade e segurança dos certificados SSL de múltiplos domínios.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-700 flex items-center gap-3">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <StatusSummary summary={summary} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-lg">Domínios</h2>
          </div>
          <Button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isLoading ? "Verificando..." : "Atualizar"}
          </Button>
        </div>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Nenhum resultado disponível.</p>
              <Button onClick={refresh} className="mt-4">
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
