// Conhecimento curado do Assistente (pt-BR). Conceitual e verificado — NÃO
// contém alíquotas, taxas de contribuição nem valores oficiais de seuil
// (que mudam e devem vir da URSSAF/impots). Descreve como o Oracle funciona
// e conceitos gerais. Fonte única, versionada em git. Injetado no system
// prompt; nunca exposto ao client.

export const FISCAL_KNOWLEDGE = `
# Como o Oracle prepara a base de declaração (motor URSSAF)

- A base usa APENAS pagamentos realmente recebidos (data de recebimento /
  encaissement) dentro do período selecionado (mensal ou trimestral, conforme
  a periodicidade configurada no perfil).
- Faturas emitidas mas ainda não pagas NÃO entram. Receita futura esperada
  NÃO entra. Regime de caixa (recebido), não de competência.
- Cada recebimento é agrupado pela categoria da fatura de origem.

## Status de cada linha
- confirmado: recebimento identificado (fatura + categoria) e valor positivo.
  Só esses entram no total da base.
- pendente de revisão (needs_review): recebimento sem fatura/categoria
  identificável, ou com valor inválido/não positivo (ajuste, estorno). NUNCA
  entra automaticamente — o usuário decide incluir (se tiver categoria) ou
  excluir.
- excluído: removido manualmente da base durante a revisão.

## Confirmação da base
- A confirmação fica bloqueada enquanto houver itens pendentes de revisão.
- Depois de confirmar, a base vira um registro imutável (snapshot travado)
  daquele período.
- Confiança = confirmados / (confirmados + pendentes).

## Envio oficial
- O Oracle PREPARA e organiza a base. Ele NÃO transmite nada automaticamente
  à URSSAF. O envio oficial é feito pelo usuário (ou pelo Conselheiro) fora do
  Oracle, no espaço oficial (autoentrepreneur.urssaf.fr / impots.gouv.fr).

# Conceitos gerais (auto-entrepreneur / micro-entreprise)

- Categorias de atividade no Oracle: venda de mercadorias (BIC), prestação de
  serviços comerciais/artesanais (BIC), outras prestações (BNC). A categoria
  afeta como o faturamento é agrupado na declaração.
- Regime de TVA: franchise en base (isento até certo limite) ou sujeito a TVA.
  O Oracle mostra o regime configurado; ele não calcula a TVA devida.
- Periodicidade: a declaração de faturamento à URSSAF pode ser mensal ou
  trimestral, conforme a opção do micro-entrepreneur.
- Comprovantes: faturas emitidas com PDF e anexos de fornecedor ficam em
  Comprovantes, úteis como justificativos.

# Limites importantes de resposta

- NÃO informe alíquotas, taxas de contribuição, percentuais oficiais nem
  valores exatos de seuil. Para números oficiais, oriente o usuário a
  confirmar na URSSAF/impots ou com o Conselheiro.
- NÃO faça o cálculo da declaração de forma independente — o motor do Oracle
  em /urssaf é a única fonte de cálculo.
- Para dúvidas fiscais específicas ou revisão da base, encaminhe ao Meu
  Conselheiro (resposta humana em até 48 horas).
`.trim();
