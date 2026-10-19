"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = domainSchema.safeParse(newDomain.trim().toLowerCase());
    if (!parsed.success) {
      const msg =
        parsed.error.issues?.[0]?.message || "Formato de domínio inválido.";
      setError(msg);
      return;
    }

    const validated = parsed.data;
    if (localDomains.includes(validated)) {
      setError("Este domínio já está na lista.");
      return;
    }
    setLocalDomains([...localDomains, validated]);
    setNewDomain("");
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
          const validImported: string[] = [];
          for (const item of imported) {
            const raw = typeof item === "string" ? item : item?.domain;
            if (typeof raw === "string") {
              const check = domainSchema.safeParse(raw.trim().toLowerCase());
              if (check.success) {
                validImported.push(check.data);
              }
            }
          }
          const merged = Array.from(new Set([...localDomains, ...validImported]));
          setLocalDomains(merged);
          setError(null);
        } else {
          setError("O arquivo JSON deve conter uma lista de domínios.");
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
      <div
        className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800 mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold">Gerenciar Domínios</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {localDomains.length} domínio(s) configurado(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleAddDomain} className="flex flex-col gap-2 mb-6">
            <div className="flex gap-2">
              <Input
                placeholder="exemplo.com.br"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            {error && (
              <p className="text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exemplo: exemplo.com.br (sem http:// ou https://)
            </p>
          </form>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Domínio
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {localDomains.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      Nenhum domínio adicionado.
                    </td>
                  </tr>
                )}
                {localDomains.map((domain, index) => (
                  <tr
                    key={`${domain}-${index}`}
                    className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{domain}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors p-1"
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

        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-b-xl">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleExport}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Exportar JSON
            </button>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Importar JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
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

