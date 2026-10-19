"use client";

import { useEffect } from "react";
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Server,
  KeyRound,
  FileCheck2,
  Globe,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CertificateResult } from "@/types";
import {
  formatDaysRemaining,
  getStatusColor,
  getGradeColor,
} from "@/lib/utils";

interface DomainDetailViewProps {
  result: CertificateResult;
  onBack: () => void;
  onRefreshDomain: (domain: string) => void;
}

const ALL_KNOWN_PROTOCOLS = [
  { name: "TLS 1.3", secure: true, recommended: true },
  { name: "TLS 1.2", secure: true, recommended: true },
  { name: "TLS 1.1", secure: false, recommended: false },
  { name: "TLS 1.0", secure: false, recommended: false },
  { name: "SSL 3.0", secure: false, recommended: false },
  { name: "SSL 2.0", secure: false, recommended: false },
];

const statusIconMap: Record<string, React.ElementType> = {
  valid: CheckCircle2,
  expired: AlertCircle,
  expiring_soon: AlertCircle,
  error: AlertCircle,
  pending: Clock,
  timeout: Clock,
};

export function DomainDetailView({
  result,
  onBack,
  onRefreshDomain,
}: DomainDetailViewProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  const Icon = statusIconMap[result.status] || Clock;
  const isPending = result.status === "pending";
  const supportedProtocols = result.protocols || [];
  const vulnerabilities = result.vulnerabilities || [];
  const securityChecks = result.securityChecks || [];
  const vulnChecks = securityChecks.filter((c) => c.category === "vulnerability");
  const featureChecks = securityChecks.filter((c) => c.category === "feature");
  const certDetails = result.certDetails;
  const endpoints = result.endpoints || [];
  const cipherSuites = result.cipherSuites || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barra superior de navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para todos os domínios
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onRefreshDomain(result.domain)}
            className="flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
            />
            {isPending ? "Verificando..." : "Reverificar Certificado"}
          </Button>
          <a
            href={`https://${result.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Acessar site
          </a>
        </div>
      </div>

      {/* Hero Card do Domínio */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`flex items-center justify-center min-w-[4rem] h-16 px-4 rounded-2xl text-3xl font-extrabold shadow-sm ${getGradeColor(
                result.grade
              )}`}
            >
              {result.grade}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {result.domain}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${getStatusColor(
                    result.status
                  )}`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
                  />
                  {result.statusText}
                </span>
                {result.cached && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    Cache D1
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {result.issuer && (
                  <span>
                    Emissor:{" "}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {result.issuer}
                    </strong>
                  </span>
                )}
                {result.serverSignature && (
                  <span>
                    Servidor:{" "}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {result.serverSignature}
                    </strong>
                  </span>
                )}
                {result.alpnProtocols && (
                  <span>
                    ALPN:{" "}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {result.alpnProtocols}
                    </strong>
                  </span>
                )}
                <span>
                  Verificado em:{" "}
                  {new Date(result.checkedAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Resumo rápido de validade à direita */}
          <div className="flex flex-col md:items-end justify-center border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tempo Restante
            </span>
            <span
              className={`text-2xl font-bold mt-0.5 ${
                result.validityDays !== undefined && result.validityDays <= 30
                  ? "text-rose-500"
                  : result.validityDays !== undefined && result.validityDays <= 60
                    ? "text-amber-500"
                    : "text-emerald-500"
              }`}
            >
              {result.validityDays !== undefined
                ? formatDaysRemaining(result.validityDays)
                : result.validity}
            </span>
            {result.expiryDate && (
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Expira em{" "}
                {new Date(result.expiryDate).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Barra de progresso do ciclo de vida */}
        {result.percentRemaining !== undefined && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span>
                Ciclo de validade do certificado (
                {result.totalValidityDays
                  ? `${result.totalValidityDays} dias totais`
                  : "período atual"}
                )
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {result.percentRemaining}% restante
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  result.validityDays !== undefined && result.validityDays <= 30
                    ? "bg-rose-500"
                    : result.validityDays !== undefined &&
                        result.validityDays <= 60
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.max(3, Math.min(100, result.percentRemaining))}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid de Métricas de Validade e Criptografia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Detalhes do Certificado & Datas */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <FileCheck2 className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Certificado e Criptografia
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoItem
              label="Emissor (CA)"
              value={result.issuer || certDetails?.issuerSubject || "N/A"}
            />
            <InfoItem
              label="Assunto Principal"
              value={
                certDetails?.commonNames?.[0] ||
                certDetails?.subject ||
                result.domain
              }
            />
            <InfoItem
              label="Chave Pública"
              value={
                certDetails?.keyAlg
                  ? `${certDetails.keyAlg} ${certDetails.keySize || ""} bits`
                  : "N/A"
              }
            />
            <InfoItem
              label="Assinatura"
              value={certDetails?.sigAlg || "N/A"}
            />
            <InfoItem
              label="Emitido em"
              value={
                certDetails?.notBefore
                  ? new Date(certDetails.notBefore).toLocaleDateString("pt-BR")
                  : "N/A"
              }
            />
            <InfoItem
              label="Expira em"
              value={
                result.expiryDate
                  ? new Date(result.expiryDate).toLocaleDateString("pt-BR")
                  : "N/A"
              }
            />
            <InfoItem
              label="Certificate Transparency"
              value={
                certDetails?.sct !== undefined
                  ? certDetails.sct
                    ? "Sim (SCT presente)"
                    : "Não detectado"
                  : "N/A"
              }
            />
            <InfoItem
              label="Duração Total"
              value={
                result.totalValidityDays !== undefined
                  ? `${result.totalValidityDays} dias`
                  : "N/A"
              }
            />
            <InfoItem
              label="Próximo Check"
              value={
                result.nextCheckAt
                  ? new Date(result.nextCheckAt).toLocaleDateString("pt-BR")
                  : "Automático"
              }
            />
          </div>

          {/* SANs (Alternative Names) */}
          {certDetails?.altNames && certDetails.altNames.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Domínios cobertos pelo certificado (SANs:{" "}
                {certDetails.altNames.length})
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {certDetails.altNames.map((san) => (
                  <span
                    key={san}
                    className="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {san}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Matriz de Protocolos TLS/SSL & HSTS */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Lock className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Protocolos TLS / SSL
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_KNOWN_PROTOCOLS.map((proto) => {
              const isEnabled = supportedProtocols.some(
                (p) => p.toUpperCase() === proto.name.toUpperCase()
              );
              const isGood =
                (proto.secure && isEnabled) || (!proto.secure && !isEnabled);

              return (
                <div
                  key={proto.name}
                  className={`rounded-lg border p-3 flex items-center justify-between ${
                    isEnabled
                      ? proto.secure
                        ? "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30"
                        : "border-rose-200 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/30"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-70"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {proto.name}
                    </p>
                    <p
                      className={`text-[11px] font-medium ${
                        isEnabled
                          ? proto.secure
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {isEnabled
                        ? proto.secure
                          ? "Ativo (Seguro)"
                          : "Ativo (Inseguro)"
                        : "Desativado"}
                    </p>
                  </div>
                  {isGood ? (
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        isEnabled
                          ? "text-emerald-500"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Recursos de Segurança (Forward Secrecy, HSTS, OCSP, ALPN) */}
          {featureChecks.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Configurações de Segurança do Servidor
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {featureChecks.map((feat) => (
                  <div
                    key={feat.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {feat.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {feat.detail}
                      </p>
                    </div>
                    <span
                      className={`ml-2 shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        feat.passed
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
                      }`}
                    >
                      {feat.passed ? "Sim" : "Não"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auditoria de Vulnerabilidades Conhecidas */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {vulnerabilities.length > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            )}
            <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Auditoria de Vulnerabilidades SSL/TLS
            </h2>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit ${
              vulnerabilities.length > 0
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
            }`}
          >
            {vulnerabilities.length > 0
              ? `${vulnerabilities.length} vulnerabilidade(s) encontrada(s)`
              : "Nenhuma vulnerabilidade detectada"}
          </span>
        </div>

        {vulnChecks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vulnChecks.map((check) => (
              <div
                key={check.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  check.passed
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30"
                    : "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {check.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {check.label}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-semibold ml-2 shrink-0 ${
                    check.passed
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {check.detail}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Os testes detalhados de vulnerabilidades não estão disponíveis no cache atual. Clique em &ldquo;Reverificar Certificado&rdquo; no topo para consultar a matriz completa.
          </p>
        )}
      </div>

      {/* Suítes de Cifra (Cipher Suites) e Cadeia de Certificados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cipher Suites */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-500" />
              <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Suítes de Cifra (Cipher Suites)
              </h2>
            </div>
            {cipherSuites.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {cipherSuites.length} suíte(s)
              </span>
            )}
          </div>

          {cipherSuites.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
              {cipherSuites.map((suite) => (
                <div
                  key={suite.name}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-mono text-slate-800 dark:text-slate-200 break-all">
                    {suite.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {suite.forwardSecrecy && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                        FS
                      </span>
                    )}
                    {suite.cipherStrength && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                        {suite.cipherStrength} bits
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nenhuma suíte de cifra detalhada registrada para esta verificação.
            </p>
          )}
        </div>

        {/* Cadeia de Certificados & Endpoints */}
        <div className="space-y-6">
          {/* Cadeia de Certificação */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Cadeia de Certificação (Chain)
              </h2>
            </div>

            {certDetails?.chain && certDetails.chain.length > 0 ? (
              <div className="space-y-3">
                {certDetails.chain.map((item, idx) => (
                  <div
                    key={`${item.subject}-${idx}`}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        #{idx + 1} — {item.subject}
                      </span>
                      {item.keyAlg && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[10px] font-semibold shrink-0">
                          {item.keyAlg} {item.keySize || ""}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Emissor: {item.issuer}
                    </p>
                    <div className="flex flex-wrap gap-x-4 text-[11px] text-slate-400">
                      {item.sigAlg && <span>Assinatura: {item.sigAlg}</span>}
                      {item.notAfter && (
                        <span>
                          Válido até:{" "}
                          {new Date(item.notAfter).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detalhes da cadeia de certificação indisponíveis.
              </p>
            )}
          </div>

          {/* Endpoints / Servidores */}
          {endpoints.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Server className="w-4 h-4 text-indigo-500" />
                <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Endpoints Analisados ({endpoints.length})
                </h2>
              </div>
              <div className="space-y-2.5">
                {endpoints.map((ep) => (
                  <div
                    key={ep.ipAddress}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-mono font-semibold text-slate-900 dark:text-white">
                        {ep.ipAddress}
                      </p>
                      {ep.serverName && (
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {ep.serverName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {ep.durationMs && (
                        <span className="text-[11px] text-slate-400">
                          {Math.round(ep.durationMs / 1000)}s
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${getGradeColor(
                          ep.grade || "N/A"
                        )}`}
                      >
                        {ep.grade || "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </p>
      <p
        className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
