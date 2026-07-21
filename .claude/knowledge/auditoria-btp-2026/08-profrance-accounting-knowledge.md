# ProFrance — Accounting & Fiscal Knowledge

Conhecimento fiscal do regime **auto-entrepreneur / micro-entreprise**, base do **Agent: Auto-Entrepreneur Fiscal**. Fonte: PDFs do Project + guia fiscal + verificações oficiais desta auditoria.

Separação importante:
- **Regra legal** (o que a lei diz) vs **prática operacional** (como se faz no dia a dia).
- Regras francesas que mudam com frequência recebem etiqueta de verificação.

## Regime e status

- Usuária opera em **profession libérale non réglementée, BNC**. — `CONFIRMED`
- Abatimento forfaitário da CAF para BNC: **34%** (resta 66% como rendimento contável). Vente de marchandises BIC: 71%. Prestation de services BIC: 50%. — `CONFIRMED` / `OFFICIAL-SOURCE VERIFICATION REQUIRED` (percentuais podem mudar por lei de finanças)

## Declarações (calendário e canais)

- **URSSAF trimestral:** declarar o CA dos 3 meses anteriores, no espaço pessoal `autoentrepreneur.urssaf.fr` ou app. — `CONFIRMED`
- **Imposto anual:** declaração via formulário **2042-C-PRO**. — `CONFIRMED`
- Mesmo com contribuição URSSAF paga, o impôt sur le revenu pode dar **zero** dependendo do foyer. — `CONFIRMED` (explicado no guia)
- **Versement libératoire (VFL):** opção de pagar o IR junto com as cotisations; nem sempre compensa, depende do caso. — `CONFIRMED`
- Não-residente declara os rendimentos de auto-entrepreneur nas **mesmas cases** que residente (ponto do PDF do tuto). — `CONFIRMED` / `POSSIBLY OUTDATED` (verificar por ano)

## ACRE (isenção de início de atividade)

- ACRE = auxílio de criação/aquisição de empresa, isenção parcial de cotisations no começo. — `CONFIRMED`
- **Prazo de pedido: 60 dias** a partir da data de início de atividade (desde 01/01/2026). Antes de 2023 era 45 dias; entre 2023 e 2025 não havia prazo fixo. Fora do prazo, rejeição automática. — `CONFIRMED` (fonte no Project, guia 2026)
- Formulário **Cerfa n° 13584*02** (versão 2026), enviado à URSSAF pela messagerie do espaço pessoal. — `CONFIRMED`
- URSSAF responde em **30 dias**; silêncio além disso = aceito. — `CONFIRMED`
- Não pode ter beneficiado de ACRE nos **3 anos** anteriores. Fechar e reabrir a micro para tentar de novo não é considerado criação real (risco de recusa; art. R131-3 / R5141-3 do Code de la sécurité sociale). — `CONFIRMED`
- Elegibilidade por critério (pelo menos um): demandeur d'emploi indemnisé ou não (inscrito 6 dos últimos 18 meses), RSA/ASS, menos de 26 anos (ou menos de 30 com handicap/sem ARE), criação em QPV ou ZFRR/ZFRR+, CAPE, PrePare, etc. Cada critério tem documento comprobatório próprio. — `CONFIRMED`
- Para QPV/ZFRR conta o **endereço de domiciliation da micro-entreprise**, não o pessoal. — `CONFIRMED`
- Mudança de endereço não afeta ACRE, desde que seja **modification** e não fechar+reabrir. — `CONFIRMED`
- Recusa injusta: contestar na **Commission de Recours Amiable (CRA)** da URSSAF. — `CONFIRMED`

## Faturação eletrônica (reforma 2026/2027) — VERIFICADO NESTA AUDITORIA

Fonte: múltiplas fontes francesas recentes (2026), incluindo remissão a `entreprendre.service-public.fr` e `impots.gouv.fr`.

- **1º setembro 2026:** todo auto-entrepreneur, mesmo em franchise en base de TVA, deve poder **RECEBER** faturas eletrônicas via plataforma agréée. — `CONFIRMED`
- **1º setembro 2027:** obrigação de **EMITIR** faturas eletrônicas B2B + **e-reporting** para micro-entreprises. PDF por email deixa de ser conforme em B2B. — `CONFIRMED`
- Formatos estruturados aceitos: **Factur-X, UBL, CII** (norma EN 16931). — `CONFIRMED`
- Franchise en base de TVA **não** isenta da reforma (micro é "assujetti non redevable"). — `CONFIRMED`
- Novas **menções obrigatórias** (SIREN do cliente, endereço de entrega se diferente, categoria da operação, opção pagamento da TVA): há **CONFLITO de data** entre fontes (1º julho 2027 vs 1º setembro 2027). — `CONFLICTING` (ver doc 11)
- **Multa:** há **CONFLITO** de valor entre fontes: 50 €/fatura (teto 15.000 €/ano) vs 500 a 1000 €/fatura. — `CONFLICTING` (ver doc 11)
- Plataformas agréées: lista oficial publicada em `impots.gouv.fr` (137 plataformas immatriculées em julho/2026, segundo uma fonte). — `CONFIRMED` / `POSSIBLY OUTDATED` (número muda)
- Menção de franchise a usar na fatura: "TVA non applicable, art. 293 B du CGI". — `CONFIRMED` (uma fonte cita variação "293 B du CGI et 223-21 du CIBS"; verificar redação exata em fonte oficial). `OFFICIAL-SOURCE VERIFICATION REQUIRED`

## Auxílios e benefícios (regra social, verificar por ano)

Do guia fiscal. Todos `OFFICIAL-SOURCE VERIFICATION REQUIRED` porque valores/tetos mudam a cada ano:

- **Prime d'activité:** complemento da CAF. Base forfaitaire 2026 citada: **638,28 €/mês**, ajustada por bonificação e recursos do foyer. Condições: residir >9 meses/ano na França, +18 anos, atividade com rendimento, ressources abaixo do teto, e para estrangeiro não-UE titre de séjour válido há +5 anos. Declaração trimestral na CAF. — `CONFIRMED` (valor) / `POSSIBLY OUTDATED`
- **APL:** auto-entrepreneur tem direito nas mesmas condições que qualquer locataire; cálculo sobre rendimentos dos últimos 12 meses, atualizado trimestralmente. — `CONFIRMED` / `POSSIBLY OUTDATED`
- Também citados: RSA, CPF/formation professionnelle. — `CONFIRMED` (menção)
- Organizações mencionadas: FNAE, UAE, BGE, ADIE. — `CONFIRMED` (menção)

## Transição para SASU (roadmap discutido)

- Discutida transição faseada micro-entreprise → **SASU**, com vantagens e desvantagens. — `CONFIRMED`
- Sem decisão de executar nem cronograma travado. — `CONFIRMED`
- Detalhes de vantagem/desvantagem específicos: `UNKNOWN` (não capturados como dado estruturado nesta base)

## Custos legítimos a não confundir com fraude

- Existe cobrança postal legítima como a **CFE** (Cotisation Foncière des Entreprises). Regra operacional aprovada: **"me manda foto antes de decidir"**, em vez de mandar descartar toda fatura postal. — `CONFIRMED` (correção de segurança aprovada)
