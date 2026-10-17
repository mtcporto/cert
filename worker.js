/**
 * Cloudflare Worker - Proxy CORS para API SSL Labs
 * 
 * Este worker faz o proxy das requisições para https://api.ssllabs.com/api/v3/analyze
 * evitando problemas de CORS no frontend.
 * 
 * Endpoints:
 *   GET /analyze?host=example.com&startNew=off&all=on
 *   GET /cert?host=example.com  (detalhes do certificado - placeholder)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const host = url.searchParams.get('host');

    // Cabeçalhos CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Tratamento de preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Endpoint principal de análise SSL Labs
    if (path === '/analyze' && host) {
      const startNew = url.searchParams.get('startNew') || 'off';
      const all = url.searchParams.get('all') || 'on';
      const fromCache = url.searchParams.get('fromCache') || 'on';

      const apiUrl = `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(host)}&startNew=${encodeURIComponent(startNew)}&all=${encodeURIComponent(all)}&fromCache=${encodeURIComponent(fromCache)}`;

      try {
        const apiResponse = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CertMonitor/1.0',
          },
          cf: {
            // Cache da resposta da SSL Labs por 1 hora
            cacheTtl: 3600,
            cacheEverything: false,
          },
        });

        const body = await apiResponse.text();

        return new Response(body, {
          status: apiResponse.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message || 'Erro interno do worker' }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Endpoint de detalhes do certificado (para uso futuro)
    if (path === '/cert' && host) {
      return new Response(
        JSON.stringify({
          host,
          message: 'Endpoint de detalhes do certificado em implementação',
          status: 'not_implemented',
        }),
        {
          status: 501,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Página de informações do worker
    if (path === '/' || path === '/info') {
      return new Response(
        JSON.stringify({
          name: 'CertMonitor SSL Labs Proxy',
          version: '1.0.0',
          endpoints: [
            { path: '/analyze?host=example.com', description: 'Analisar certificado SSL via SSL Labs' },
            { path: '/cert?host=example.com', description: 'Detalhes do certificado (em breve)' },
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint não encontrado. Use /analyze?host=example.com' }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  },
};
