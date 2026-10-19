"use client";

import { useEffect } from "react";
import {
  X,
  BookOpen,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_CASES, DemoCase } from "@/data/demoCases";
import { CertificateResult } from "@/types";

interface DemoCasesModalProps {
  onClose: () => void;
  onInspectDemo: (result: CertificateResult) => void;
}

export function DemoCasesModal({ onClose, onInspectDemo }: DemoCasesModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const getStatusBadge = (category: DemoCase["category"], grade: string) => {
    switch (category) {
      case "reference":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            Nota {grade} • Válido
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Clock className="w-3.5 h-3.5" />
            Expirado
          </span>
        );
      case "untrusted":
      case "mismatch":
      case "legacy":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <ShieldAlert className="w-3.5 h-3.5" />
            Nota {grade} • Inseguro
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Cases Demonstrativos Públicos (SSL/TLS)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exemplos reais e didáticos de configurações modernas, legadas e falhas documentadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disclaimer Educativo */}
        <div className="px-6 py-3.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            <strong>Ambiente Educativo e Diagnóstico:</strong> Esta coleção utiliza exclusivamente domínios públicos de teste (mantidos pelo projeto <em>badssl.com</em> e referências web) para demonstrar a categorização, resolução de piores notas e matriz de protocolos do CertMonitor. Não inclui qualquer vetor de exploração ou ataque.
          </p>
        </div>

        {/* Lista de Cases */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {DEMO_CASES.map((demo) => (
            <div
              key={demo.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white text-base">
                    {demo.title}
                  </span>
                  {getStatusBadge(demo.category, demo.result.grade)}
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {demo.result.domain}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {demo.description}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <FileCode className="w-3.5 h-3.5 text-slate-400" />
                  <span>{demo.technicalDetails}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => {
                    onInspectDemo(demo.result);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspecionar Detalhes</span>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total de cases demonstrativos: {DEMO_CASES.length}
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
