# 🛠️ Configuração das Ferramentas

Este projeto utiliza **GitHub, Vercel, Cloudflare e Turso**. Abaixo o passo a passo para configurar cada uma.

---

## 1. GitHub (Código-fonte)

O código está hospedado em: https://github.com/mtcporto/cert

Cada push na branch `main` dispara o deploy automático na Vercel.

```bash
git add .
git commit -m "sua mensagem"
git push origin main
```

---

## 2. Vercel (Hospedagem Frontend)

URL da aplicação: https://cert-next-6rsq7c6hj-marco-portos-projects.vercel.app

### Variáveis de ambiente necessárias na Vercel:

Vá em **Vercel Dashboard → Projeto → Settings → Environment Variables** e adicione:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `TURSO_DATABASE_URL` | `libsql://cert-ssl-db-seu-org.turso.io` | URL do banco Turso |
| `TURSO_AUTH_TOKEN` | `seu_token_aqui` | Token de acesso do Turso |

Após adicionar, faça um redeploy:
```bash
vercel --prod
```

---

## 3. Turso (Banco de Dados Edge / SQLite)

O Turso armazena os domínios e o histórico de verificações de certificados.

### Passos de configuração:

```bash
# 1. Login no Turso
turso auth login

# 2. Criar o banco de dados
turso db create cert-ssl-db

# 3. Obter a URL do banco
turso db show cert-ssl-db
# Anote a URL (ex: libsql://cert-ssl-db-xxx.turso.io)

# 4. Criar token de acesso
turso db tokens create cert-ssl-db
# Anote o token gerado
```

### Adicionar ao .env.local (desenvolvimento):

```env
TURSO_DATABASE_URL=libsql://cert-ssl-db-seu-org.turso.io
TURSO_AUTH_TOKEN=seu_token_aqui
```

---

## 4. Cloudflare Worker (Proxy CORS SSL Labs)

O worker faz o proxy para a API `api.ssllabs.com` evitando problemas de CORS no frontend.

### Arquivos do worker:
- `worker.js` — código do worker
- `wrangler.toml` — configuração do Cloudflare

### Deploy do worker:

```bash
# 1. Instalar wrangler (se não tiver)
npm install -g wrangler

# 2. Login no Cloudflare
wrangler login

# 3. Fazer deploy do worker
wrangler deploy
```

Após o deploy, anote a URL gerada (ex: `https://cert-ssl-proxy.seu-subdominio.workers.dev`).

### Atualizar a API route para usar o worker:

Em `src/app/api/analyze/route.ts`, altere a `SSL_LABS_API` para apontar para o seu worker:

```typescript
const SSL_LABS_API = "https://seu-worker.workers.dev/analyze";
```

---

## 5. Domínios Monitorados

Os seguintes domínios estão configurados como padrão para monitoramento:

| # | Domínio |
|---|---------|
| 1 | vivajoaopessoa.com |
| 2 | kindredveil.com |
| 3 | imobiliariapenaareia.com.br |
| 4 | nuvemmarketing.com |
| 5 | ride4x4.com |

Você pode adicionar, remover ou editar domínios através da interface da aplicação (botão "Gerenciar Domínios").

---

## Resumo do Fluxo

```
Usuário acessa Vercel
    ↓
Next.js frontend (localhost:3000 ou Vercel)
    ↓
API Route /api/analyze (Next.js)
    ↓
Cloudflare Worker (proxy CORS)
    ↓
SSL Labs API (Qualys)
    ↓
Resultado salvo no Turso (banco)
    ↓
Exibido no dashboard
```
