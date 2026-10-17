import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Hourglass,
} from "lucide-react";
import { getGradeColor, getStatusColor, formatDaysRemaining } from "@/lib/utils";
import type { CertificateResult } from "@/types";

interface CertificateTableProps {
  results: CertificateResult[];
  isLoading: boolean;
  onRefresh: () => void;
  activeDomain?: string;
}

const statusIconMap: Record<string, React.ElementType> = {
  valid: CheckCircle2,
  expired: AlertCircle,
  expiring_soon: AlertTriangle,
  error: AlertCircle,
  pending: Clock,
  timeout: Hourglass,
};

export function CertificateTable({
  results,
  isLoading,
  onRefresh,
  activeDomain,
}: CertificateTableProps) {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const sortedResults = [...results].sort((a, b) => {
    const aDays = a.validityDays ?? 0;
    const bDays = b.validityDays ?? 0;
    return sortDirection === "asc" ? aDays - bDays : bDays - aDays;
  });

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="rounded-xl border border-card-border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Resultados da Verificação</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSort}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Ordenar por validade{" "}
            {sortDirection === "desc" ? (
              <ChevronUp className="w-3 h-3 ml-1" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-1" />
            )}
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <Clock className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-card-border bg-secondary/30">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Domínio
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                Avaliação
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Validade
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {sortedResults.map((result) => {
              const Icon = statusIconMap[result.status] || Clock;
              const isActive = result.domain === activeDomain;
              return (
                <tr
                  key={result.domain}
                  className={`
                    transition-colors hover:bg-accent/50
                    ${isActive ? "bg-primary/5" : ""}
                  `}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://${result.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {result.domain}
                      </a>
                      <ExternalLink
                        className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(result.status)}`}>
                      <Icon className="w-3 h-3" />
                      {result.statusText}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold ${getGradeColor(result.grade)}`}>
                      {result.grade}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      {result.validityDays !== undefined ? (
                        <>
                          <span className={result.validityDays < 0 ? "text-rose-600" : result.validityDays <= 30 ? "text-amber-600" : "text-emerald-600"}>
                            {formatDaysRemaining(result.validityDays)}
                          </span>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            até {new Date(result.expiryDate ?? result.checkedAt).toLocaleDateString("pt-BR")}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{result.validity}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum resultado disponível. Clique em "Atualizar" para iniciar a verificação.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {results.length > 0 && (
        <div className="px-4 py-3 border-t border-card-border bg-secondary/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>Exibindo {results.length} resultado(s)</span>
          <span>Última atualização: {new Date().toLocaleTimeString("pt-BR")}</span>
        </div>
      )}
    </div>
  );
}
