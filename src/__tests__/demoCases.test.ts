import { describe, it, expect } from "vitest";
import { DEMO_CASES } from "../data/demoCases";
import {
  classifyCertificateStatus,
  parseSslLabsDetails,
  resolveWorstGrade,
} from "../lib/utils";

describe("Public SSL/TLS Demo Cases Suite", () => {
  it("should contain all 5 required educational reference scenarios", () => {
    expect(DEMO_CASES.length).toBeGreaterThanOrEqual(5);

    const categories = DEMO_CASES.map((c) => c.category);
    expect(categories).toContain("reference");
    expect(categories).toContain("expired");
    expect(categories).toContain("untrusted");
    expect(categories).toContain("mismatch");
    expect(categories).toContain("legacy");
  });

  it("should classify cloudflare.com as valid A+ modern reference", () => {
    const modernCase = DEMO_CASES.find((c) => c.id === "modern-reference")!;
    expect(modernCase).toBeDefined();

    const parsedRaw = JSON.parse(modernCase.result.rawResponse!);
    const worstGrade = resolveWorstGrade(
      parsedRaw.endpoints.map((e: any) => e.grade)
    );
    expect(worstGrade).toBe("A+");

    const statusObj = classifyCertificateStatus({
      rawStatus: parsedRaw.status,
      grade: worstGrade,
      validityDays: modernCase.result.validityDays,
      vulnerabilities: [],
    });
    expect(statusObj.status).toBe("valid");

    const details = parseSslLabsDetails(
      modernCase.result.rawResponse,
      modernCase.result.domain
    );
    expect(details.protocols).toContain("TLS 1.3");
    expect(details.vulnerabilities.length).toBe(0);
    expect(details.hsts?.status).toBe("present");
    expect(details.certDetails).toBeDefined();
    expect(details.certDetails?.keyAlg).toBe("EC");
  });

  it("should classify expired.badssl.com as expired", () => {
    const expiredCase = DEMO_CASES.find((c) => c.id === "expired-cert")!;
    expect(expiredCase).toBeDefined();

    const parsedRaw = JSON.parse(expiredCase.result.rawResponse!);
    const worstGrade = resolveWorstGrade(
      parsedRaw.endpoints.map((e: any) => e.grade)
    );

    const statusObj = classifyCertificateStatus({
      rawStatus: parsedRaw.status,
      grade: worstGrade,
      validityDays: expiredCase.result.validityDays,
      vulnerabilities: [],
    });
    expect(statusObj.status).toBe("expired");

    const details = parseSslLabsDetails(
      expiredCase.result.rawResponse,
      expiredCase.result.domain
    );
    expect(details.certDetails?.issuerSubject).toContain("Let's Encrypt");
  });

  it("should classify self-signed.badssl.com as insecure (Untrusted Grade T)", () => {
    const untrustedCase = DEMO_CASES.find((c) => c.id === "self-signed")!;
    expect(untrustedCase).toBeDefined();

    const parsedRaw = JSON.parse(untrustedCase.result.rawResponse!);
    const worstGrade = resolveWorstGrade(
      parsedRaw.endpoints.map((e: any) => e.grade)
    );
    expect(worstGrade).toBe("T");

    const statusObj = classifyCertificateStatus({
      rawStatus: parsedRaw.status,
      grade: worstGrade,
      validityDays: untrustedCase.result.validityDays,
      vulnerabilities: [],
    });
    expect(statusObj.status).toBe("insecure");
  });

  it("should classify wrong.host.badssl.com as insecure (Mismatch Grade M)", () => {
    const mismatchCase = DEMO_CASES.find((c) => c.id === "wrong-host")!;
    expect(mismatchCase).toBeDefined();

    const parsedRaw = JSON.parse(mismatchCase.result.rawResponse!);
    const worstGrade = resolveWorstGrade(
      parsedRaw.endpoints.map((e: any) => e.grade)
    );
    expect(worstGrade).toBe("M");

    const statusObj = classifyCertificateStatus({
      rawStatus: parsedRaw.status,
      grade: worstGrade,
      validityDays: mismatchCase.result.validityDays,
      vulnerabilities: [],
    });
    expect(statusObj.status).toBe("insecure");
  });

  it("should parse all demo snapshots without runtime errors", () => {
    for (const demo of DEMO_CASES) {
      expect(demo.result.rawResponse).toBeTruthy();
      const parsed = parseSslLabsDetails(
        demo.result.rawResponse,
        demo.result.domain
      );
      expect(parsed.certDetails).toBeDefined();
      expect(parsed.protocols.length).toBeGreaterThan(0);
      expect(Array.isArray(parsed.vulnerabilities)).toBe(true);
    }
  });
});
