# ProFrance — Conflitos (conflicts)

> Informações que se contradizem. NÃO resolvidas silenciosamente. Cada conflito
> fica exposto com as duas versões e a fonte, para você decidir.

---

## C1. Prazo de renovação de titre de séjour `[CONFLICTING]`

- **Versão A** (`Fernanda_Checklists_Procedimentos.txt`): agendar/renovar **2 meses antes** do vencimento.
- **Versão B** (Central Viva, seção de prazos): marcar renovação **4 meses antes**.
- Ação sugerida: reverificar em service-public.fr / Préfecture local. Não usar nenhum dos dois como definitivo. `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`

## C2. Nome público: Fernanda vs. Bruna `[CONFLICTING]`

- **Versão A** (core do Project): a persona de atendimento chama-se **Fernanda**; **Bruna** é a profissional responsável.
- **Versão B** (memória): **Bruna** é a profissional; usa o nome **Fernanda** na moderação de comunidade (5 grupos WhatsApp).
- Não está claro se "Fernanda" é a persona do assistente, o nome público de comunidade da Bruna, ou ambos. Precisa de definição da própria Bruna. `[UNKNOWN]`

## C3. Classificação fiscal BIC vs. BNC `[CONFLICTING — resolvido em memória, não no Project]`

- Aviso fiscal anterior teria sugerido **BNC**.
- Atestado URSSAF 2025 (memória) confirma **BIC / Libérale non réglementée**, e prevalece.
- Como isso só existe em memória, o conflito continua não documentado neste Project. `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`

## C4. Campos do schema Central Viva `[CONFLICTING]`

- Arquivo auditado (`central-viva-novas-secoes-VII-a-XVI.json`): campos `id, tag, title, lead, tom, cor, selo, heading, image, links, variations`.
- Memória cita campos adicionais: `grupoSelo`, `adminSelo`.
- Esses dois campos não aparecem no arquivo auditado. Ou existem em outro arquivo do sistema, ou a memória está desatualizada. `[UNKNOWN]`

## C5. Conhecimento do Project vs. memória de conversas `[CONFLICTING — estrutural]`

- Muita coisa que a tarefa pede (Supabase, Vercel repos, branches, brandbook, nomes alternativos, infra) existe **só em memória**, não nos arquivos.
- Tratar memória como conhecimento verificado do Project seria um erro. Este é o conflito de fundo que afeta architecture, protected-areas e parte do decisions-log.

## C6. Modelo declarado vs. modelo atual `[POSSIBLY OUTDATED]`

- Core diz "Claude Project (Sonnet 4.6)". O modelo em uso pode ter mudado desde maio/2026. Não é contradição de fonte, mas de tempo.

## C7. Fontes regulatórias datadas vs. realidade atual `[POSSIBLY OUTDATED]`

- Guias baseados em GISTI 2022, loi 2016, plaquette 2023.
- Memória menciona reforma migratória 2024 e circular Retailleau 2025.
- Onde o material antigo e as mudanças recentes divergirem, prevalece a fonte oficial atual. Nada do material datado deve ser apresentado como vigente sem checagem. `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`
