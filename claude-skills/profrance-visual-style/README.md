# profrance-visual-style — Claude Skill

> Skill portátil para Claude Code que aplica o sistema visual **ProFrance** (SaaS administrativo/financeiro premium) a outro projeto SaaS — **sem importar dados, lógica de negócio ou regras de banco**.

---

## O que esta skill faz

- ✅ Aplica o **visual ProFrance** (cores, tipografia, espaçamento, componentes).
- ✅ Aplica padrões **UI/UX premium** (hierarquia dashboard, status pills, mobile-first).
- ✅ Aplica **filosofia de layout** (white cards + navy + soft shadows + tabular numbers).
- ✅ Faz auditoria visual read-only do projeto alvo.
- ✅ Converte dashboard genérico em command-center premium (5 seções: Hero → Action → Today → Next 24h → Insights).
- ✅ Polimento cirúrgico de página/componente isolado.
- ✅ QA mobile (375/390/tablet/desktop).
- ✅ Safety QA final (anti-regressão).

## O que esta skill NÃO faz

- ❌ Não copia dados de negócio ProFrance (clientes, pedidos, valores, transações).
- ❌ Não copia lógica de negócio ProFrance (workflows, regras financeiras).
- ❌ Não copia schema do banco ou implementação Supabase ProFrance.
- ❌ Não modifica fetching de dados, rotas, autenticação ou API payloads do projeto alvo.
- ❌ Não adiciona dependências sem aprovação explícita.
- ❌ Não implementa dark mode (recomenda postergar).
- ❌ Não muda configuração de build/lint/test.

---

## Instalação

### Global (Claude Code de qualquer projeto)

```bash
mkdir -p ~/.claude/skills
cp -R claude-skills/profrance-visual-style ~/.claude/skills/
```

Ou via script:

```bash
./claude-skills/profrance-visual-style/install.sh global
```

A skill fica disponível em qualquer sessão Claude Code da máquina.

### Local ao projeto alvo (escopo restrito)

```bash
mkdir -p .claude/skills
cp -R /Users/bruna/projects/profrance/claude-skills/profrance-visual-style .claude/skills/
```

Ou via script:

```bash
./claude-skills/profrance-visual-style/install.sh project /path/to/target/project
```

A skill só fica disponível em sessões Claude Code dentro daquele projeto.

---

## Como usar em outro repo

1. **Instale** (global ou local — comandos acima).
2. Abra Claude Code no projeto alvo.
3. Mande um dos prompts de exemplo abaixo. A skill será detectada automaticamente pela descrição.
4. **Comece sempre por audit-only.** Revise os files propostos antes de aprovar mudanças.
5. Aplique fase-por-fase. Exija `tsc + build PASS` entre cada uma.
6. Termine com **Safety QA** antes de mergear.

### Comandos de exemplo

```bash
# Instalação global
./claude-skills/profrance-visual-style/install.sh global

# Instalação em projeto específico
./claude-skills/profrance-visual-style/install.sh project ~/projects/my-saas

# Verificar instalação global
ls ~/.claude/skills/profrance-visual-style/

# Verificar instalação local
ls .claude/skills/profrance-visual-style/
```

### Prompts de exemplo (cole no Claude Code)

**Exemplo 1 — audit only:**
```
Use the profrance-visual-style skill to audit this dashboard only.
Do not modify files. Return visual problems and a sprint plan.
```

**Exemplo 2 — single page polish:**
```
Use the profrance-visual-style skill to polish only src/app/dashboard/page.tsx.
Visual-only. Preserve all data logic, routes, and queries.
```

**Exemplo 3 — dashboard conversion:**
```
Use the profrance-visual-style skill to convert this dashboard into
the ProFrance-style hierarchy: Hero → Action required → Today → Next 24h → Insights.
No query changes.
```

**Exemplo 4 — mobile QA:**
```
Use the profrance-visual-style skill to run mobile QA at 375/390/tablet/desktop
after the visual polish. Report any horizontal overflow or clipped content.
```

**Exemplo 5 — single component:**
```
Use the profrance-visual-style skill to polish only src/components/ui/Button.tsx.
Preserve props and handlers. Visual-only.
```

**Exemplo 6 — final safety:**
```
Use the profrance-visual-style skill to run the final safety QA.
Confirm zero business logic, schema, auth, route, or API payload changes.
```

---

## Estrutura da skill

```
profrance-visual-style/
├── SKILL.md                              # Manifest principal (Claude lê a YAML frontmatter)
├── README.md                             # Este arquivo
├── install.sh                            # Instalador global ou por projeto
├── resources/
│   ├── visual-transfer-kit.md            # Design system unificado (referência completa)
│   ├── style-application-checklist.md    # Checklist operacional 13 fases
│   └── apply-to-real-system-prompt.md    # Prompts copy-ready (8 variantes)
└── templates/
    ├── audit-only.md                     # Auditoria read-only
    ├── apply-one-page.md                 # Polir 1 página
    ├── apply-one-component.md            # Polir 1 componente
    ├── dashboard-conversion.md           # Converter dashboard em 5 seções
    ├── mobile-qa.md                      # QA mobile
    └── final-safety-qa.md                # QA final anti-regressão
```

---

## Avisos de segurança ⚠️

### Hard rules (não-negociáveis)

> **Do not copy ProFrance business data or business logic.**
> **Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.**

A skill recusa explicitamente:
- Copiar dados de cliente/pedido/finança/transação de ProFrance.
- Copiar workflows operacionais privados.
- Copiar regras Supabase (RLS, RPC, triggers).
- Copiar lógica de autenticação.
- Modificar fetching de dados do alvo.
- Modificar schema/migrations do alvo.
- Renomear rotas do alvo.
- Mudar API payloads do alvo.
- Adicionar dependências sem aprovação.
- Refatorar fora do escopo visual.
- Commitar `.env`, segredos ou chaves de API.
- Desabilitar testes ou hooks para passar build.

### Boas práticas

- **Sempre confirmar `localhost`** com o dono do projeto antes de subir dev server.
- **Sempre começar por audit-only.**
- **Sempre aplicar fase-por-fase** com QA gate entre cada uma.
- **Sempre rodar `tsc + build`** depois de cada fase.
- **Sempre listar `TARGET_ALLOWED_FILES` e `TARGET_FORBIDDEN_FILES`** antes de editar.
- **Sempre rejeitar** edits propostos que toquem `FORBIDDEN_FILES`.

---

## Versão e procedência

- **Skill version:** 1.0.0
- **Source repo:** ProFrance (SaaS administrativo/financeiro)
- **Source docs:** transfer kit + application checklist + real-system prompt (5500+ linhas combinadas).
- **License:** Visual system reuse permitido; dados/lógica/schema permanecem proprietários do projeto ProFrance.

### Para atualizar

Quando o ProFrance evoluir o sistema visual:
1. Atualize os docs em `docs/profrance-*.md` do repo origem.
2. Re-rode `cp` para `resources/` dentro da skill.
3. Bump version no `SKILL.md` (campo opcional na frontmatter).
4. Reinstale via `./install.sh global`.

---

## Suporte

- Sistema visual completo: leia [`resources/visual-transfer-kit.md`](./resources/visual-transfer-kit.md).
- Checklist por fase: leia [`resources/style-application-checklist.md`](./resources/style-application-checklist.md).
- Prompts prontos: leia [`resources/apply-to-real-system-prompt.md`](./resources/apply-to-real-system-prompt.md).
