# ProFrance — Contexto do Projeto

## O que é
Software de gestão administrativa (Supabase + Vercel) para serviços BTP e auto-entrepreneur na França. Sistema já em estágio avançado. O trabalho agora é evolução e manutenção, não construção do zero.

## Base de conhecimento
Regras de negócio e regras francesas ficam em docs/profrance-knowledge/.
Índice: docs/profrance-knowledge/00-profrance-README-sistema-agentes.md.
Antes de implementar qualquer coisa que toque regra de negócio (dossiê, validade de documento, obrigação legal), consultar esses docs.

## Trava legal (importante)
Toda afirmação marcada CONFLICTING ou OFFICIAL-SOURCE VERIFICATION REQUIRED nos docs NÃO pode virar valor hardcoded no código sem eu confirmar antes. Exemplos: custo da carte BTP, valor de multa de faturação, datas da reforma de faturação. Se precisar de um desses valores, perguntar, não chutar.

## Regras de trabalho com o código
- Sistema já existe. Nunca assumir schema, rota ou componente: ler o código real primeiro.
- Antes de mudança estrutural (schema, migration, deploy), propor o plano e esperar aprovação.
- Uma seção por vez. Não reescrever arquivos inteiros quando uma edição pontual resolve.
- Não criar tabela, campo ou rota nova sem confirmar que não existe equivalente.

## Estilo de escrita (textos, UI, mensagens ao usuário, comentários pra mim)
- Nunca usar travessão. Usar vírgula, ponto ou parênteses.
- Português direto, natural, sem tom corporativo.

## Estilo visual (quando gerar UI ou deliverable visual)
- Padrão pessoal "Zine Místico Cartoon": paleta lavanda #C8A8E9, rosa #F2C4CE, azul #B8D8EA, roxo #5B3F8E, creme #FBF6E9. Fontes Bungee Inline, Caveat, Patrick Hand, Fredoka. Sombra comic navy.
- Nunca paleta amarela, bege ou de tom quente.
- Existe também um estilo institucional navy (#1B2A4A) para peças formais.

## Agentes disponíveis
Ver .claude/agents/. Cada um tem seu escopo. A sessão principal roteia pela description de cada agente. Para forçar um, chamar pelo nome.
