# ProFrance — Agent Candidates

**Agentes = papéis especializados com responsabilidade isolada.** Aqui estão os candidatos derivados do que existe de real no Project. Cada um traz: responsabilidade, base de conhecimento que já tem, o que falta, e estado (pronto / parcial / bloqueado).

Regra de segurança geral: nenhum agente deve responder sobre regra francesa marcada `CONFLICTING` ou `OFFICIAL-SOURCE VERIFICATION REQUIRED` sem checar fonte oficial na hora.

---

## PRONTOS PARA CONSTRUIR

### Agent 1 — Auto-Entrepreneur Fiscal
- **Responsabilidade:** regime micro/BNC, URSSAF trimestral, 2042-C-PRO, VFL, ACRE, auxílios (prime d'activité, APL, RSA), transição para SASU.
- **Base:** doc 08 (forte, PDFs + guia fiscal + verificações).
- **Isolamento:** só fiscal/social do próprio empreendedor. Não fala de trabalhador BTP nem de sistema.
- **Falta:** confirmar valores anuais (auxílios) e resolver conflitos de faturação.
- **Estado:** **PRONTO** (com verificação oficial embutida nos pontos datados).

### Agent 2 — BTP Compliance
- **Responsabilidade:** carte BTP, DPAE, CIBTP, détachement, A1, SIPSI, conformidade documental de trabalhador em canteiro.
- **Base:** doc 09 (média-forte, com carte BTP / SIPSI / A1 verificados nesta auditoria).
- **Isolamento:** conformidade de trabalhador/empresa BTP. Não fala de fiscal do auto-entrepreneur individual (isso é o Agent 1).
- **Falta:** passo a passo real de DPAE e CIBTP (doc 12, q.10); validade détaché/intérim; resolver custo da carte.
- **Estado:** **PARCIAL** (opera com ressalva de verificação nos pontos marcados).

### Agent 3 — Criação & Administração de Empresa
- **Responsabilidade:** abertura de micro via INPI Guichet unique, conta URSSAF, domiciliation, devis conforme, onboarding de cliente, alertas de fraude.
- **Base:** doc 09 (seções de criação e domiciliation) + doc 05.
- **Isolamento:** setup e administração. Faz handoff para o Agent 1 (fiscal contínuo) e Agent 2 (se cliente tem trabalhadores).
- **Falta:** lista completa e datada de menções obrigatórias no devis.
- **Estado:** **PRONTO** (com ressalva).

### Agent 4 — Propostas & Captação
- **Responsabilidade:** gerar propostas (email + WhatsApp), sequência de follow-up, segmentação, aplicar a regra "email abre, WhatsApp fecha".
- **Base:** doc 05 (regras de negócio) + doc 01 (estilo).
- **Isolamento:** comercial. **Obedece** às regras de negócio e de credibilidade; não inventa regra legal, pede ao Agent 1/2 quando precisa de base.
- **Regra crítica:** nunca vender com informação legal errada (ex: obrigação de emitir fatura em 2026).
- **Estado:** **PRONTO**.

### Agent 5 — Conteúdo & Design (estilo pessoal)
- **Responsabilidade:** transformar conteúdo em HTML/PDF no estilo Zine Místico Cartoon; peças institucionais navy; cartas `lettre`.
- **Base:** doc 01 + skills pessoais já existentes (`zine-mistico-cartoon`, `cinematic-cartoon`, `lettre`, etc.).
- **Isolamento:** produção visual. Não decide conteúdo de domínio, recebe pronto.
- **Estado:** **PRONTO** (já apoiado por skills).

---

## BLOQUEADOS (não construir até ter base)

### Agent 6 — Sistema / Dev (Supabase + Vercel)
- **Responsabilidade pretendida:** manter o sistema de gestão, banco, deploy, pipeline de dados.
- **Base:** quase nada. Só a decisão de pipeline (doc 03) e a menção da stack.
- **Falta:** tudo do doc 12, q.1 a q.8 (repo, schema, rotas, deploy, campos, volume).
- **Estado:** **BLOQUEADO**. Construir agora = alucinar arquitetura.

### Agent 7 — Imigração (ANEF/OFII/préfecture/titre de séjour/naturalisation)
- **Responsabilidade pretendida:** procedimentos de imigração.
- **Base:** **nenhuma** no Project. E a usuária confirmou que **não é prioridade agora**.
- **Falta:** toda a base (doc 07, doc 12 q.17).
- **Estado:** **BLOQUEADO** e fora de escopo. Risco alto se ativado sem base.

---

## Mapa de handoffs entre agentes prontos

- Prospect chega → **Agent 4** (proposta) → fecha.
- Cliente novo sem empresa → **Agent 3** (abre micro) → **Agent 1** (fiscal contínuo).
- Cliente com trabalhadores em canteiro → **Agent 2** (carte BTP, SIPSI, A1).
- Qualquer deliverable visual → **Agent 5**.
- Auto-entrepreneur BTP que cresce e contrata → volta ao **Agent 4** para plano Chantier (lógica do doc 05).

## Nota sobre granularidade

Se preferir menos agentes no começo, dá pra fundir 1+3 num só "Auto-Entrepreneur & Setup" e manter 2 (BTP) separado, porque BTP é o domínio com mais risco de compliance e merece isolamento. Recomendo manter **Agent 2 sempre isolado**.
