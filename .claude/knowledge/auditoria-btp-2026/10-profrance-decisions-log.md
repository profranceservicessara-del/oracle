# ProFrance — Decisions Log

Decisões aprovadas, correções repetidas e abordagens rejeitadas. Separadas em técnicas, de negócio e de estilo.

## Decisões técnicas aprovadas

- **Migração de dados via batch**, não manual: `Takeout (.mbox)` → Python → AI API extrai JSON → bulk insert Supabase. Motivo: extensão de Chrome email a email não escala. — `CONFIRMED`
- **Clonagem/construção de site**: começar com **HTML puro + Tailwind via CDN**, iterar **seção por seção**, publicar grátis em Netlify ou Vercel. Não pular pra Next.js/React cedo demais nem gerar página inteira de uma vez. — `CONFIRMED` (princípio aprovado)

## Decisões técnicas rejeitadas

- **Extensão de Chrome / Gemini lendo email a email na mão** para extrair dados: rejeitado como "atalho falso" que não escala. — `CONFIRMED`
- **Gerar página inteira de uma vez** ao clonar site: desaconselhado. — `CONFIRMED`

## Decisões de negócio aprovadas

- **Retainer mensal** como produto central. — `CONFIRMED`
- **Carte BTP como isca de entrada**, não produto isolado. — `CONFIRMED`
- **Contato real mínimo** (uma call/áudio inicial, depois assíncrono) em vez de zero contato, porque BTP fecha por telefone/WhatsApp. — `CONFIRMED` (compromisso proposto e aceito na lógica)
- **Email abre, WhatsApp fecha**; pedir SIRET ou nº de trabalhadores como micro-compromisso. — `CONFIRMED`
- Manter deliverable de onboarding **genérico** para servir também de conteúdo de Instagram. — `CONFIRMED`

## Decisões de negócio rejeitadas

- **Modelo 100% sem contato com cliente** para BTP: rejeitado como incompatível com o setor. (Conflita com a preferência pessoal da usuária; ver doc 11.) — `CONFIRMED`
- **Carte BTP como produto único standalone**: rejeitado por ser tarefa de baixa frequência. — `CONFIRMED`

## Correções repetidas / de credibilidade

- Não afirmar que auto-entrepreneur é obrigado a **emitir** fatura eletrônica em setembro/2026. Correto: **receber** em 2026, **emitir** em 2027. — `CONFIRMED`
- Não mandar cliente descartar toda fatura postal (existe CFE legítima). Regra: **"foto antes de decidir"**. — `CONFIRMED`
- Não enviar senha em texto puro junto do login. — `CONFIRMED`
- Sobre A1: sempre lembrar que **o país de afiliação emite**, para não orientar cliente a pedir A1 no país errado. — `CONFIRMED`

## Decisões de estilo aprovadas

- Estilo pessoal padrão: **Zine Místico Cartoon** (paleta lavanda/rosa/azul/roxo/creme; Bungee Inline, Caveat, Patrick Hand, Fredoka; sombra comic navy). Aplicar por padrão. — `CONFIRMED`
- Estilo institucional alternativo para peças formais/Instagram: navy `#1B2A4A`, off-white, âmbar, vermelho só para alerta de fraude; formato carrossel 1080x1350px. — `INFERRED` (usado uma vez, coerente)
- Nunca usar travessão (—). — `USER-DEFINED RULE`

## Decisões de estilo rejeitadas

- **Paleta amarela/bege/quente**: rejeitada explicitamente (a usuária mandou refazer o guia fiscal). — `CONFIRMED`
