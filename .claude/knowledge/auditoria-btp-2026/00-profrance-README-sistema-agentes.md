# Sistema de Agentes ProFrance — Índice e Base

> **Auditoria feita em:** 21/07/2026
> **Escopo confirmado pela usuária:** roda em **Claude Projects / Claude.ai** (agentes = instruções + skills). Foco em **BTP + auto-entrepreneur**. Imigração fica **fora** do escopo ativo (só candidato bloqueado). Pontos marcados "verificar fonte oficial" foram pesquisados agora e preenchidos.

## Aviso honesto sobre esta auditoria

Não existe nenhum projeto de código chamado **"ProFrance"** no conhecimento deste Project. Não há repositório, `repository paths`, `branch names`, `routes`, `commit hashes`, `protected files`, `deployment rules`, schema de banco, `table names`, `field names` nem `storage keys` em lugar nenhum — nem nos arquivos, nem no histórico de conversas.

O que existe de real:
- **10 PDFs** sobre auto-entrepreneur (ACRE, declaração de imposto 2026, seguro saúde de autônomo, abertura de negócio, auxílios financeiros).
- **Histórico de conversas** sobre: migração Gmail→Supabase, guia fiscal para imigrantes brasileiros, abertura de SAS de manutenção de elevadores, domiciliação de endereço, A1 détachement Portugal/França, captação carte BTP, propostas de venda BTP/auto-entrepreneur.

Por isso, os documentos abaixo **não inventam** o que não existe. Onde não há fonte, está escrito `UNKNOWN` com a lista do que precisa ser fornecido.

## Legenda de classificação

Cada afirmação relevante é marcada com uma destas etiquetas:

- **CONFIRMED** — confirmado por fonte no Project ou fonte oficial recente pesquisada nesta auditoria.
- **USER-DEFINED RULE** — regra/decisão/preferência definida pela usuária.
- **CODE-VERIFICATION REQUIRED** — depende de código/sistema que não está visível aqui.
- **OFFICIAL-SOURCE VERIFICATION REQUIRED** — regra francesa que precisa ser confirmada em fonte oficial antes de virar operacional.
- **POSSIBLY OUTDATED** — pode estar desatualizado.
- **CONFLICTING** — há informações divergentes entre fontes (não resolvidas de propósito).
- **INFERRED** — deduzido do contexto, não afirmado diretamente.
- **UNKNOWN** — sem informação no Project.

## Regras que guiaram a escrita

- Não inventar informação faltante.
- Não resolver conflitos silenciosamente (ficam marcados `CONFLICTING`).
- Não apresentar regra francesa antiga como atual.
- Separar **regra legal** de **prática operacional**.
- Separar **regra nacional** de **procedimento específico de préfecture** (não há nada de préfecture aqui).
- Separar **regra do projeto** de **recomendação geral**.
- Separar **agentes** (papéis especializados, responsabilidade isolada) de **skills** (procedimentos reutilizáveis, workflows repetidos).
- Identificadores técnicos, paths e termos de código em **inglês**.
- Termos administrativos franceses preservados em **francês**.
- Documentos escritos em **português**.

## Lista de documentos

| # | Arquivo | Estado |
|---|---------|--------|
| 01 | profrance-project-rules.md | Populado (regras reais da usuária) |
| 02 | profrance-current-state.md | Populado |
| 03 | profrance-architecture.md | **Bloqueado** — sem sistema visível |
| 04 | profrance-protected-areas.md | **Bloqueado** — sem código visível |
| 05 | profrance-business-rules.md | Populado |
| 06 | profrance-recurring-tasks.md | Populado |
| 07 | profrance-immigration-knowledge.md | **Bloqueado** — fora de escopo, sem base |
| 08 | profrance-accounting-knowledge.md | Populado (fiscal auto-entrepreneur) |
| 09 | profrance-administrative-knowledge.md | Populado (BTP + criação de empresa) |
| 10 | profrance-decisions-log.md | Populado |
| 11 | profrance-conflicts.md | Populado |
| 12 | profrance-open-questions.md | Populado |
| 13 | profrance-agent-candidates.md | Populado (papéis) |
| 14 | profrance-skill-candidates.md | Populado (workflows) |

## Do audit ao sistema de agentes (visão geral)

Agentes prontos para construir **hoje** (têm base real):
1. **Agent: Auto-Entrepreneur Fiscal** — base forte (PDFs + guia fiscal).
2. **Agent: BTP Compliance** — base média-forte, com verificação oficial já feita nos pontos-chave.
3. **Agent: Criação & Administração de Empresa** — base média.
4. **Agent: Propostas & Captação** (obedece às regras de negócio, não é conhecimento de domínio).

Agentes **bloqueados** até a usuária fornecer base:
- **Agent: Imigração** (ANEF, OFII, préfecture, titre de séjour, changement de statut, autorisation de travail, naturalisation) — nada disso existe no Project.
- **Agent: Sistema/Dev** (Supabase/Vercel) — só existe "uso Supabase+Vercel" e um pipeline de migração; sem schema, sem código.

Detalhe completo em `13-profrance-agent-candidates.md`.
