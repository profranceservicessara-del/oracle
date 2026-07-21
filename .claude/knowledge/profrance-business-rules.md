# ProFrance — Regras de Negócio (business-rules)

> Regras que governam o serviço, a relação com o cliente e a comunicação.
> Separadas de regras legais (ver immigration/administrative knowledge) e de
> regras de projeto (ver project-rules).

---

## 1. Modelo de serviço

- Bruna presta **assistência administrativa**, não contabilidade (tenue de comptabilité) nem consultoria jurídica de imigração. `[USER-DEFINED RULE]`
- Cliente final: pessoa física brasileira na França. `[CONFIRMED]`
- (Memória) Segundo segmento B2B: empresas de construção (facturation, Carte BTP, correspondência de funcionários). Não há material B2B nos arquivos deste Project. `[UNKNOWN neste Project]`

## 2. Limites de responsabilidade (contrato/website)

Devem constar em contrato e site, segundo a lógica do escopo:
- Escopo permitido: preparo de fatura com mandat de facturation, organização de documentos, controle de prazos, orientação de formulário. `[USER-DEFINED RULE]` (mandat de facturation citado em memória → `[UNKNOWN neste Project]`)
- Fora de escopo: tenue de comptabilité e consultoria jurídica de imigração. `[USER-DEFINED RULE]`

## 3. Regras de encaminhamento

- Jurídico sério (OQTF, refus, recurso, criminal) → avocat spécialisé en droit des étrangers. `[USER-DEFINED RULE]`
- Tradução juramentada → traducteur assermenté (lista das Cours d'Appel). `[USER-DEFINED RULE]`
- Sofrimento emocional do processo migratório → acolher brevemente, sem virar terapeuta; sugerir apoio adequado. `[USER-DEFINED RULE]`

## 4. Regras de comunicação com cliente

- PT-BR, claro e direto, acolhedor mas profissional. `[USER-DEFINED RULE]`
- Firmeza diante de pedido de atalho ilegal. `[USER-DEFINED RULE]`
- Termo francês traduzido na primeira aparição. `[USER-DEFINED RULE]`
- Documento francês: original + tradução, separados visualmente. `[USER-DEFINED RULE]`
- Fechar com próximo passo concreto + fonte oficial. `[USER-DEFINED RULE]`

## 5. Regras da comunidade / grupos (Central Viva)

Extraídas do JSON. `[CONFIRMED]`

- Moderação em três tempos: 1º aviso privado sem julgamento; 2º aviso público breve sem expor; 3ª infração → remoção com aviso privado curto, sem negociação. Princípio: "firmeza compassiva". `[CONFIRMED]`
- Anúncios só em dias permitidos (o JSON cita quarta, sábado e domingo como exemplo). `[CONFIRMED]` (dias são exemplo de template, ajustável por grupo → `[USER-DEFINED RULE]`)
- Assédio / abordagem privada indevida → remoção imediata, denúncia documentada, decisão definitiva. `[CONFIRMED]`
- Comunicado pós-remoção não expõe caso individual. `[CONFIRMED]`
- Alerta permanente: administração legítima nunca cobra taxa para permanecer no grupo, nunca pede dados por privado, nunca pede dinheiro para terceiro. `[CONFIRMED]`

## 6. Voz de conteúdo

- Voz "Marrie Siebert" (memória): filosófica, materna-calma, frases curtas; sem em-dash; termos franceses traduzidos na 1ª vez; linha de fecho "Confirme na fonte oficial. As regras mudam com frequência." `[USER-DEFINED RULE]` (definição detalhada só em memória → parcialmente `[UNKNOWN neste Project]`)
- Voz "Fernanda" (arquivos): PT-BR administrativo, fiel, com fecho de fonte oficial. `[CONFIRMED]`

## 7. Naming da pessoa

- No serviço administrativo: **Bruna**. Na moderação de comunidade: usa **Fernanda** como nome público. `[CONFIRMED]` (obs: a memória inverte parcialmente esses papéis, citando "Fernanda" como nome de comunidade e "Bruna" como profissional — há inconsistência entre o core deste Project e a memória. Ver `profrance-conflicts.md`.) `[CONFLICTING]`
