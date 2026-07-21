# Base de Conhecimento ProFrance

Estes catorze arquivos são a **fonte da verdade** do projeto. Vieram de uma auditoria
honesta que separa o que está confirmado do que é só memória. Cada afirmação tem uma
classificação entre colchetes. Os agentes leem daqui ANTES de agir, e respeitam as
classificações.

## Legenda das classificações (crítico)

- `[CONFIRMED]` — verificado nos arquivos do Project. Pode usar.
- `[USER-DEFINED RULE]` — regra que Bruna definiu. Respeitar sempre.
- `[OFFICIAL-SOURCE VERIFICATION REQUIRED]` — reconfirmar na fonte oficial antes de usar
  com cliente. Regra pode ter mudado.
- `[POSSIBLY OUTDATED]` — base 2022-2023. NÃO apresentar como vigente sem checar.
- `[CONFLICTING]` — há duas versões. Não usar nenhuma como definitiva até Bruna decidir.
- `[UNKNOWN neste Project]` — só existe em memória de conversas, NÃO em arquivo. Tratar
  como não verificado. Não inventar em cima disso.
- `[CODE-VERIFICATION REQUIRED]` — precisa ser lido do repositório/painel, não da memória.
- `[INFERRED]` — deduzido, não afirmado na fonte.

## Qual agente lê o quê

### Especialistas França (leem antes de qualquer orientação a cliente)
- `immigration-knowledge.md` → france-immigration-researcher. AVISO: base 2022-2023,
  muito marcado POSSIBLY OUTDATED. Reconfirmar tudo na fonte.
- `accounting-knowledge.md` → france-accounting-specialist, france-tax-compliance-specialist.
- `administrative-knowledge.md` → france-administrative-procedures-specialist.
- (SIPSI, Carte BTP: marcados UNKNOWN neste Project. france-employment-specialist busca na
  fonte, pois não há material interno.)

### Coordenação (leem para decidir e planejar)
- `project-rules.md` → system-architect, product-manager. Contém os princípios inegociáveis
  e a nota de auditoria que separa "Fernanda" (existe) de "marca/SaaS" (só memória).
- `business-rules.md` → product-manager. Modelo de serviço, limites, encaminhamento.
- `decisions-log.md` → todos. O que já foi decidido e o que foi rejeitado.
- `current-state.md` → todos. O que existe de fato vs. o que é pendência.

### Engenharia (leem antes de tocar código)
- `architecture.md` → backend, database, integration. AVISO: quase tudo UNKNOWN. Os nomes
  de tabela, branch e repo precisam ser LIDOS DO CÓDIGO, não assumidos. O único schema
  confirmado é o card JSON da Central Viva (ver o arquivo).
- `protected-areas.md` → todos os de engenharia + security. O que não tocar sem cuidado.

### Governança e pendências (leem para não inventar)
- `conflicts.md` → todos. Sete conflitos não resolvidos. Não resolver silenciosamente.
- `open-questions.md` → todos. O que ainda falta saber.
- `agent-candidates.md` → NÃO É PARA CRIAR AGENTES. É levantamento. Só consultar.
- `skill-candidates.md` → NÃO É PARA CRIAR SKILLS. É levantamento. Só consultar.
- `recurring-tasks.md` → product-manager, architect. Fluxos que se repetem.

## Consolidados (leitura principal, já organizados)
- `profrance-imigracao-completo.md` → france-immigration-researcher. É o consolidado de
  TODO o conhecimento de imigração (checklists, Central Viva seção X, glossário, PDFs).
  Ler este primeiro; os outros de imigração são fonte de detalhe.
- `central-viva-inventario-completo.md` → moderação de comunidade e produção de conteúdo.
  Inventário das 10 seções (VII-XVI), 58 painéis, 91 variações. Schema do card JSON.
  Nota: seções I-VI ainda ausentes do Project (pendência).

## Consolidados (leitura principal, já organizados)
- `profrance-immigration-knowledge.md` → france-immigration-researcher, france-employment,
  business-france. **VERIFICADO NA WEB julho/2026** (etiquetas [WEB-2026]). É a versão mais
  atual e substitui a anterior (preservada como `-v1-conversa.md`). Contém: portais corretos
  de cada demarche, taxas novas de 01/05/2026, contexto operacional da ANEF em 2026.
- `profrance-imigracao-completo.md` → france-immigration-researcher. Consolidado do
  conhecimento de imigração (checklists, Central Viva seção X, glossário, PDFs).
- `central-viva-inventario-completo.md` → moderação e conteúdo. 10 seções, 58 painéis,
  91 variações. Seções I-VI ainda ausentes (pendência).

## REGRA CRÍTICA: cada demarche tem seu portal (não mandar tudo pra ANEF)
- Séjour → ANEF `administration-etrangers-en-france.interieur.gouv.fr`
- Permis (CNH) → ANTS `permisdeconduire.ants.gouv.fr`
- Détachement → SIPSI `sipsi.travail.gouv.fr` + Carte BTP `cartebtp.fr`
- Empresa → INPI `formalites.entreprises.gouv.fr`, URSSAF, `impots.gouv.fr`
- Referência legal → `service-public.gouv.fr` (migrou de .fr), `legifrance.gouv.fr`

## Conflito C1 RESOLVIDO (prazo de renovação de titre)
O `imigracao-completo.md` resolve o conflito que estava aberto: a regra é uma JANELA de
**4 a 2 meses antes** do vencimento (base: artigo R.431-5 do CESEDA), não "2 meses" nem
"4 meses" isolados. Antes de 4 meses o pedido fecha; depois de 2 meses há multa (~180€);
depois do vencimento, irregular. AINDA ASSIM reverificar a vigência na fonte oficial antes
de usar com cliente. Atualizar o `conflicts.md` para mover C1 de aberto para resolvido.

## Regra de ouro desta base
Nenhum agente trata `[UNKNOWN neste Project]` ou `[POSSIBLY OUTDATED]` como fato. Onde a
base e a fonte oficial divergirem, a fonte oficial vence. Onde há `[CONFLICTING]`, o agente
expõe as duas versões e pede decisão, não escolhe sozinho.
