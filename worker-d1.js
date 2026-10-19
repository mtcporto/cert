/**
 * Cloudflare Worker - API para CertMonitor com D1
 * Endpoints:
 *   GET /domains - listar domínios
 *   POST /domains - salvar domínios
 *   GET /certs - histórico de verificações
 *   POST /certs - salvar verificação
 *   GET /certs?domain=X - último check de um domínio
 *   GET /alerts - avisos urgentes
 *   GET /analyze?host=X - proxy SSL Labs
 */

function parseRawDetails(rawResponse) {
  if (!rawResponse) return { protocols: [], vulnerabilities: [] };
  try {
    const data = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
    const details = data?.endpoints?.[0]?.details;
    const protocols = [];
    const vulnerabilities = [];

    if (Array.isArray(details?.protocols)) {
      for (const p of details.protocols) {
        const label = [p.name, p.version].filter(Boolean).join(' ');
        if (label && !protocols.includes(label)) protocols.push(label);
      }
    }

    if (details) {
      const vulnFlags = {
        heartbleed: 'Heartbleed',
        poodle: 'POODLE (SSLv3)',
        poodleTls: 'POODLE (TLS)',
        freak: 'FREAK',
        logjam: 'Logjam',
        drownVulnerable: 'DROWN',
        ticketbleed: 'Ticketbleed',
        bleichenbacher: 'ROBOT / Bleichenbacher',
      };
      for (const [k, label] of Object.entries(vulnFlags)) {
        const val = details[k];
        if (val === true || (typeof val === 'number' && val > 1)) {
          vulnerabilities.push(label);
        }
      }
      if (details.vulnBeast === true) vulnerabilities.push('BEAST');
    }

    return { protocols, vulnerabilities };
  } catch {
    return { protocols: [], vulnerabilities: [] };
  }
}

function normalizeCheckRow(row) {
  if (!row) return null;
  const parsed = parseRawDetails(row.raw_response);
  return {
    domain: row.domain,
    grade: row.grade,
    status: row.status,
    validityDays: row.validity_days,
    validity_days: row.validity_days,
    expiryDate: row.expiry_date,
    expiry_date: row.expiry_date,
    issuer: row.issuer,
    totalValidityDays: row.total_validity_days,
    total_validity_days: row.total_validity_days,
    percentRemaining: row.percent_remaining,
    percent_remaining: row.percent_remaining,
    nextCheckAt: row.next_check_at,
    next_check_at: row.next_check_at,
    checkedAt: row.checked_at,
    checked_at: row.checked_at,
    rawResponse: row.raw_response,
    raw_response: row.raw_response,
    protocols: parsed.protocols,
    vulnerabilities: parsed.vulnerabilities,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ============================================================
    // DOMÍNIOS
    // ============================================================
    if (path === '/domains' && method === 'GET') {
      try {
        const { results } = await env.cert_ssl_db_d1.prepare(
          "SELECT domain, is_active, created_at, updated_at FROM domains WHERE is_active = 1 ORDER BY created_at DESC"
        ).all();
        return Response.json({ domains: results.map(r => ({
          domain: r.domain,
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })) }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (path === '/domains' && method === 'POST') {
      try {
        const { domains } = await request.json();
        if (!Array.isArray(domains)) {
          return Response.json({ error: 'Expected array' }, { status: 400, headers: corsHeaders });
        }
        await env.cert_ssl_db_d1.prepare("DELETE FROM domains").run();
        const uniqueDomains = [...new Set(domains.map(d => String(d).trim().toLowerCase()).filter(Boolean))];
        for (const d of uniqueDomains) {
          await env.cert_ssl_db_d1.prepare(
            "INSERT INTO domains (domain, is_active) VALUES (?, 1)"
          ).bind(d).run();
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
      const domain = url.searchParams.get('domain');
      try {
        if (domain) {
          const { results } = await env.cert_ssl_db_d1.prepare(
            `SELECT domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, next_check_at, checked_at, raw_response
             FROM certificate_checks
             WHERE domain = ?
             ORDER BY checked_at DESC
             LIMIT 1`
          ).bind(domain).all();
          if (results.length === 0) return Response.json({ check: null }, { headers: corsHeaders });
          return Response.json({ check: normalizeCheckRow(results[0]) }, { headers: corsHeaders });
        }

        const { results } = await env.cert_ssl_db_d1.prepare(
          `SELECT domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, next_check_at, checked_at, raw_response
           FROM certificate_checks
           ORDER BY checked_at DESC
           LIMIT 100`
        ).all();
        return Response.json({ checks: results.map(normalizeCheckRow) }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (path === '/certs' && method === 'POST') {
      try {
        const body = await request.json();
        const {
          domain, grade, status, validityDays, expiryDate, issuer,
          totalValidityDays, percentRemaining, rawResponse
        } = body;
        if (!domain) return Response.json({ error: 'domain required' }, { status: 400, headers: corsHeaders });

        // Calcular next_check_at (não cachear por 24h se ainda estiver pending)
        let daysToAdd = 7;
        if (status === 'expired' || status === 'pending') daysToAdd = 0;
        else if (status === 'error' || status === 'timeout') daysToAdd = 1;
        else if (validityDays !== null && validityDays !== undefined) {
          if (validityDays <= 30) daysToAdd = 1;
          else if (validityDays <= 90) daysToAdd = 3;
          else daysToAdd = 7;
        }
        const nextCheckAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

        await env.cert_ssl_db_d1.prepare(
          `INSERT INTO certificate_checks
           (domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, next_check_at, raw_response)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          domain, grade ?? null, status, validityDays ?? null, expiryDate ?? null,
          issuer ?? null, totalValidityDays ?? null, percentRemaining ?? null, nextCheckAt,
          rawResponse ?? null
        ).run();

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
        const { results } = await env.cert_ssl_db_d1.prepare(
          `SELECT c.domain, c.grade, c.status, c.validity_days
           FROM certificate_checks c
           INNER JOIN (
             SELECT domain, MAX(checked_at) AS max_checked
             FROM certificate_checks
             GROUP BY domain
           ) latest ON c.domain = latest.domain AND c.checked_at = latest.max_checked`
        ).all();

        const alerts = [];
        for (const row of results) {
          if (row.status === 'expired' || (row.validity_days !== null && row.validity_days < 0)) {
            alerts.push({
              id: `expired-${row.domain}`,
              domain: row.domain,
              type: 'error',
              message: 'Certificado SSL expirado! Renovação imediata necessária.',
            });
          } else if (row.status === 'expiring_soon' || (row.validity_days !== null && row.validity_days <= 30)) {
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
    // PROXY SSL LABS
    // ============================================================
    if (path === '/analyze' && method === 'GET') {
      const host = url.searchParams.get('host');
      const startNew = url.searchParams.get('startNew') || 'off';
      if (!host) return Response.json({ error: 'host required' }, { status: 400, headers: corsHeaders });

      try {
        const queryParams = new URLSearchParams({
          host,
          all: 'on',
        });
        if (startNew === 'on') {
          queryParams.set('startNew', 'on');
        } else {
          queryParams.set('fromCache', 'on');
          queryParams.set('maxAge', '24');
        }
        const apiUrl = `https://api.ssllabs.com/api/v3/analyze?${queryParams.toString()}`;
        const res = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
        const body = await res.text();
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

