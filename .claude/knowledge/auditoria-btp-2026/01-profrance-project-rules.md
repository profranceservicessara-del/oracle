# ProFrance — Project Rules

Regras e preferências definidas pela usuária. São instruções que os agentes devem obedecer. Separadas das recomendações gerais (que ficam nos documentos de conhecimento).

## Comunicação e idioma

- Responder em **português** por padrão. — `USER-DEFINED RULE`
- Usar francês ou inglês só quando o contexto pedir claramente. — `USER-DEFINED RULE`
- Preferência por respostas **densas e práticas**, direto ao ponto, não conversa de ida e volta. — `USER-DEFINED RULE`
- Perguntas curtas esperam respostas acionáveis. — `INFERRED` (padrão observado no histórico)
- Aceita e valoriza que Claude **conteste uma abordagem** quando há falha estrutural, desde que bem fundamentado. — `USER-DEFINED RULE`
- Aprecia **intake estruturado / perguntas de esclarecimento** antes de Claude fechar uma solução. — `USER-DEFINED RULE`

## Estilo de escrita (preferências fixas)

- **Nunca** usar travessão (—) em nenhum texto gerado. Usar vírgula, ponto ou parênteses. — `USER-DEFINED RULE`
- Evitar padrões que denunciam texto de IA: excesso de headings, listas, negrito, conectores tipo "além disso", "ademais", estrutura paralela repetida, tom editorial/corporativo. — `USER-DEFINED RULE`
- Escrever natural, humano, direto, com ritmo de frase variado. — `USER-DEFINED RULE`
- Evitar ponto e vírgula salvo necessidade real; não abusar de dois-pontos. — `USER-DEFINED RULE`

> Nota: este próprio documento de auditoria usa listas e headings por ser um artefato de referência técnica, não uma resposta em chat. Nos **outputs para cliente e nas respostas normais**, os agentes seguem o estilo natural acima.

## Estilo visual (deliverables HTML/PDF)

- Estilo padrão pessoal: **"Zine Místico Cartoon"**. Aplicar por padrão em deliverables visuais **sem precisar pedir**. — `USER-DEFINED RULE`
- Paleta pastel místico:
  - lavanda `#C8A8E9`
  - rosa `#F2C4CE`
  - azul `#B8D8EA`
  - roxo `#5B3F8E`
  - creme `#FBF6E9`
- Tipografia:
  - **Bungee Inline** — títulos principais
  - **Caveat** — subtexto poético
  - **Patrick Hand** — labels
  - **Fredoka** — corpo de texto
- Sombras estilo HQ (comic box shadow) em **dark navy**.
- **Explicitamente rejeitado:** paletas **amarelas, bege ou de tom quente**. — `USER-DEFINED RULE` (a usuária rejeitou uma primeira versão amarelada e pediu refação neste estilo)

> Observação: existe também um sistema institucional (navy `#1B2A4A`, off-white, âmbar, vermelho só para alertas de fraude) usado num deliverable de onboarding no formato carrossel 1080x1350px. Isso é `INFERRED` como estilo alternativo para peças institucionais/Instagram, não como substituto do estilo pessoal. Ver `10-profrance-decisions-log.md`.

## Skills pessoais já existentes no ambiente (relacionadas a estilo)

Estas skills aparecem no ambiente da usuária e codificam preferências dela. Não são "código ProFrance", são ativos de estilo/voz. — `CONFIRMED` (presentes na lista de skills)

- `zine-mistico-cartoon` — converte conteúdo em HTML/PDF no estilo pessoal.
- `cinematic-cartoon` — documentos HTML cinemáticos com painéis cartoon (regra de ouro: nada inclinado, sem `rotate()`).
- `estiloinstinto` — guia interativo estilo "zine místico cartoon" com arquétipos.
- `divina` — sistema de design editorial com matriz de arquétipos.
- `lettre` — cartas jurídicas formais em francês (mise en demeure, padrão "Lettre Allianz").
- `premium-saas-ui` — estilo SaaS financeiro/administrativo mobile-first.
- `marrie-siebert` — conselheira filosófica pessoal.
- `humanizer` — remove sinais de escrita de IA.
- `zara-templates-html` — biblioteca de templates de deck.
- `resumidor-de-alma`, `centraldivinagrupos`, `paradoxe-criative`, `caveman` — outros ativos pessoais.

## Objetivo de negócio declarado (contexto que orienta decisões)

- Construir renda escalável trabalhando de casa, com mínimo contato com público, foco em ativos digitais, automação e IA, ganhos em euro. — `USER-DEFINED RULE` (preferências gerais)
- **Importante:** esse objetivo de "sem contato" conflita com a realidade do setor BTP. Registrado em `11-profrance-conflicts.md`. — `CONFLICTING`

## O que NÃO é regra do projeto (para não confundir)

- Não há regra de deployment, branch, code review ou path protegido, porque não há código no Project. — `UNKNOWN`
