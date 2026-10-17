"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { domainSchema } from "@/lib/validations";

interface DomainManagerProps {
  domains: string[];
  onSave: (domains: string[]) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function DomainManager({
  domains,
  onSave,
  onClose,
  isLoading = false,
}: DomainManagerProps) {
  const [localDomains, setLocalDomains] = useState([...domains]);
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const validated = domainSchema.parse(newDomain);
      if (localDomains.includes(validated)) {
        setError("Este domínio já está na lista.");
        return;
      }
      setLocalDomains([...localDomains, validated]);
      setNewDomain("");
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Erro ao adicionar domínio.");
    }
  };

  const handleRemove = (index: number) => {
    setLocalDomains(localDomains.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(localDomains);
    onClose();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const valid = imported.filter(
            (item: unknown) => typeof item === "string"
          );
          setLocalDomains([...localDomains, ...valid]);
        }
      } catch {
        setError("Arquivo JSON inválido.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(localDomains, null, 2)
    )}`;
    const anchor = document.createElement("a");
    anchor.href = dataStr;
    anchor.download = "dominios_ssl_check.json";
    anchor.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-card text-card-foreground shadow-xl rounded-xl border border-card-border mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-semibold">Gerenciar Domínios</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleAddDomain} className="flex flex-col gap-3 mb-6">
            <div className="flex gap-2">
              <Input
                placeholder="exemplo.com.br"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            {error && (
              <p className="text-sm text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Exemplo: exemplo.com.br (sem http:// ou https://)
            </p>
          </form>

          <div className="rounded-xl border border-card-border bg-background overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-card-border bg-secondary/30">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Domínio</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {localDomains.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhum domínio adicionado.
                    </td>
                  </tr>
                )}
                {localDomains.map((domain, index) => (
                  <tr key={`${domain}-${index}`}>
                    <td className="px-4 py-3 text-sm">
                      {domain}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(index)}
                        className="text-rose-500 hover:text-rose-700 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-card-border bg-secondary/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            <button onClick={handleExport} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Download className="w-3 h-3" /> Exportar
            </button>
            <label className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer">
              <Upload className="w-3 h-3" /> Importar
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
