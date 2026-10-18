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
        for (const d of domains) {
          await env.cert_ssl_db_d1.prepare(
            "INSERT INTO domains (domain, is_active) VALUES (?, 1)"
          ).bind(d).run();
        }
        return Response.json({ domains }, { headers: corsHeaders });
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
          return Response.json({ check: results[0] }, { headers: corsHeaders });
        }

        const { results } = await env.cert_ssl_db_d1.prepare(
          `SELECT domain, grade, status, validity_days, expiry_date, issuer, total_validity_days, percent_remaining, next_check_at, checked_at
           FROM certificate_checks
           ORDER BY checked_at DESC
           LIMIT 100`
        ).all();
        return Response.json({ checks: results }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (path === '/certs' && method === 'POST') {
      try {
        const body = await request.json();
        const {
          domain, grade, status, validityDays, expiryDate, issuer,
          totalValidityDays, percentRemaining, protocols, vulnerabilities, rawResponse
        } = body;
        if (!domain) return Response.json({ error: 'domain required' }, { status: 400, headers: corsHeaders });

        // Calcular next_check_at
        let daysToAdd = 7;
        if (status === 'expired') daysToAdd = 0;
        else if (status === 'error') daysToAdd = 1;
        else if (status === 'pending' || status === 'timeout') daysToAdd = 1;
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
      return Response.json({ alerts: [] }, { headers: corsHeaders });
    }

    // ============================================================
    // PROXY SSL LABS
    // ============================================================
    if (path === '/analyze' && method === 'GET') {
      const host = url.searchParams.get('host');
      if (!host) return Response.json({ error: 'host required' }, { status: 400, headers: corsHeaders });

      try {
        const apiUrl = `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(host)}&startNew=off&all=on`;
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
