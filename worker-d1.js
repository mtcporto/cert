/**
 * Cloudflare Worker - API para CertMonitor com D1
 * Endpoints:
 *   GET  /domains           - listar domínios
 *   POST /domains           - salvar domínios
 *   GET  /certs             - último check de cada domínio
 *   GET  /certs?domain=X    - último check de um domínio
 *   POST /certs             - gravação manual (somente admin: Authorization: Bearer ADMIN_TOKEN)
 *   GET  /alerts            - avisos urgentes
 *   GET  /analyze?host=X    - proxy SSL Labs (somente domínios cadastrados); grava o resultado no D1
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://cert-next-seven.vercel.app',
  'http://localhost:3000',
];
const PREVIEW_ORIGIN_RE = /^https:\/\/cert-next-[a-z0-9-]+-marco-portos-projects\.vercel\.app$/;
const HOSTNAME_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB
const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================================
// Helpers
// ============================================================

function normalizeHost(value) {
  if (typeof value !== 'string') return null;
  const host = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return HOSTNAME_RE.test(host) ? host : null;
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const extra = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowed =
    origin &&
    (DEFAULT_ALLOWED_ORIGINS.includes(origin) ||
      extra.includes(origin) ||
      PREVIEW_ORIGIN_RE.test(origin));

  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function isAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.ADMIN_TOKEN}`;
}

function bodyTooLarge(request) {
  const len = Number(request.headers.get('Content-Length') || 0);
  return len > MAX_BODY_BYTES;
}

function parseIssuerName(cert) {
  if (!cert) return null;
  if (cert.issuerO) return cert.issuerO;
  if (cert.issuerCN) return cert.issuerCN;
  const subject = cert.issuerSubject || '';
  const o = subject.match(/(?:^|,\s*)O=("?)([^,"]+)\1/);
  if (o) return o[2].trim();
  const cn = subject.match(/(?:^|,\s*)CN=("?)([^,"]+)\1/);
  if (cn) return cn[2].trim();
  return cert.issuerLabel || null;
}

function calcNextCheckAt(status, validityDays) {
  let daysToAdd = 7;
  if (status === 'expired' || status === 'pending') daysToAdd = 0;
  else if (status === 'error' || status === 'timeout') daysToAdd = 1;
  else if (validityDays !== null && validityDays !== undefined) {
    if (validityDays <= 30) daysToAdd = 1;
    else if (validityDays <= 90) daysToAdd = 3;
  }
  return new Date(Date.now() + daysToAdd * DAY_MS).toISOString();
}

/**
 * Resume uma resposta da SSL Labs no formato gravado em certificate_checks.
 * Retorna null quando a análise ainda não tem resultado aproveitável.
 */
function summarizeAnalysis(domain, data) {
  if (!data || typeof data !== 'object') return null;

  const endpoints = Array.isArray(data.endpoints) ? data.endpoints : [];
  const certs = Array.isArray(data.certs) ? data.certs : [];
  const endpoint = endpoints.find((e) => e.grade) || endpoints[0];
  const grade = endpoint?.grade || 'N/A';

  const isFinal = data.status === 'READY' || data.status === 'ERROR';
  const hasPartial = certs.length > 0 && endpoints[0]?.grade;
  if (!isFinal && !hasPartial) return null;

  const mainCert =
    certs.find((c) => c.commonNames?.includes(domain) || c.altNames?.includes(domain)) || certs[0];

  let status = 'error';
  let validityDays = null;
  let expiryDate = null;
  let totalValidityDays = null;
  let percentRemaining = null;

  if (mainCert?.notAfter) {
    validityDays = Math.floor((mainCert.notAfter - Date.now()) / DAY_MS);
    expiryDate = new Date(mainCert.notAfter).toISOString();
    status = validityDays < 0 ? 'expired' : validityDays <= 30 ? 'expiring_soon' : 'valid';

    if (mainCert.notBefore) {
      totalValidityDays = Math.floor((mainCert.notAfter - mainCert.notBefore) / DAY_MS);
      if (totalValidityDays > 0) {
        percentRemaining = Math.max(
          0,
          Math.min(100, Math.round((validityDays / totalValidityDays) * 100))
        );
      }
    }
  } else if (data.status === 'READY') {
    status = endpoint?.statusMessage === 'Ready' && grade !== 'N/A' ? 'valid' : 'error';
  }

  return {
    domain,
    grade,
    status,
    validityDays,
    expiryDate,
    issuer: parseIssuerName(mainCert),
    totalValidityDays,
    percentRemaining,
  };
}

