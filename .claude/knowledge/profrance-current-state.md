# ProFrance — Estado Atual (current-state)

> Classificação entre colchetes em cada item. Nada inventado.

---

## 1. O que existe de fato neste Project

### Arquivos de conhecimento presentes `[CONFIRMED]`

Textos:
- `00_CORE_Fernanda.txt` — identidade, escopo, princípios, fluxo.
- `Fernanda_Glossario_FR_PT.txt` — glossário administrativo FR → PT.
- `Fernanda_Checklists_Procedimentos.txt` — 9 procedimentos + cronologia de chegada.
- `Fernanda_Modelos_Cartas.txt` — 4 modelos de carta + formato de tradução.
- `central-viva-novas-secoes-VII-a-XVI.json` — sistema de conteúdo Central Viva (moderação de grupos, alertas de golpe, orientações, prazos).

PDFs oficiais / de referência:
- `Guide_Reglementation_Sejour_Travail.pdf`
- `Le_Guide_des_Etrangers_Style_Juridique.pdf`
- `Modeledecontratengagement16072024.pdf` (Contrat d'engagement aux principes de la République)
- `formulaire_de_demande_AES.pdf`
- `fichea4collaborateuretrangerdejafrversionmicom.pdf`
- `plaquette_info_employeur_souhaitant_recruter_etranger_1.pdf`
- `Fiche_synthe_se_Evolution_des_tarifs_MARS_2026.pdf`
- Vários guias ANEF de titre de séjour (renouvellement, membre de famille UE, conjoint/parent/ascendant de Français, mineurs, étudiant, carte de résident 10 ans).
- `FAQ.pdf`, `FAQ_1.pdf`, `Changement_Etat_civil.pdf`, `Changement_situation_familiale.pdf`.
- `Captura_de_Tela_20260523_a_s_22_37_34.png` (imagem, conteúdo não auditado em texto).

### Sistema Central Viva `[CONFIRMED]`

Arquivo `central-viva-novas-secoes-VII-a-XVI.json` contém seções em algarismos romanos:
- VII — Advertências (1ª, 2ª, 3ª infração, comunicados, assédio).
- VIII — Alertas de golpe (falso admin, aluguel falso, e outros).
- IX — Mensagens difíceis.
- XIII — Apresentação de serviços (venda).
- XV — Dicas (cópia digital, récépissé, tradutor juramentado, France Services).
- XVI — Alertas de prazos (calendário administrativo).
- Estrutura de cada card: `id`, `tag`, `title`, `lead`, `tom`, `cor`, `selo`, `heading`, `image`, `links`, `variations` (cada uma com `id`, `name`, `text`). `[CONFIRMED]`

Observação: o nome do arquivo indica seções **VII a XVI**. As seções **I a VI não estão neste Project.** `[INFERRED]` / falta → `[UNKNOWN]`

---

## 2. Marca ProFrance / SaaS — estado NÃO verificável aqui

Os itens abaixo aparecem em memória de conversas, **não** no conhecimento deste Project. Ficam registrados como pendências, não como fatos.

- Brandbook (HTML + PDF), paleta de cores, tipografia Libre Franklin. `[UNKNOWN neste Project]`
- SaaS "já construído e deployado na Vercel". `[CODE-VERIFICATION REQUIRED]`
- Nome de negócio "ProFrance" com possível conflito com associação francesa existente; verificação INPI classe 35 pendente. `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`
- Alternativas de nome exploradas: "En Règle", "Amparo" (descartado). `[UNKNOWN neste Project]`
- Plano de infra: domínio OVH `.fr`, Google Workspace Business Starter, subdomínios `marca.fr`, `app.marca.fr`, `news.marca.fr`, Brevo para e-mail marketing. `[UNKNOWN neste Project]`

Ver `profrance-architecture.md` e `profrance-open-questions.md`.

---

## 3. Trabalho concluído (completed) — do que é verificável

- Base de persona Fernanda escrita e estruturada. `[CONFIRMED]`
- Glossário FR-PT completo (seções A a H). `[CONFIRMED]`
- Checklists de 9 procedimentos + cronologia + dicas operacionais. `[CONFIRMED]`
- 4 modelos de carta prontos. `[CONFIRMED]`
- Central Viva seções VII–XVI em JSON validável. `[CONFIRMED]`

## 4. Trabalho pendente (pending) — do que é verificável ou levantável

- Central Viva seções I–VI: ausentes deste Project. `[UNKNOWN]`
- Decisão de nome do negócio (bottleneck citado em memória). `[UNKNOWN neste Project]`
- Verificação de marca INPI classe 35. `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`
- Definição de arquitetura de subdomínios e compra de domínio (bloqueada pelo nome). `[UNKNOWN neste Project]`
- Extração de "voz-bruna.md" a partir de transcrição de vídeo. `[UNKNOWN neste Project]`
- Biblioteca de posts com troca de tom (Cursor: HTML, Tailwind, vanilla JS, `data/posts.json`); decisão pendente: organizar por categoria ou por grupo. `[UNKNOWN neste Project]` / `[CONFLICTING pendente]`

## 5. Riscos ativos

- **Informação regulatória desatualizada.** Vários PDFs têm base 2022–2023 (GISTI 2022; plaquette employeur "actualisé le 11 mai 2023"). Regras de séjour/travail mudam com frequência. `[POSSIBLY OUTDATED]` / `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`
- **Confusão entre "conhecimento do Project" e "memória de conversas".** Tratar memória como fato levaria a inventar arquitetura inexistente. `[INFERRED]`
