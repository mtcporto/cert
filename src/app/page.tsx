"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusSummary } from "@/components/StatusSummary";
import { CertificateTable } from "@/components/CertificateTable";
import { DomainManager } from "@/components/DomainManager";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCertificates } from "@/hooks/useCertificates";

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

  const summary = {
    valid: results.filter((r) => r.status === "valid").length,
    expiring: results.filter((r) => r.status === "expiring_soon").length,
    expired: results.filter((r) => r.status === "expired").length,
    errors: results.filter((r) => r.status === "error").length,
    total: results.length,
  };

  // Executa verificação inicial ao carregar
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

    // validação simples
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

  return (
    <div className="min-h-screen bg-background">
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

        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1 lg:w-3/4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-lg">Resultados</h2>
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

            <CertificateTable
              results={results}
              isLoading={isLoading}
              onRefresh={refresh}
              activeDomain={activeDomain ?? undefined}
            />
          </div>

          <aside className="lg:w-1/4 space-y-4">
            <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
              <h3 className="font-semibold mb-3">Adicionar Domínio</h3>
              <form onSubmit={handleQuickAdd} className="flex gap-2">
                <Input
                  placeholder="exemplo.com.br"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm">
                  <Plus className="w-3 h-3" />
                </Button>
              </form>
              {addError && (
                <p className="mt-1 text-xs text-rose-500">{addError}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Pressione Enter para adicionar.
              </p>
            </div>

            <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
              <h3 className="font-semibold mb-3">Lista de Domínios</h3>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {domains.map((d) => (
                  <div key={d} className="flex items-center justify-between p-2 rounded border border-card-border/50 text-sm">
                    <span className="text-foreground truncate">{d}</span>
                    <button
                      onClick={() =>
                        setDomains(domains.filter((x) => x !== d))
                      }
                      className="text-rose-400 hover:text-rose-600"
                      title="Remover"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {domains.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Nenhum domínio cadastrado.
                  </p>
                )}
              </div>
              <Button
                onClick={() => setDomainModalOpen(true)}
                className="w-full mt-3 size-sm"
              >
                <Save className="w-3 h-3 mr-1" /> Salvar lista
              </Button>
            </div>
          </aside>
        </div>

        {domainModalOpen && (
          <DomainManager
            domains={domains}
            onSave={setDomains}
            onClose={() => setDomainModalOpen(false)}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
