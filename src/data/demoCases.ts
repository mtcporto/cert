import { CertificateResult } from "@/types";
import { formatDaysRemaining } from "@/lib/utils";

export interface DemoCase {
  id: string;
  title: string;
  category: "reference" | "expired" | "untrusted" | "mismatch" | "legacy";
  description: string;
  technicalDetails: string;
  result: CertificateResult;
}

function makeDemoResult(params: {
  domain: string;
  grade: CertificateResult["grade"];
  status: CertificateResult["status"];
  statusText: string;
  validityDays: number;
  issuer: string;
  totalValidityDays: number;
  rawResponse: string;
}): CertificateResult {
  return {
    domain: params.domain,
    grade: params.grade,
    status: params.status,
    statusText: params.statusText,
    icon: params.status === "valid" ? "check-circle" : "alert-circle",
    statusClass: "",
    validity: formatDaysRemaining(params.validityDays),
    validityDays: params.validityDays,
    expiryDate: new Date(Date.now() + params.validityDays * 24 * 60 * 60 * 1000).toISOString(),
    issuer: params.issuer,
    totalValidityDays: params.totalValidityDays,
    percentRemaining: Math.max(0, Math.min(100, Math.round((params.validityDays / params.totalValidityDays) * 100))),
    checkedAt: new Date().toISOString(),
    rawResponse: params.rawResponse,
  };
}

