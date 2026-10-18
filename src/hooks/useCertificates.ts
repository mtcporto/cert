"use client";

import { useState, useCallback, useEffect } from "react";
import type { CertificateResult, Domain } from "@/types";

const DEFAULT_DOMAINS: string[] = [
  "vivajoaopessoa.com",
  "kindredveil.com",
  "imobiliariapenaareia.com.br",
  "nuvemmarketing.com",
  "ride4x4.com",
];

function makePendingResult(domain: string): CertificateResult {
  return {
    domain,
    grade: "⏳",
    status: "pending",
    statusText: "Aguardando análise",
    icon: "clock",
    statusClass: "",
    validity: "Verificando...",
    checkedAt: new Date().toISOString(),
  };
}

function isCacheValid(check: any): boolean {
  if (!check?.nextCheckAt) return false;
  const now = new Date().getTime();
  const next = new Date(check.nextCheckAt).getTime();
  return next > now;
}

export function useCertificates() {
  const [results, setResults] = useState<CertificateResult[]>([]);
  const [domains, setDomains] = useState<string[]>(DEFAULT_DOMAINS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const loadDomains = useCallback(async () => {
    try {
      const res = await fetch("/api/domains");
      if (res.ok) {
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
          const domainsList = data.domains.map((d: any) =>
            typeof d === "string" ? d : d.domain
          );
          setDomains(domainsList);
        }
      }
    } catch {
      // fallback para defaults
    }
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const analyzeDomain = useCallback(async (domain: string): Promise<CertificateResult> => {
    try {
      const res = await fetch(`/api/analyze?host=${encodeURIComponent(domain)}`);
      if (!res.ok) throw new Error("Falha na análise");
      const data: any = await res.json();

      const endpoint = data.endpoints?.[0];
      const grade = (endpoint?.grade || "N/A") as CertificateResult["grade"];
      const status = data.status;

      let certStatus: CertificateResult["status"] = "pending";
      let statusText = "Aguardando análise";
      let validityDays: number | undefined;
      let expiryDate: string | undefined;
      let issuer: string | undefined;
      let totalValidityDays: number | undefined;
      let percentRemaining: number | undefined;
      let protocols: string[] = [];
      let vulnerabilities: string[] = [];

      if (status === "READY") {
        const valid = endpoint?.statusMessage === "Ready" && grade !== "N/A";

        if (!valid) {
          certStatus = "error";
          statusText = "Certificado inválido";
        } else {
          const mainCert = data.certs?.find(
            (c: any) =>
              c.commonNames?.includes(domain) || c.altNames?.includes(domain)
          ) || data.certs?.[0];

          if (mainCert?.notAfter) {
            const expiryTs = mainCert.notAfter;
            const now = Date.now();
            const daysRemaining = Math.floor(
              (expiryTs - now) / (1000 * 60 * 60 * 24)
            );
            validityDays = daysRemaining;
            expiryDate = new Date(expiryTs).toISOString();

            if (daysRemaining < 0) {
              certStatus = "expired";
              statusText = "Certificado expirado";
            } else if (daysRemaining <= 30) {
              certStatus = "expiring_soon";
              statusText = "Expirando em breve";
            } else {
              certStatus = "valid";
              statusText = "Certificado válido";
            }

            issuer = mainCert.issuerO || mainCert.issuerCN || "Desconhecido";

            if (mainCert.notBefore) {
              const start = new Date(mainCert.notBefore).getTime();
              const end = new Date(mainCert.notAfter).getTime();
              totalValidityDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
              if (totalValidityDays && totalValidityDays > 0) {
                percentRemaining = Math.round(
                  (daysRemaining / totalValidityDays) * 100
                );
              }
            }
          }

          if (endpoint?.details) {
            const details: any = endpoint.details;
            if (details.protocols) {
              protocols = details.protocols
                .filter((p: any) => p.status === "supported")
                .map((p: any) => p.name);
            }
            if (details.vulnerabilities) {
              const vulns: any = details.vulnerabilities;
              Object.entries(vulns).forEach(([key, val]: any) => {
                if (val && val.vulnerable) {
                  vulnerabilities.push(key);
                }
              });
            }
          }
        }
      } else if (status === "ERROR") {
        certStatus = "error";
        statusText = "Erro na análise";
      }

      const result: CertificateResult = {
        domain,
        grade,
        status: certStatus,
        statusText,
        icon: certStatus === "valid" ? "check-circle" : "alert-circle",
        statusClass: "",
        validity:
          validityDays !== undefined
            ? validityDays < 0
              ? "Expirado"
              : validityDays === 0
                ? "Expira hoje"
                : validityDays === 1
                  ? "1 dia"
                  : `${validityDays} dias`
            : "Verificando...",
        validityDays,
        expiryDate,
        issuer,
        totalValidityDays,
        percentRemaining,
        protocols,
        vulnerabilities,
        checkedAt: new Date().toISOString(),
        cached: false,
      };

      // Salva no backend
      try {
        await fetch("/api/certs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain,
            grade,
            status: certStatus,
            validityDays,
            expiryDate,
            issuer,
            totalValidityDays,
            percentRemaining,
            protocols,
            vulnerabilities,
            rawResponse: JSON.stringify(data),
          }),
        });
      } catch {
        // ignore
      }

      return result;
    } catch (err: any) {
      return {
        domain,
        grade: "N/A",
        status: "error",
        statusText: "Erro na verificação",
        icon: "alert-circle",
        statusClass: "",
        validity: err.message || "Falha desconhecida",
        protocols: [],
        vulnerabilities: [],
        checkedAt: new Date().toISOString(),
        cached: false,
        error: err.message,
      };
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (domains.length === 0) return;

    setIsLoading(true);
    setError(null);
    setActiveDomain(null);

    // 1. CARREGA CACHE DO BANCO para todos os domínios
    const cachedResults: CertificateResult[] = [];
    const domainsToCheck: string[] = [];

    for (const domain of domains) {
      try {
        const res = await fetch(`/api/certs?domain=${encodeURIComponent(domain)}`);
        if (res.ok) {
          const data: any = await res.json();
          const check = data.check;
          if (check && isCacheValid(check)) {
            cachedResults.push({
              domain: check.domain,
              grade: check.grade,
              status: check.status,
              statusText:
                check.status === "valid"
                  ? "Certificado válido (cache)"
                  : check.status === "expired"
                    ? "Certificado expirado (cache)"
                    : check.status === "expiring_soon"
                      ? "Expirando em breve (cache)"
                      : check.status === "error"
                        ? "Erro na análise (cache)"
                        : "Aguardando análise",
              icon: check.status === "valid" ? "check-circle" : "alert-circle",
              statusClass: "",
              validity:
                check.validityDays !== undefined
                  ? check.validityDays < 0
                    ? "Expirado"
                    : check.validityDays === 0
                      ? "Expira hoje"
                      : check.validityDays === 1
                        ? "1 dia"
                        : `${check.validityDays} dias`
                  : "Verificando...",
              validityDays: check.validityDays,
              expiryDate: check.expiryDate,
              issuer: check.issuer,
              totalValidityDays: check.totalValidityDays,
              percentRemaining: check.percentRemaining,
              protocols: check.protocols ? JSON.parse(check.protocols) : [],
              vulnerabilities: check.vulnerabilities
                ? JSON.parse(check.vulnerabilities)
                : [],
              checkedAt: check.checkedAt,
              nextCheckAt: check.nextCheckAt,
              cached: true,
            });
            continue;
          }
        }
      } catch {
        // ignore
      }
      domainsToCheck.push(domain);
    }

    // Define resultados iniciais: cache + pendentes para os que precisam verificar
    const pendingPlaceholders = domainsToCheck.map((d) => makePendingResult(d));
    setResults([...cachedResults, ...pendingPlaceholders]);

    // 2. VERIFICA EM BACKGROUND apenas os domínios que precisam
    const batchSize = 3;
    const queue = [...domainsToCheck];
    const active = new Set<string>();

    const processQueue = async () => {
      while (queue.length > 0 || active.size > 0) {
        while (queue.length > 0 && active.size < batchSize) {
          const domain = queue.shift()!;
          active.add(domain);
          setActiveDomain(domain);

          try {
            const result = await analyzeDomain(domain);
            setResults((prev) => {
              const exists = prev.find((r) => r.domain === domain);
              if (exists) {
                return prev.map((r) => (r.domain === domain ? result : r));
              }
              return [...prev, result];
            });
          } catch {
            // erro já tratado dentro de analyzeDomain
          } finally {
            active.delete(domain);
          }

          await new Promise((r) => setTimeout(r, 2000));
        }

        if (queue.length === 0 && active.size > 0) {
          await new Promise((r) => setTimeout(r, 1000));
        } else if (queue.length === 0 && active.size === 0) {
          break;
        }
      }

      setIsLoading(false);
      setActiveDomain(null);
    };

    processQueue();
  }, [domains, analyzeDomain]);

  // Dispara a verificação inicial ao carregar a página
  useEffect(() => {
    if (domains.length > 0 && results.length === 0 && !isLoading) {
      runAnalysis();
    }
  }, [domains, results.length, isLoading, runAnalysis]);

  const refresh = useCallback(() => {
    // Força nova verificação ignorando cache
    setResults([]);
    runAnalysis();
  }, [runAnalysis]);

  return {
    results,
    domains,
    setDomains,
    isLoading,
    error,
    activeDomain,
    refresh,
    loadDomains,
  };
}
