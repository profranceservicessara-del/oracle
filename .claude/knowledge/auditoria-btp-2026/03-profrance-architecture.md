# ProFrance — Architecture

## Estado: BLOQUEADO

Não há arquitetura de sistema documentada neste Project. — `UNKNOWN`

O único conteúdo técnico existente é uma decisão de pipeline de migração de dados, que não é arquitetura de aplicação. Está registrada abaixo como o único fato técnico real.

## Único fato técnico confirmado

**Pipeline de migração de dados (uma vez, histórico antigo):** — `CONFIRMED`
```
Google Takeout (.mbox)  ->  script Python (lê e separa email por email)
  ->  AI API (Claude ou Gemini) extrai campos em JSON
  ->  bulk insert no Supabase via API
```
- Motivo da escolha: extensão de Chrome lendo email a email na mão **não escala**; batch é superior. — `CONFIRMED` (decisão)

## Stack mencionada (sem detalhes)

- Supabase — `CONFIRMED` (só a menção)
- Vercel — `CONFIRMED` (só a menção)
- Cursor — `CONFIRMED` (só a menção)
- Python — `CONFIRMED` (só a menção)
- Netlify (alternativa de publicação) — `CONFIRMED` (só a menção)

## O que falta para desbloquear este documento

Para construir uma arquitetura real, a usuária precisaria fornecer (nada disso existe hoje):
- `repository path(s)` e host (GitHub/GitLab?) — `UNKNOWN`
- `branch names` e regra de branch — `UNKNOWN`
- Schema do Supabase: `table names`, `field names`, chaves, RLS — `UNKNOWN`
- `routes` / estrutura de páginas (Vercel) — `UNKNOWN`
- `storage keys` / buckets — `UNKNOWN`
- `deployment rules` (preview, produção, variáveis de ambiente) — `UNKNOWN`
- `commit hashes` de referência — `UNKNOWN`

Enquanto isso não vier, o **Agent: Sistema/Dev** fica bloqueado (ver `13-profrance-agent-candidates.md`).
