import { describe, it, expect } from "vitest";
import {
  classifyCertificateStatus,
  resolveWorstGrade,
  parseIssuerName,
  parseSslLabsDetails,
} from "../lib/utils";

describe("SSL Labs Classifier & Parser", () => {
  describe("resolveWorstGrade", () => {
    it("should return worst grade among multiple endpoints", () => {
      expect(resolveWorstGrade(["A+", "A", "B"])).toBe("B");
      expect(resolveWorstGrade(["A", "T"])).toBe("T");
      expect(resolveWorstGrade(["A+", "F", "B+"])).toBe("F");
    });

    it("should handle single or identical grades", () => {
      expect(resolveWorstGrade(["A+"])).toBe("A+");
      expect(resolveWorstGrade(["B", "B"])).toBe("B");
    });

    it("should return N/A if all endpoints are N/A or empty", () => {
      expect(resolveWorstGrade(["N/A", null, undefined])).toBe("N/A");
      expect(resolveWorstGrade([])).toBe("N/A");
    });
  });

  describe("classifyCertificateStatus", () => {
    it("classifies valid certificate with A+ and > 30 days as 'valid'", () => {
      const res = classifyCertificateStatus({
        rawStatus: "READY",
        grade: "A+",
        validityDays: 85,
        vulnerabilities: [],
      });
      expect(res.status).toBe("valid");
      expect(res.statusText).toBe("Certificado válido");
    });

    it("classifies certificate within 30 days as 'expiring_soon'", () => {
      const res = classifyCertificateStatus({
        rawStatus: "READY",
        grade: "A",
        validityDays: 15,
        vulnerabilities: [],
      });
      expect(res.status).toBe("expiring_soon");
      expect(res.statusText).toBe("Expirando em breve");
    });

    it("classifies expired certificate (< 0 days) as 'expired'", () => {
      const res = classifyCertificateStatus({
        rawStatus: "READY",
        grade: "A",
        validityDays: -3,
        vulnerabilities: [],
      });
      expect(res.status).toBe("expired");
      expect(res.statusText).toBe("Certificado expirado");
    });

    it("classifies untrusted grade T certificate as 'insecure' even with > 30 days", () => {
      const res = classifyCertificateStatus({
        rawStatus: "READY",
        grade: "T",
        validityDays: 120,
        vulnerabilities: [],
      });
      expect(res.status).toBe("insecure");
      expect(res.statusText).toContain("não confiável");
    });

    it("classifies grade F certificate as 'insecure'", () => {
      const res = classifyCertificateStatus({
        rawStatus: "READY",
        grade: "F",
        validityDays: 60,
        vulnerabilities: [],
      });
      expect(res.status).toBe("insecure");
    });

    it("classifies certificate with critical vulnerability as 'insecure'", () => {
      const res = classifyCertificateStatus({
        rawStatus: "READY",
        grade: "A",
        validityDays: 60,
        vulnerabilities: ["Heartbleed (CVE-2014-0160)"],
      });
      expect(res.status).toBe("insecure");
      expect(res.statusText).toContain("vulnerabilidade");
    });

    it("classifies pending / in-progress states as 'pending'", () => {
      expect(classifyCertificateStatus({ rawStatus: "DNS" }).status).toBe("pending");
      expect(classifyCertificateStatus({ rawStatus: "IN_PROGRESS" }).status).toBe("pending");
    });

    it("classifies error status as 'error'", () => {
      expect(classifyCertificateStatus({ rawStatus: "ERROR" }).status).toBe("error");
    });
  });

  describe("parseIssuerName", () => {
    it("extracts issuer from issuerO", () => {
      expect(parseIssuerName({ issuerO: "Google Trust Services" })).toBe("Google Trust Services");
    });

    it("extracts O= from issuerSubject string", () => {
      const cert = {
        issuerSubject: "CN=R3, O=\"Let's Encrypt\", C=US",
      };
      expect(parseIssuerName(cert)).toBe("Let's Encrypt");
    });

    it("extracts CN= when O is missing", () => {
      const cert = {
        issuerSubject: "CN=Custom Root CA, C=BR",
      };
      expect(parseIssuerName(cert)).toBe("Custom Root CA");
    });
  });

  describe("parseSslLabsDetails", () => {
    it("handles BEAST as informative without marking certificate as vulnerable", () => {
      const mockRaw = {
        endpoints: [
          {
            details: {
              protocols: [{ name: "TLS", version: "1.2" }],
              vulnBeast: true,
            },
          },
        ],
      };
      const parsed = parseSslLabsDetails(mockRaw, "example.com");
      expect(parsed.vulnerabilities).not.toContain("BEAST (CVE-2011-3389)");
      const beastCheck = parsed.securityChecks.find((c) => c.id === "vulnBeast");
      expect(beastCheck).toBeDefined();
      expect(beastCheck?.passed).toBe(true);
      expect(beastCheck?.detail).toContain("Informativo");
    });

    it("detects real critical vulnerabilities (POODLE, Heartbleed)", () => {
      const mockRaw = {
        endpoints: [
          {
            details: {
              heartbleed: true,
              poodle: true,
            },
          },
        ],
      };
      const parsed = parseSslLabsDetails(mockRaw, "vuln.com");
      expect(parsed.vulnerabilities).toContain("Heartbleed (CVE-2014-0160)");
      expect(parsed.vulnerabilities).toContain("POODLE SSLv3 (CVE-2014-3566)");
    });
  });
});
