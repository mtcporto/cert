export type SslGrade =
  | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "T" | "F" | "N/A"
  | "⏳";

export type CertificateStatus =
  | "valid"
  | "expired"
  | "expiring_soon"
  | "error"
  | "pending"
  | "timeout";

export interface CertificateResult {
  domain: string;
  grade: SslGrade;
  status: CertificateStatus;
  statusText: string;
  icon: string;
  statusClass: string;
  validity: string;
  validityDays?: number;
  expiryDate?: string;
  issuer?: string;
  totalValidityDays?: number;
  percentRemaining?: number;
  protocols?: string[];
  vulnerabilities?: string[];
  checkedAt: string;
  nextCheckAt?: string;
  cached?: boolean;
  error?: string;
}

export interface Domain {
  id?: number;
  domain: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckSummary {
  validCerts: number;
  expiringCerts: number;
  expiredCerts: number;
  errorCerts: number;
  total: number;
}

export interface SslLabsEndpoint {
  grade: string | null;
  statusMessage: string | null;
  details?: Record<string, unknown>;
}

export interface SslLabsResponse {
  status: string;
  statusMessage: string;
  endpoints: SslLabsEndpoint[];
  certs?: Array<{
    commonNames?: string[];
    altNames?: string[];
    notBefore?: number;
    notAfter?: number;
    issuerO?: string;
    issuerCN?: string;
  }>;
}
