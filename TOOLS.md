# 🛠️ Ferramentas e Infraestrutura — CertMonitor

Guia operacional rápido para gerenciamento da infraestrutura do CertMonitor.

---

## 1. GitHub (Controle de Versão e CI/CD)

- **Repositório:** [https://github.com/mtcporto/cert](https://github.com/mtcporto/cert)
- Cada push na branch `main` executa a validação e dispara automaticamente o deploy da interface na Vercel.

```bash
git add .
git commit -m "feat/fix: descrição da alteração"
git push origin main
```

---

## 2. Vercel (Hospedagem Frontend Next.js)

- **URL de Produção:** [https://cert-next-seven.vercel.app/](https://cert-next-seven.vercel.app/)
- O frontend consome exclusivamente a API do Cloudflare Worker através da variável pública de ambiente.

### Variáveis de ambiente configuradas na Vercel:
| Variável | Valor Recomendado | Finalidade |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `https://cert-ssl-api-d1.mosaicoworkers.workers.dev` | URL base do Cloudflare Worker backend |

---

## 3. Cloudflare Worker & D1 Database

O backend e o banco de dados rodam na Cloudflare Edge.

- **Nome do Worker:** `cert-ssl-api-d1`
- **Banco D1:** `cert-ssl-db-d1` (Database ID: `0ec35312-d8df-4a65-8dbd-0226c6d0422c`)
- **Configuração:** `wrangler.toml`

### Comandos de Operação:

```bash
# 1. Login no Cloudflare (caso necessário)
npx wrangler login

# 2. Deploy do Worker e dos Cron Triggers
npx wrangler deploy

# 3. Aplicar schema D1 remotamente
npx wrangler d1 execute cert-ssl-db-d1 --remote --file=./d1-schema.sql

# 4. Configurar ou atualizar o ADMIN_TOKEN
npx wrangler secret put ADMIN_TOKEN

# 5. Consultar logs em tempo real
npx wrangler tail
```

---

## 4. Cron Triggers (Varredura Autônoma)

O worker possui um gatilho cron programado para cada 15 minutos:
- Expressão: `*/15 * * * *`
- Função: Avalia domínios cujo `next_check_at` expirou e agenda novas análises na SSL Labs respeitando cotas da API.
- Execução manual de teste:
```bash
curl -X POST https://cert-ssl-api-d1.mosaicoworkers.workers.dev/cron/run
```
