# ProFrance — Current State

Estado atual do trabalho da usuária, montado a partir dos arquivos e do histórico. Separa o que está feito, em andamento e pendente.

## Frentes ativas

### Negócio de serviços administrativos (BTP + auto-entrepreneur)
- Modelo: **retainer mensal** de gestão administrativa para empresas de construção e para auto-entrepreneurs. — `CONFIRMED`
- Duas propostas de venda completas já produzidas: uma para donos de empresa BTP (documentos de trabalhador), outra para auto-entrepreneurs (gancho da faturação eletrônica). — `CONFIRMED`
- Atende clientes direto por **WhatsApp**; faz registro via INPI Guichet unique, abertura de conta URSSAF, suporte administrativo contínuo. — `CONFIRMED`
- Base de clientes inclui ex-clientes e prospects novos. — `CONFIRMED`

### Gestão fiscal própria (auto-entrepreneur)
- Opera como auto-entrepreneur em **profession libérale (BNC)**. — `CONFIRMED`
- Gerindo as próprias declarações de 2026: **URSSAF trimestral** e **declaração de imposto anual via 2042-C-PRO**. — `CONFIRMED`

### Cliente em processo (A1 détachement)
- Aconselhou cliente sobre obter **A1** de détachement para trabalho na França no setor BTP. Conclusão: o A1 vem do país de afiliação (Portugal, no caso recibos verdes), não da França. — `CONFIRMED`
- Follow-up em aberto: passo a passo de como pedir o A1 à Segurança Social portuguesa (Claude ofereceu, sem confirmação de execução). — `INFERRED`

### Projeto de migração de dados
- Migração de dados de cliente do Gmail para sistema próprio. — `CONFIRMED`
- Decisão técnica fechada: pipeline `Google Takeout (.mbox)` → `script Python` → `AI API (Claude ou Gemini) extrai JSON` → `bulk insert no Supabase`. — `CONFIRMED`
- **Pendente:** confirmar os campos exatos a extrair e o volume aproximado de emails para Claude escrever o script final. — `CONFIRMED` (bloqueio declarado)

## Explorações não concluídas

- **SAS de manutenção de elevadores (ascensoriste):** iniciada, Claude começou a pesquisar, conversa terminou sem entrega. Atividade regulamentada, exige qualificação de ascensoriste. — `CONFIRMED` (incompleto)
- **Transição micro-entreprise → SASU:** roadmap faseado foi discutido no guia fiscal, sem decisão de executar. — `CONFIRMED`
- **Posicionamento e preço** do serviço BTP: em definição, sem número final travado. — `CONFIRMED`

## Deliverables já entregues (concretos)

- Guia fiscal interativo em HTML no estilo "Zine Místico Cartoon" (após rejeição da versão amarelada). — `CONFIRMED`
- Documento de onboarding de cliente em PDF/carrossel 9 slides 1080x1350px, estilo institucional navy. — `CONFIRMED`
- Duas propostas de venda (email + WhatsApp) para BTP e para auto-entrepreneur. — `CONFIRMED`

## Sistema técnico

- Stack mencionada: **Supabase, Vercel, Cursor, Python, Google Takeout, AI APIs (Claude, Gemini)**. Publicação em **Netlify ou Vercel**. — `CONFIRMED` (menção)
- Nenhum detalhe de implementação, schema, tabela, rota ou repositório disponível. — `UNKNOWN`

## O que este documento NÃO tem

- Dossiês de cliente com prazos e controle de validade estruturados: não existem como dado no Project. — `UNKNOWN`
- Procedimentos ANEF/OFII/préfecture em andamento: nenhum. — `UNKNOWN`
