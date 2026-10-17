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

          // Extrair protocolos e vulnerabilidades dos endpoints
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
        error: err.message,
      };
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (domains.length === 0) return;

    setIsLoading(true);
    setError(null);
    setActiveDomain(null);

    // CRIA PLACEHOLDERS IMEDIATOS para todos os domínios
    const initialPlaceholders = domains.map((d) => makePendingResult(d));
    setResults(initialPlaceholders);

    const batchSize = 3;
    const queue = [...domains];
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

  const refresh = useCallback(() => {
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
