"use client";

import { useMemo, useState } from "react";
import {
  RefreshCw,
  Plus,
  Search,
  LayoutGrid,
  List,
  X,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusSummary, type FilterStatus } from "@/components/StatusSummary";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UrgentAlertBanner } from "@/components/UrgentAlertBanner";
import { DomainCard } from "@/components/DomainCard";
import { CertificateTable } from "@/components/CertificateTable";
import { DomainDetailView } from "@/components/DomainDetailView";
import { DomainManager } from "@/components/DomainManager";
import { DemoCasesModal } from "@/components/DemoCasesModal";
import { useCertificates } from "@/hooks/useCertificates";
import { CertificateResult } from "@/types";

export default function Home() {
  const {
    results,
    domains,
    setDomains,
    isLoading,
    error,
    activeDomain,
    refresh,
    refreshDomain,
    loadDomainDetails,
  } = useCertificates();

  const [domainModalOpen, setDomainModalOpen] = useState<boolean>(false);
  const [demoModalOpen, setDemoModalOpen] = useState<boolean>(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [activeDemoResult, setActiveDemoResult] = useState<CertificateResult | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const summary = useMemo(
    () => ({
      valid: results.filter((r) => r.status === "valid").length,
      expiring: results.filter((r) => r.status === "expiring_soon").length,
      expired: results.filter((r) => r.status === "expired").length,
      insecure: results.filter((r) => r.status === "insecure").length,
      errors: results.filter((r) => r.status === "error" || r.status === "pending").length,
      total: results.length,
    }),
    [results]
  );

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (selectedStatus !== "all" && r.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesDomain = r.domain.toLowerCase().includes(q);
        const matchesIssuer = r.issuer?.toLowerCase().includes(q) ?? false;
        const matchesGrade = r.grade.toLowerCase().includes(q);
        if (!matchesDomain && !matchesIssuer && !matchesGrade) return false;
      }
      return true;
    });
  }, [results, selectedStatus, searchQuery]);

  const selectedResult = useMemo(
    () => activeDemoResult || (results.find((r) => r.domain === selectedDomain) ?? null),
    [results, selectedDomain, activeDemoResult]
  );

  const handleSelectDomain = (domain: string) => {
    setActiveDemoResult(null);
    setSelectedDomain(domain);
    loadDomainDetails(domain);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setSelectedDomain(null);
    setActiveDemoResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Aviso urgente no topo */}
      <UrgentAlertBanner
        results={results}
        onSelectDomain={handleSelectDomain}
      />

      <nav className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2.5 cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                CertMonitor
              </span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDemoModalOpen(true)}
                className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cases Demo</span>
              </Button>
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDomainModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Domínios</span>
                <span className="ml-0.5 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {domains.length}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedResult ? (
          <DomainDetailView
            result={selectedResult}
            onBack={handleBack}
            onRefreshDomain={refreshDomain}
          />
        ) : (
          <>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  Verificação de Certificados SSL
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Monitore a validade, nota de segurança e protocolos dos certificados SSL de seus domínios.
                </p>
              </div>
              {activeDomain && (
                <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-full">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verificando:{" "}
                  <span className="font-semibold">{activeDomain}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-rose-700 dark:text-rose-300 flex items-center gap-3">
                <span>{error}</span>
              </div>
            )}

            <StatusSummary
              summary={summary}
              selectedStatus={selectedStatus}
              onSelectStatus={setSelectedStatus}
            />

            {/* Barra de ferramentas: busca, filtros e modo de visualização */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex flex-1 items-center gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar domínio, emissor ou nota..."
                    className="pl-9 pr-8 bg-white dark:bg-slate-900"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      aria-label="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {selectedStatus !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedStatus("all")}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0"
                  >
                    Limpar filtro
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "grid"
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                    title="Visualização em grade"
                    aria-label="Visualização em grade"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "table"
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                    title="Visualização em tabela"
                    aria-label="Visualização em tabela"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  onClick={refresh}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  {isLoading ? "Verificando..." : "Atualizar todos"}
                </Button>
              </div>
            </div>

            {/* Conteúdo: Grid ou Tabela */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredResults.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {results.length === 0
                        ? "Nenhum resultado disponível."
                        : "Nenhum domínio corresponde aos filtros selecionados."}
                    </p>
                    {results.length === 0 ? (
                      <Button onClick={refresh} className="px-6 py-2">
                        Atualizar verificações
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedStatus("all");
                          setSearchQuery("");
                        }}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                )}
                {filteredResults.map((result) => (
                  <DomainCard
                    key={result.domain}
                    result={result}
                    onSelect={handleSelectDomain}
                    onRefreshDomain={refreshDomain}
                  />
                ))}
              </div>
            ) : (
              <CertificateTable
                results={filteredResults}
                isLoading={isLoading}
                onRefresh={refresh}
                onSelect={handleSelectDomain}
                onRefreshDomain={refreshDomain}
                activeDomain={activeDomain}
              />
            )}
          </>
        )}

        {domainModalOpen && (
          <DomainManager
            domains={domains}
            onSave={setDomains}
            onClose={() => setDomainModalOpen(false)}
            isLoading={isLoading}
          />
        )}

        {demoModalOpen && (
          <DemoCasesModal
            onClose={() => setDemoModalOpen(false)}
            onInspectDemo={(demoResult) => {
              setSelectedDomain(null);
              setActiveDemoResult(demoResult);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </main>
    </div>
  );
}


