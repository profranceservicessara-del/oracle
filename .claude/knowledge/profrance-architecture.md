# ProFrance — Arquitetura (architecture)

> ATENÇÃO DE AUDITORIA: quase nada de arquitetura técnica está presente no
> conhecimento deste Project. O que segue é honesto sobre o que se sabe e o
> que não se sabe. Identificadores técnicos (paths, branches, tables) devem
> ser mantidos em inglês e verificados no próprio código antes de qualquer uso.

---

## 1. Stack — o que aparece (apenas em memória, não no Project)

| Camada | Valor citado | Classificação |
|---|---|---|
| Hospedagem SaaS | Vercel | `[CODE-VERIFICATION REQUIRED]` |
| Banco de dados | Supabase (citado como conector ativo) | `[CODE-VERIFICATION REQUIRED]` |
| Registrar de domínio (planejado) | OVH (`.fr`) | `[UNKNOWN neste Project]` |
| E-mail corporativo (planejado) | Google Workspace France | `[UNKNOWN neste Project]` |
| E-mail marketing (planejado) | Brevo | `[UNKNOWN neste Project]` |
| Dev da biblioteca de posts | Cursor (HTML, Tailwind CSS, vanilla JS) | `[UNKNOWN neste Project]` |

Nenhum desses valores foi confirmado a partir de arquivos ou código dentro deste Project.

## 2. Arquitetura de subdomínios (planejada, dependente do nome)

Citada em memória, não confirmada:
- `marca.fr` — vitrine
- `app.marca.fr` — SaaS
- `news.marca.fr` — e-mail marketing

`[UNKNOWN neste Project]` — o placeholder "marca" indica que o nome ainda não estava decidido.

## 3. Estrutura de dados de conteúdo (essa sim, verificável)

### Central Viva — schema de card JSON `[CONFIRMED]`

Campos por card:
`id`, `tag`, `title`, `lead`, `tom`, `cor`, `selo`, `heading`, `image`, `links[]`, `variations[]`

Cada item de `variations`: `id`, `name`, `text`.

Cada item de `links`: `label`, `url`.

Bloco raiz do arquivo: `texts{}` (chaves como `hero.title1`, `hero.title2`, `hero.tagline`, `hero.greeting`, `footer.quote`, `footer.sig`) e `sections[]` (cada seção com `id`, `roman`, `name`, `frasePoder`, `panels[]`).

> Nota: em memória há menção a campos adicionais (`variations`, `grupoSelo`, `adminSelo`, `adminSelo`, placeholders `[nome da adm]`, `[nome do grupo]`, `[seu contato]`). No arquivo auditado aqui aparecem `id, tag, title, lead, tom, cor, selo, heading, image, links, variations`. Campos `grupoSelo`/`adminSelo` **não** foram encontrados neste arquivo específico. `[CONFLICTING]` — verificar em outros arquivos do sistema.

## 4. Repositórios, branches, commits, deploy

- Repository paths → `[UNKNOWN]`
- Branch names → `[UNKNOWN]`
- Commit hashes → `[UNKNOWN]`
- Deployment rules → `[UNKNOWN]`
- Table names / field names / storage keys do banco → `[UNKNOWN]`

Nenhum desses identificadores existe no conhecimento deste Project. Não foram inventados. Precisam ser lidos diretamente do repositório e do painel Supabase/Vercel.

## 5. Frontend

- Framework do SaaS → `[UNKNOWN]`
- Rotas / route names → `[UNKNOWN]`
- Biblioteca de posts (app estático): HTML + Tailwind CSS + vanilla JS, com `data/posts.json` como fonte de dados. `[UNKNOWN neste Project]` (citado só em memória)
- Decisão de organização (por categoria vs. por grupo): **em aberto**. `[CONFLICTING pendente]`

## 6. Próximo passo de arquitetura

Antes de documentar arquitetura de verdade, é preciso uma sessão de leitura do repositório e dos painéis Vercel/Supabase, dentro do Project ou com acesso ao código. Só então os campos acima saem de `[UNKNOWN]`.
