export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return `Expirado há ${Math.abs(days)}d`;
  if (days === 0) return "Expira hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    "A+": "bg-emerald-500 text-white dark:bg-emerald-600",
    A: "bg-emerald-500 text-white dark:bg-emerald-600",
    "A-": "bg-emerald-400 text-white dark:bg-emerald-500",
    "B+": "bg-blue-500 text-white dark:bg-blue-600",
    B: "bg-blue-500 text-white dark:bg-blue-600",
    "B-": "bg-blue-400 text-white dark:bg-blue-500",
    "C+": "bg-amber-500 text-white dark:bg-amber-600",
    C: "bg-amber-500 text-white dark:bg-amber-600",
    "C-": "bg-orange-400 text-white dark:bg-orange-500",
    T: "bg-violet-500 text-white dark:bg-violet-600",
    F: "bg-rose-500 text-white dark:bg-rose-600",
    "N/A": "bg-slate-400 text-white dark:bg-slate-600",
    "⏳": "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 animate-pulse",
  };
  return colors[grade] || colors["N/A"];
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    valid:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    expired:
      "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    expiring_soon:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    error:
      "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    pending:
      "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    timeout:
      "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };
  return colors[status] || colors.pending;
}

import type {
  CertDetailedInfo,
  CipherSuiteItem,
  EndpointSummary,
  HstsInfo,
  SecurityCheckItem,
} from "@/types";

