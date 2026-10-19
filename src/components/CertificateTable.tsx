"use client";

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
  RefreshCw,
} from "lucide-react";
import { getGradeColor, getStatusColor, formatDaysRemaining } from "@/lib/utils";
import type { CertificateResult } from "@/types";

interface CertificateTableProps {
  results: CertificateResult[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelect: (domain: string) => void;
  onRefreshDomain?: (domain: string) => void;
  activeDomain?: string | null;
}

const statusIconMap: Record<string, React.ElementType> = {
  valid: CheckCircle2,
  expired: AlertCircle,
  expiring_soon: AlertTriangle,
  error: AlertCircle,
  pending: Clock,
  timeout: Hourglass,
};

type SortField = "domain" | "validityDays" | "grade";

export function CertificateTable({
  results,
  onSelect,
  onRefreshDomain,
  activeDomain,
}: CertificateTableProps) {
  const [sortField, setSortField] = useState<SortField>("validityDays");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    if (sortField === "domain") {
      return a.domain.localeCompare(b.domain) * dir;
    }
    if (sortField === "grade") {
      return a.grade.localeCompare(b.grade) * dir;
    }
    const aDays = a.validityDays ?? 9999;
    const bDays = b.validityDays ?? 9999;
    return (aDays - bDays) * dir;
  });

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-1" />
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <th
                onClick={() => handleSort("domain")}
                className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
              >
                Domínio <SortIndicator field="domain" />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th
                onClick={() => handleSort("grade")}
                className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
              >
                Avaliação <SortIndicator field="grade" />
              </th>
              <th
                onClick={() => handleSort("validityDays")}
                className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
              >
                Validade <SortIndicator field="validityDays" />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                Emissor
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {sortedResults.map((result) => {
              const Icon = statusIconMap[result.status] || Clock;
              const isActive = result.domain === activeDomain;
              const isPending = result.status === "pending";

              return (
                <tr
                  key={result.domain}
                  onClick={() => onSelect(result.domain)}
                  className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    isActive ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {result.domain}
                      </span>
                      <a
                        href={`https://${result.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Abrir site"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                        result.status
                      )}`}
                    >
                      <Icon
                        className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`}
                      />
                      {result.statusText}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md text-xs font-bold ${getGradeColor(
                        result.grade
                      )}`}
                    >
                      {result.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-sm">
                      {result.validityDays !== undefined ? (
                        <>
                          <span
                            className={`font-medium ${
                              result.validityDays < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : result.validityDays <= 30
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {formatDaysRemaining(result.validityDays)}
                          </span>
                          {result.expiryDate && (
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              até{" "}
                              {new Date(result.expiryDate).toLocaleDateString(
                                "pt-BR"
                              )}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">
                          {result.validity}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell truncate max-w-[180px]">
                    {result.issuer || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-3">
                      {onRefreshDomain && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefreshDomain(result.domain);
                          }}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors disabled:opacity-40"
                          title="Reverificar domínio"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              isPending ? "animate-spin" : ""
                            }`}
                          />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(result.domain);
                        }}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Detalhes
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  Nenhum resultado encontrado para os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

