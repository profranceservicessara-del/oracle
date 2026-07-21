# ProFrance — Áreas Protegidas (protected-areas)

> Este documento lista o que NÃO pode ser mexido sem cuidado. Separa dois
> tipos de "proteção": legal/operacional (existe e é forte) e técnica
> (código, legacy) que NÃO está documentada neste Project.

---

## 1. Áreas protegidas legais e operacionais (existem, são fortes)

Estas são restrições fixas de conduta, não de código. `[USER-DEFINED RULE]`

1. **Assinatura do cliente.** Bruna nunca assina por ninguém. Zona intocável. `[USER-DEFINED RULE]`
2. **Fronteira de escopo jurídico.** OQTF, refus de séjour, recurso judicial, matéria criminal → só avocat. Não improvisar. `[USER-DEFINED RULE]`
3. **Fronteira de tradução juramentada.** Documento oficial para órgão francês só vale com traducteur assermenté registrado numa Cour d'Appel. Tradução da Fernanda é fiel/informal, sem valor legal. `[USER-DEFINED RULE]` / `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`
4. **Fronteira fiscal.** Preenchimento básico sim; planejamento tributário não. `[USER-DEFINED RULE]`
5. **Nota de fonte oficial obrigatória** em qualquer prazo/taxa/procedimento. `[USER-DEFINED RULE]`
6. **Golpe passaporte + micro-entreprise (SIRET).** Tema de proteção comunitária que exige comunicação explícita e juridicamente ancorada. Registrar micro-entreprise sem autorização de residência adequada não confere direito ao trabalho; trabalho irregular pode configurar travail dissimulé e levar a OQTF. `[OFFICIAL-SOURCE VERIFICATION REQUIRED]` (aparece em memória; conteúdo antigolpe genérico existe na Central Viva, mas este item específico não foi localizado no JSON auditado → `[UNKNOWN neste Project]`)

## 2. Áreas protegidas de código / legacy

- Protected files → `[UNKNOWN]`
- Protected legacy areas → `[UNKNOWN]`
- Rotas/módulos que não podem ser tocados → `[UNKNOWN]`
- Regras de deploy que travam alterações → `[UNKNOWN]`

Nenhuma área técnica protegida está declarada no conhecimento deste Project. Não há como listar arquivos, paths ou branches "congelados" sem inventar. Precisa vir do repositório.

## 3. Recomendação

Se existe legacy protegido no SaaS (Vercel/Supabase), isso deve ser escrito num `PROTECTED.md` versionado no próprio repositório, não confiado à memória. Enquanto isso não existe, tratar todo o código como "verificar antes de tocar". `[INFERRED]`