export function parseSslLabsDetails(
  rawResponse?: string | Record<string, any> | null,
  domain?: string
): {
  protocols: string[];
  vulnerabilities: string[];
  securityChecks: SecurityCheckItem[];
  certDetails?: CertDetailedInfo;
  endpoints?: EndpointSummary[];
  cipherSuites?: CipherSuiteItem[];
  serverSignature?: string;
  alpnProtocols?: string;
  hsts?: HstsInfo;
} {
  if (!rawResponse) {
    return { protocols: [], vulnerabilities: [], securityChecks: [] };
  }
  try {
    const data =
      typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;
    const primaryEndpoint =
      data?.endpoints?.find((e: any) => e.details) || data?.endpoints?.[0];
    const details = primaryEndpoint?.details;
    const protocols: string[] = [];
    const vulnerabilities: string[] = [];
    const securityChecks: SecurityCheckItem[] = [];

    if (Array.isArray(details?.protocols)) {
      for (const p of details.protocols) {
        const label = [p.name, p.version].filter(Boolean).join(" ");
        if (label && !protocols.includes(label)) {
          protocols.push(label);
        }
      }
    }

    if (details) {
      const vulnDefinitions: Array<{
        key: string;
        label: string;
        isVuln: (val: any) => boolean;
      }> = [
        {
          key: "heartbleed",
          label: "Heartbleed (CVE-2014-0160)",
          isVuln: (v) => v === true,
        },
        {
          key: "poodle",
          label: "POODLE SSLv3 (CVE-2014-3566)",
          isVuln: (v) => v === true,
        },
        {
          key: "poodleTls",
          label: "POODLE TLS",
          isVuln: (v) => typeof v === "number" && v > 1,
        },
        {
          key: "freak",
          label: "FREAK (CVE-2015-0204)",
          isVuln: (v) => v === true,
        },
        {
          key: "logjam",
          label: "Logjam (CVE-2015-4000)",
          isVuln: (v) => v === true,
        },
        {
          key: "drownVulnerable",
          label: "DROWN (CVE-2016-0800)",
          isVuln: (v) => v === true,
        },
        {
          key: "ticketbleed",
          label: "Ticketbleed (CVE-2016-9244)",
          isVuln: (v) => typeof v === "number" && v > 1,
        },
        {
          key: "bleichenbacher",
          label: "ROBOT / Bleichenbacher",
          isVuln: (v) => typeof v === "number" && v > 1,
        },
        {
          key: "openSslCcs",
          label: "OpenSSL CCS Injection (CVE-2014-0224)",
          isVuln: (v) => typeof v === "number" && v > 1,
        },
        {
          key: "openSSLLuckyMinus20",
          label: "OpenSSL LuckyMinus20 (CVE-2016-2107)",
          isVuln: (v) => typeof v === "number" && v > 1,
        },
        {
          key: "vulnBeast",
          label: "BEAST (CVE-2011-3389)",
          isVuln: (v) => v === true,
        },
      ];

      for (const def of vulnDefinitions) {
        if (details[def.key] !== undefined) {
          const vulnerable = def.isVuln(details[def.key]);
          if (vulnerable) {
            vulnerabilities.push(def.label);
          }
          securityChecks.push({
            id: def.key,
            label: def.label,
            passed: !vulnerable,
            detail: vulnerable ? "Vulnerável" : "Protegido",
            category: "vulnerability",
          });
        }
      }

      if (details.vulnerabilities && typeof details.vulnerabilities === "object") {
        for (const [key, val] of Object.entries<any>(details.vulnerabilities)) {
          if (val?.vulnerable && !vulnerabilities.includes(key)) {
            vulnerabilities.push(key);
          }
        }
      }

      // Recursos de segurança (Features)
      if (details.forwardSecrecy !== undefined) {
        const fsSupported = Number(details.forwardSecrecy) >= 2;
        securityChecks.push({
          id: "forwardSecrecy",
          label: "Forward Secrecy (PFS)",
          passed: fsSupported,
          detail:
            Number(details.forwardSecrecy) >= 4
              ? "Suportado com todos os clientes"
              : fsSupported
                ? "Suportado com navegadores modernos"
                : "Não suportado",
          category: "feature",
        });
      }

      if (details.hstsPolicy) {
        const hstsPresent = details.hstsPolicy.status === "present";
        securityChecks.push({
          id: "hsts",
          label: "HSTS (Strict-Transport-Security)",
          passed: hstsPresent,
          detail: hstsPresent
            ? `Ativo (max-age=${details.hstsPolicy.maxAge ?? 0}s)`
            : "Não configurado",
          category: "feature",
        });
      }

      if (details.ocspStapling !== undefined) {
        securityChecks.push({
          id: "ocspStapling",
          label: "OCSP Stapling",
          passed: Boolean(details.ocspStapling),
          detail: details.ocspStapling ? "Habilitado" : "Desabilitado",
          category: "feature",
        });
      }

      if (details.supportsAlpn !== undefined || details.alpnProtocols) {
        const alpn = Boolean(details.supportsAlpn || details.alpnProtocols);
        securityChecks.push({
          id: "alpn",
          label: "ALPN / HTTP/2",
          passed: alpn,
          detail: details.alpnProtocols || (alpn ? "Suportado" : "Não suportado"),
          category: "feature",
        });
      }
    }

    // Extrair detalhes do certificado e cadeia
    let certDetails: CertDetailedInfo | undefined;
    if (Array.isArray(data?.certs) && data.certs.length > 0) {
      const mainCert =
        (domain
          ? data.certs.find(
              (c: any) =>
                c.commonNames?.includes(domain) || c.altNames?.includes(domain)
            )
          : null) || data.certs[0];

      certDetails = {
        subject: mainCert.subject,
        commonNames: mainCert.commonNames,
        altNames: mainCert.altNames,
        notBefore: mainCert.notBefore
          ? new Date(mainCert.notBefore).toISOString()
          : undefined,
        notAfter: mainCert.notAfter
          ? new Date(mainCert.notAfter).toISOString()
          : undefined,
        keyAlg: mainCert.keyAlg,
        keySize: mainCert.keySize,
        sigAlg: mainCert.sigAlg,
        issuerSubject:
          mainCert.issuerLabel || mainCert.issuerO || mainCert.issuerCN || mainCert.issuerSubject,
        sct: Boolean(mainCert.sct),
        chainCount: data.certs.length,
        chain: data.certs.map((c: any) => ({
          subject: c.commonNames?.[0] || c.subject || "Certificado",
          issuer: c.issuerLabel || c.issuerO || c.issuerCN || c.issuerSubject || "Desconhecido",
          notBefore: c.notBefore ? new Date(c.notBefore).toISOString() : undefined,
          notAfter: c.notAfter ? new Date(c.notAfter).toISOString() : undefined,
          keyAlg: c.keyAlg,
          keySize: c.keySize,
          sigAlg: c.sigAlg,
        })),
      };
    }

    // Extrair endpoints (IPs/Servidores)
    let endpoints: EndpointSummary[] | undefined;
    if (Array.isArray(data?.endpoints) && data.endpoints.length > 0) {
      endpoints = data.endpoints.map((ep: any) => ({
        ipAddress: ep.ipAddress,
        serverName: ep.serverName,
        grade: ep.grade,
        statusMessage: ep.statusMessage,
        durationMs: ep.duration,
      }));
    }

    // Extrair Cipher Suites
    const cipherSuites: CipherSuiteItem[] = [];
    const rawSuites = Array.isArray(details?.suites)
      ? details.suites.flatMap((s: any) => s.list || [])
      : details?.suites?.list || [];

    const seenCiphers = new Set<string>();
    for (const suite of rawSuites) {
      if (suite?.name && !seenCiphers.has(suite.name)) {
        seenCiphers.add(suite.name);
        cipherSuites.push({
          name: suite.name,
          cipherStrength: suite.cipherStrength,
          kxType: suite.kxType,
          forwardSecrecy:
            suite.kxType === "ECDHE" ||
            suite.kxType === "DHE" ||
            String(suite.name).includes("ECDHE") ||
            String(suite.name).includes("DHE") ||
            String(suite.name).startsWith("TLS_AES_") ||
            String(suite.name).startsWith("TLS_CHACHA20_"),
        });
      }
    }

    const hsts: HstsInfo | undefined = details?.hstsPolicy
      ? {
          status: details.hstsPolicy.status,
          maxAge: details.hstsPolicy.maxAge,
          includeSubdomains: Boolean(details.hstsPolicy.includeSubdomains),
          preload: Boolean(details.hstsPolicy.preload),
        }
      : undefined;

    return {
      protocols,
      vulnerabilities,
      securityChecks,
      certDetails,
      endpoints,
      cipherSuites: cipherSuites.length > 0 ? cipherSuites : undefined,
      serverSignature: details?.serverSignature,
      alpnProtocols: details?.alpnProtocols,
      hsts,
    };
  } catch {
    return { protocols: [], vulnerabilities: [], securityChecks: [] };
  }
}


