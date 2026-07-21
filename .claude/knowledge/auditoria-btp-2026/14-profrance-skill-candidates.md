# ProFrance — Skill Candidates

**Skills = procedimentos reutilizáveis e workflows repetidos.** Diferente de agente (que é papel). Uma skill é uma receita que qualquer agente pode chamar.

Alguns já existem no ambiente da usuária. Marco quais são novos candidatos e quais já estão feitos.

---

## Já existem (reaproveitar, não recriar)

- **`zine-mistico-cartoon`** — converter conteúdo em HTML/PDF no estilo pessoal. — `CONFIRMED`
- **`cinematic-cartoon`** — documentos HTML cinemáticos com painéis cartoon. — `CONFIRMED`
- **`lettre`** — cartas jurídicas formais em francês (mise en demeure). — `CONFIRMED`
- **`estiloinstinto`, `divina`, `premium-saas-ui`, `zara-templates-html`, `resumidor-de-alma`** — ativos de estilo/produto pessoais. — `CONFIRMED`
- **`humanizer`** — remover sinais de escrita de IA (encaixa direto na regra de estilo do doc 01). — `CONFIRMED`
- **`marrie-siebert`, `centraldivinagrupos`, `caveman`, `paradoxe-criative`** — pessoais, fora do escopo ProFrance. — `CONFIRMED`

---

## Novos candidatos a skill (workflows repetidos sem skill ainda)

### Skill A — Proposta comercial BTP/auto-entrepreneur
- **O que faz:** monta pacote de proposta (email longo + WhatsApp curto + follow-up 7/15 dias), com segmentação em 3 listas e o fechamento por SIRET/nº de trabalhadores.
- **Reutilizável por:** Agent 4.
- **Base:** doc 05. — `CONFIRMED`

### Skill B — Onboarding de cliente novo (auto-entrepreneur)
- **O que faz:** gera documento de onboarding (credenciais com segurança, documentos postais esperados, alertas de fraude com critério oficial, processo URSSAF), genérico o bastante para virar carrossel de Instagram.
- **Reutilizável por:** Agent 3.
- **Base:** doc 09 + doc 10. — `CONFIRMED`

### Skill C — Extração de dados não estruturados para Supabase
- **O que faz:** roda o pipeline `Takeout (.mbox)` → Python → AI API extrai JSON → bulk insert Supabase.
- **Reutilizável por:** Agent 6 (quando desbloqueado).
- **Base:** doc 03. — `CONFIRMED` (lógica pronta, faltam campos e volume)

### Skill D — Diagnóstico A1 / détachement
- **O que faz:** dado o vínculo do trabalhador (recibos verdes PT, micro FR, etc.), diz **qual país emite o A1** e aponta o risco de inspeção.
- **Reutilizável por:** Agent 2.
- **Base:** doc 09. — `CONFIRMED`

### Skill E — Checklist carte BTP
- **O que faz:** verifica se o trabalhador precisa de carte (salarié sim, independente não), lista documentos, custo, validade 5 anos, atestado provisório, prazo 72h.
- **Reutilizável por:** Agent 2.
- **Base:** doc 09. Ressalva: custo em conflito. — `CONFIRMED` / `CONFLICTING`

### Skill F — Checklist declaração fiscal (URSSAF + 2042-C-PRO + ACRE)
- **O que faz:** guia trimestral URSSAF, anual 2042-C-PRO, decisão VFL sim/não, prazo ACRE 60 dias.
- **Reutilizável por:** Agent 1.
- **Base:** doc 08. — `CONFIRMED`

### Skill G — Clonagem/construção de site
- **O que faz:** HTML + Tailwind CDN, seção por seção, publicar em Netlify/Vercel.
- **Reutilizável por:** Agent 5 / Agent 6.
- **Base:** doc 10. — `CONFIRMED`

### Skill H — Verificador de conformidade legal antes de publicar
- **O que faz:** antes de qualquer proposta/post sair, checa se há afirmação legal marcada `CONFLICTING`/`OFFICIAL-SOURCE VERIFICATION REQUIRED` e força verificação (ex: datas de faturação, multa, custo carte).
- **Reutilizável por:** todos os agentes.
- **Base:** docs 08, 09, 11. — `INFERRED` (recomendado, dado o histórico de correções de credibilidade)

---

## Regra de separação (para não misturar agente e skill)

- Se é **um papel que decide e faz handoff** → agente (doc 13).
- Se é **uma receita repetível que um papel executa** → skill (aqui).
- Exemplo: "BTP Compliance" é agente; "Checklist carte BTP" é skill que esse agente chama.