export const DEMO_CASES: DemoCase[] = [
  {
    id: "modern-reference",
    title: "Referência Moderna (A+ / TLS 1.3)",
    category: "reference",
    description: "Configuração de excelência com suporte aos protocolos mais recentes, cifras seguras e HSTS configurado com preloading.",
    technicalDetails: "Utiliza TLS 1.3 e TLS 1.2 exclusivamente, curva moderna ECDSA e RSA 2048+, HSTS max-age superior a 6 meses com includeSubDomains e preloading ativo.",
    result: makeDemoResult({
      domain: "cloudflare.com",
      grade: "A+",
      status: "valid",
      statusText: "Certificado válido",
      validityDays: 85,
      issuer: "Cloudflare, Inc.",
      totalValidityDays: 90,
      rawResponse: JSON.stringify({
        host: "cloudflare.com",
        status: "READY",
        certs: [
          {
            subject: "CN=cloudflare.com, O=Cloudflare\\, Inc., L=San Francisco, ST=California, C=US",
            commonNames: ["cloudflare.com"],
            altNames: ["cloudflare.com", "*.cloudflare.com"],
            issuerSubject: "CN=Cloudflare Inc ECC CA-3, O=Cloudflare\\, Inc., C=US",
            sigAlg: "SHA256withECDSA",
            keyAlg: "EC",
            keySize: 256,
            notBefore: Date.now() - 5 * 24 * 60 * 60 * 1000,
            notAfter: Date.now() + 85 * 24 * 60 * 60 * 1000,
          },
        ],
        endpoints: [
          {
            ipAddress: "104.16.132.229",
            grade: "A+",
            hasWarnings: false,
            isExceptional: true,
            details: {
              protocols: [
                { name: "TLS", version: "1.3" },
                { name: "TLS", version: "1.2" },
              ],
              suites: [
                {
                  protocol: 772,
                  list: [
                    { id: 4865, name: "TLS_AES_128_GCM_SHA256", cipherStrength: 128 },
                    { id: 4867, name: "TLS_CHACHA20_POLY1305_SHA256", cipherStrength: 256 },
                    { id: 4866, name: "TLS_AES_256_GCM_SHA384", cipherStrength: 256 },
                  ],
                },
              ],
              serverSignature: "cloudflare",
              hstsPolicy: {
                status: "present",
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
              },
              vulnBeast: false,
              poodle: false,
              poodleTls: 1,
              heartbleed: false,
              heartbeat: false,
              openSslCcs: 1,
              openSSLLuckyMinus20: 1,
              ticketbleed: 1,
              bleichenbacher: 1,
              zombiePoodle: 1,
              goldenDoodle: 1,
              zeroLengthPaddingOracle: 1,
              sleepingPoodle: 1,
            },
          },
        ],
      }),
    }),
  },
  {
    id: "expired-cert",
    title: "Certificado Expirado",
    category: "expired",
    description: "Certificado cujo período de validade terminou. Provoca bloqueio imediato nos navegadores modernos e perda de tráfego de usuários.",
    technicalDetails: "Validade do certificado expirou há mais de 30 dias. Qualquer cliente HTTP/HTTPS rejeita a conexão com alerta NET::ERR_CERT_DATE_INVALID.",
    result: makeDemoResult({
      domain: "expired.badssl.com",
      grade: "T",
      status: "expired",
      statusText: "Certificado expirado",
      validityDays: -38,
      issuer: "Let's Encrypt",
      totalValidityDays: 90,
      rawResponse: JSON.stringify({
        host: "expired.badssl.com",
        status: "READY",
        certs: [
          {
            subject: "CN=expired.badssl.com",
            commonNames: ["expired.badssl.com"],
            issuerSubject: "CN=R3, O=Let's Encrypt, C=US",
            sigAlg: "SHA256withRSA",
            keyAlg: "RSA",
            keySize: 2048,
            notBefore: Date.now() - 128 * 24 * 60 * 60 * 1000,
            notAfter: Date.now() - 38 * 24 * 60 * 60 * 1000,
          },
        ],
        endpoints: [
          {
            ipAddress: "104.154.89.105",
            grade: "T",
            hasWarnings: true,
            isExceptional: false,
            details: {
              protocols: [
                { name: "TLS", version: "1.2" },
                { name: "TLS", version: "1.3" },
              ],
              suites: [
                {
                  protocol: 771,
                  list: [
                    { id: 49199, name: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256", cipherStrength: 128 },
                  ],
                },
              ],
              serverSignature: "nginx/1.22.1",
              vulnBeast: false,
              poodle: false,
              heartbleed: false,
            },
          },
        ],
      }),
    }),
  },
  {
    id: "self-signed",
    title: "Certificado Autoassinado (Não Confiável)",
    category: "untrusted",
    description: "Certificado assinado por sua própria chave privada e não por uma Autoridade Certificadora (CA) reconhecida globalmente.",
    technicalDetails: "Recebe Nota T (Untrusted) na Qualys SSL Labs. Dispara aviso de segurança grave nos clientes (SEC_ERROR_UNKNOWN_ISSUER).",
    result: makeDemoResult({
      domain: "self-signed.badssl.com",
      grade: "T",
      status: "insecure",
      statusText: "Não confiável (Autoassinado)",
      validityDays: 140,
      issuer: "BadSSL Self-Signed CA",
      totalValidityDays: 365,
      rawResponse: JSON.stringify({
        host: "self-signed.badssl.com",
        status: "READY",
        certs: [
          {
            subject: "CN=self-signed.badssl.com, O=BadSSL, L=San Francisco, ST=California, C=US",
            commonNames: ["self-signed.badssl.com"],
            issuerSubject: "CN=self-signed.badssl.com, O=BadSSL, L=San Francisco, ST=California, C=US",
            sigAlg: "SHA256withRSA",
            keyAlg: "RSA",
            keySize: 2048,
            notBefore: Date.now() - 225 * 24 * 60 * 60 * 1000,
            notAfter: Date.now() + 140 * 24 * 60 * 60 * 1000,
          },
        ],
        endpoints: [
          {
            ipAddress: "104.154.89.105",
            grade: "T",
            hasWarnings: true,
            isExceptional: false,
            details: {
              protocols: [
                { name: "TLS", version: "1.2" },
              ],
              suites: [
                {
                  protocol: 771,
                  list: [
                    { id: 49199, name: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256", cipherStrength: 128 },
                  ],
                },
              ],
              serverSignature: "nginx/1.22.1",
              vulnBeast: false,
              poodle: false,
              heartbleed: false,
            },
          },
        ],
      }),
    }),
  },
  {
    id: "wrong-host",
    title: "Incompatibilidade de Host (CN Mismatch)",
    category: "mismatch",
    description: "O certificado apresentado é criptograficamente válido, porém foi emitido para outro domínio (ausência de SAN correspondente).",
    technicalDetails: "Recebe Nota M na Qualys SSL Labs. O navegador impede a navegação para proteger o usuário de ataques Man-in-the-Middle (SSL_ERROR_BAD_CERT_DOMAIN).",
    result: makeDemoResult({
      domain: "wrong.host.badssl.com",
      grade: "M",
      status: "insecure",
      statusText: "Nome incorreto (Mismatch)",
      validityDays: 120,
      issuer: "DigiCert Global Root CA",
      totalValidityDays: 365,
      rawResponse: JSON.stringify({
        host: "wrong.host.badssl.com",
        status: "READY",
        certs: [
          {
            subject: "CN=*.badssl.com, O=Lucas Garron, L=San Francisco, ST=California, C=US",
            commonNames: ["*.badssl.com"],
            altNames: ["*.badssl.com", "badssl.com"],
            issuerSubject: "CN=DigiCert Global Root CA, OU=www.digicert.com, O=DigiCert Inc, C=US",
            sigAlg: "SHA256withRSA",
            keyAlg: "RSA",
            keySize: 2048,
            notBefore: Date.now() - 245 * 24 * 60 * 60 * 1000,
            notAfter: Date.now() + 120 * 24 * 60 * 60 * 1000,
          },
        ],
        endpoints: [
          {
            ipAddress: "104.154.89.105",
            grade: "M",
            hasWarnings: true,
            isExceptional: false,
            details: {
              protocols: [
                { name: "TLS", version: "1.2" },
              ],
              suites: [
                {
                  protocol: 771,
                  list: [
                    { id: 49199, name: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256", cipherStrength: 128 },
                  ],
                },
              ],
              serverSignature: "nginx/1.22.1",
              vulnBeast: false,
              poodle: false,
              heartbleed: false,
            },
          },
        ],
      }),
    }),
  },
  {
    id: "legacy-tls10",
    title: "Protocolo Obsoleto (TLS 1.0 Ativo)",
    category: "legacy",
    description: "Servidor ainda aceita conexões legadas com TLS 1.0 ou TLS 1.1, protocolos descontinuados pelo IETF e proibidos pelo padrão PCI-DSS.",
    technicalDetails: "Limita a nota na SSL Labs a no máximo B. Requer desativação de TLS 1.0 e 1.1 na configuração do servidor web para atingir conformidade moderna.",
    result: makeDemoResult({
      domain: "tls-v1-0.badssl.com",
      grade: "B",
      status: "insecure",
      statusText: "Protocolo inseguro / obsoleto",
      validityDays: 160,
      issuer: "Let's Encrypt",
      totalValidityDays: 90,
      rawResponse: JSON.stringify({
        host: "tls-v1-0.badssl.com",
        status: "READY",
        certs: [
          {
            subject: "CN=tls-v1-0.badssl.com",
            commonNames: ["tls-v1-0.badssl.com"],
            issuerSubject: "CN=R3, O=Let's Encrypt, C=US",
            sigAlg: "SHA256withRSA",
            keyAlg: "RSA",
            keySize: 2048,
            notBefore: Date.now() - 20 * 24 * 60 * 60 * 1000,
            notAfter: Date.now() + 70 * 24 * 60 * 60 * 1000,
          },
        ],
        endpoints: [
          {
            ipAddress: "104.154.89.105",
            grade: "B",
            hasWarnings: true,
            isExceptional: false,
            details: {
              protocols: [
                { name: "TLS", version: "1.0" },
                { name: "TLS", version: "1.1" },
                { name: "TLS", version: "1.2" },
              ],
              suites: [
                {
                  protocol: 769, // TLS 1.0
                  list: [
                    { id: 47, name: "TLS_RSA_WITH_AES_128_CBC_SHA", cipherStrength: 128 },
                  ],
                },
              ],
              serverSignature: "nginx/1.22.1",
              vulnBeast: true, // Informativo
              poodle: false,
              heartbleed: false,
            },
          },
        ],
      }),
    }),
  },
];