async function saveCheck(env, summary, rawResponse) {
  const nextCheckAt = calcNextCheckAt(summary.status, summary.validityDays);
  await env.cert_ssl_db_d1
    .prepare(
      `INSERT INTO certificate_checks
       (domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, next_check_at, raw_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      summary.domain,
      summary.grade ?? null,
      summary.status,
      summary.validityDays ?? null,
      summary.expiryDate ?? null,
      summary.issuer ?? null,
      summary.totalValidityDays ?? null,
      summary.percentRemaining ?? null,
      nextCheckAt,
      rawResponse ?? null
    )
    .run();
  return nextCheckAt;
}

function normalizeCheckRow(row) {
  if (!row) return null;
  return {
    domain: row.domain,
    grade: row.grade,
    status: row.status,
    validityDays: row.validity_days,
    expiryDate: row.expiry_date,
    issuer: row.issuer,
    totalValidityDays: row.total_validity_days,
    percentRemaining: row.percent_remaining,
    nextCheckAt: row.next_check_at,
    checkedAt: row.checked_at,
    rawResponse: row.raw_response,
  };
}

async function isRegisteredDomain(env, host) {
  const row = await env.cert_ssl_db_d1
    .prepare('SELECT 1 AS ok FROM domains WHERE domain = ? AND is_active = 1 LIMIT 1')
    .bind(host)
    .first();
  return Boolean(row);
}

// ============================================================
// Worker
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const corsHeaders = buildCorsHeaders(request, env);

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (method === 'POST' && bodyTooLarge(request)) {
      return Response.json({ error: 'Payload too large' }, { status: 413, headers: corsHeaders });
    }

    // ============================================================
    // DOMÍNIOS
    // ============================================================
    if (path === '/domains' && method === 'GET') {
      try {
        const { results } = await env.cert_ssl_db_d1
          .prepare(
            'SELECT domain, is_active, created_at, updated_at FROM domains WHERE is_active = 1 ORDER BY created_at DESC'
          )
          .all();
        return Response.json(
          {
            domains: results.map((r) => ({
              domain: r.domain,
              isActive: Boolean(r.is_active),
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            })),
          },
          { headers: corsHeaders }
        );
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (path === '/domains' && method === 'POST') {
      // TODO(PR2): exigir autenticação de admin e gravar de forma atômica (batch)
      try {
        const { domains } = await request.json();
        if (!Array.isArray(domains)) {
          return Response.json({ error: 'Expected array' }, { status: 400, headers: corsHeaders });
        }
        const uniqueDomains = [...new Set(domains.map(normalizeHost).filter(Boolean))];
        if (uniqueDomains.length > 200) {
          return Response.json({ error: 'Too many domains' }, { status: 400, headers: corsHeaders });
        }
        await env.cert_ssl_db_d1.prepare('DELETE FROM domains').run();
        for (const d of uniqueDomains) {
          await env.cert_ssl_db_d1
            .prepare('INSERT INTO domains (domain, is_active) VALUES (?, 1)')
            .bind(d)
            .run();
        }
        return Response.json({ domains: uniqueDomains }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ============================================================
    // CERTS
    // ============================================================
    if (path === '/certs' && method === 'GET') {
      try {
        const rawDomain = url.searchParams.get('domain');
        if (rawDomain !== null) {
          const domain = normalizeHost(rawDomain);
          if (!domain) {
            return Response.json({ error: 'Invalid domain' }, { status: 400, headers: corsHeaders });
          }
          const row = await env.cert_ssl_db_d1
            .prepare(
              `SELECT domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, next_check_at, checked_at, raw_response
               FROM certificate_checks
               WHERE domain = ?
               ORDER BY checked_at DESC, id DESC
               LIMIT 1`
            )
            .bind(domain)
            .first();
          return Response.json({ check: normalizeCheckRow(row) }, { headers: corsHeaders });
        }

        const { results } = await env.cert_ssl_db_d1
          .prepare(
            `SELECT c.domain, c.grade, c.status, c.validity_days, c.expiry_date, c.issuer, c.total_validity_days, c.percent_remaining, c.next_check_at, c.checked_at
             FROM certificate_checks c
             INNER JOIN (
               SELECT domain, MAX(id) AS max_id FROM certificate_checks GROUP BY domain
             ) latest ON c.id = latest.max_id
             ORDER BY c.checked_at DESC`
          )
          .all();
        return Response.json({ checks: results.map(normalizeCheckRow) }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (path === '/certs' && method === 'POST') {
      // Gravação agora é feita pelo próprio Worker em /analyze. Este endpoint fica só para admin.
      if (!isAdmin(request, env)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      try {
        const body = await request.json();
        const domain = normalizeHost(body?.domain);
        if (!domain) {
          return Response.json({ error: 'Invalid domain' }, { status: 400, headers: corsHeaders });
        }
        const nextCheckAt = await saveCheck(
          env,
          {
            domain,
            grade: body.grade,
            status: body.status,
            validityDays: body.validityDays,
            expiryDate: body.expiryDate,
            issuer: body.issuer,
            totalValidityDays: body.totalValidityDays,
            percentRemaining: body.percentRemaining,
          },
          body.rawResponse
        );
        return Response.json({ success: true, nextCheckAt }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ============================================================
    // ALERTS
    // ============================================================
    if (path === '/alerts' && method === 'GET') {
      try {
        const { results } = await env.cert_ssl_db_d1
          .prepare(
            `SELECT c.domain, c.status, c.validity_days
             FROM certificate_checks c
             INNER JOIN (
               SELECT domain, MAX(id) AS max_id FROM certificate_checks GROUP BY domain
             ) latest ON c.id = latest.max_id`
          )
          .all();

        const alerts = [];
        for (const row of results) {
          if (row.status === 'expired' || (row.validity_days !== null && row.validity_days < 0)) {
            alerts.push({
              id: `expired-${row.domain}`,
              domain: row.domain,
              type: 'error',
              message: 'Certificado SSL expirado! Renovação imediata necessária.',
            });
          } else if (
            row.status === 'expiring_soon' ||
            (row.validity_days !== null && row.validity_days <= 30)
          ) {
            alerts.push({
              id: `expiring-${row.domain}`,
              domain: row.domain,
              type: 'warning',
              message: `Certificado expira em ${row.validity_days} dia(s).`,
            });
          } else if (row.status === 'error') {
            alerts.push({
              id: `error-${row.domain}`,
              domain: row.domain,
              type: 'error',
              message: 'Falha na validação do certificado SSL.',
            });
          }
        }
        return Response.json({ alerts }, { headers: corsHeaders });
      } catch {
        return Response.json({ alerts: [] }, { headers: corsHeaders });
      }
    }

    // ============================================================
    // PROXY SSL LABS (somente domínios cadastrados) + gravação no D1
    // ============================================================
    if (path === '/analyze' && method === 'GET') {
      const host = normalizeHost(url.searchParams.get('host'));
      if (!host) {
        return Response.json({ error: 'Invalid host' }, { status: 400, headers: corsHeaders });
      }

      try {
        if (!(await isRegisteredDomain(env, host))) {
          return Response.json(
            { error: 'Domain not registered' },
            { status: 403, headers: corsHeaders }
          );
        }

        const queryParams = new URLSearchParams({ host, all: 'on' });
        if (url.searchParams.get('startNew') === 'on') {
          queryParams.set('startNew', 'on');
        } else {
          queryParams.set('fromCache', 'on');
          queryParams.set('maxAge', '24');
        }

        const res = await fetch(`https://api.ssllabs.com/api/v3/analyze?${queryParams.toString()}`, {
          headers: { Accept: 'application/json', 'User-Agent': 'CertMonitor/1.0' },
        });
        const body = await res.text();

        if (res.ok) {
          let data = null;
          try {
            data = JSON.parse(body);
          } catch {
            data = null;
          }
          const summary = summarizeAnalysis(host, data);
          if (summary) {
            ctx.waitUntil(
              saveCheck(env, summary, body).catch((err) =>
                console.error('Failed to save check', host, err)
              )
            );
          }
        }

        return new Response(body, {
          status: res.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 502, headers: corsHeaders });
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
  },
};
