export type SslGrade =
  | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "E" | "F" | "M" | "T" | "N/A"
  | "⏳";

export type CertificateStatus =
  | "valid"
  | "expired"
  | "expiring_soon"
  | "insecure"
  | "error"
  | "pending"
  | "timeout";

export interface SecurityCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
  category: "vulnerability" | "feature";
}

export interface CertChainItem {
  subject: string;
  issuer: string;
  notBefore?: string;
  notAfter?: string;
  keyAlg?: string;
  keySize?: number;
  sigAlg?: string;
}

export interface CertDetailedInfo {
  subject?: string;
  commonNames?: string[];
  altNames?: string[];
  notBefore?: string;
  notAfter?: string;
  keyAlg?: string;
  keySize?: number;
  sigAlg?: string;
  issuerSubject?: string;
  sct?: boolean;
  chainCount?: number;
  chain?: CertChainItem[];
}

export interface EndpointSummary {
  ipAddress: string;
  serverName?: string;
  grade?: string;
  statusMessage?: string;
  durationMs?: number;
}

export interface CipherSuiteItem {
  name: string;
  cipherStrength?: number;
  kxType?: string;
  forwardSecrecy?: boolean;
}

export interface HstsInfo {
  status?: string;
  maxAge?: number;
  includeSubdomains?: boolean;
  preload?: boolean;
}

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
  securityChecks?: SecurityCheckItem[];
  certDetails?: CertDetailedInfo;
  endpoints?: EndpointSummary[];
  cipherSuites?: CipherSuiteItem[];
  serverSignature?: string;
  alpnProtocols?: string;
  hsts?: HstsInfo;
  checkedAt: string;
  nextCheckAt?: string;
  cached?: boolean;
  error?: string;
  rawResponse?: string;
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

