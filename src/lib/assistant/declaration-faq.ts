// Base de conhecimento determinística do Assistente de Declarações (Fase 1).
// Respostas refletem o motor URSSAF real (payments.date_encaissement, statuses,
// imutabilidade). SEM alíquotas, SEM conselho fiscal definitivo, SEM IA.
// Fonte única — importada pela UI, não duplicada em componentes.

export type FaqLink = { label: string; href: string };

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  link?: FaqLink;
};

export const DECLARATION_FAQ: FaqEntry[] = [
  {
    id: "como-calcula",
    question: "Como o Oracle calcula minha base?",
    answer:
      "A base usa apenas os pagamentos realmente recebidos no período escolhido (pela data de recebimento). Faturas emitidas mas ainda não pagas e receita futura esperada não entram. Cada recebimento é agrupado pela categoria da fatura de origem.",
    link: { label: "Ver minha declaração", href: "/urssaf" }
  },
  {
    id: "pendente-revisao",
    question: "O que significa pendente de revisão?",
    answer:
      "É um recebimento que o Oracle não conseguiu identificar com segurança: sem fatura/categoria vinculada, ou com valor inválido/não positivo (ex.: ajuste ou estorno). Itens pendentes nunca entram na base automaticamente — você decide incluir (se tiver categoria) ou excluir.",
    link: { label: "Ver minha declaração", href: "/urssaf" }
  },
  {
    id: "excluida",
    question: "Por que uma entrada foi excluída?",
    answer:
      "Uma entrada fica excluída quando você a remove manualmente da base durante a revisão. Ela deixa de contar no total, mas continua registrada na trilha de auditoria com o motivo.",
    link: { label: "Ver minha declaração", href: "/urssaf" }
  },
  {
    id: "confirmar-base",
    question: "O que acontece quando confirmo a base?",
    answer:
      "A confirmação fica bloqueada enquanto houver itens pendentes de revisão. Depois de confirmar, a base vira um registro imutável (snapshot travado) daquele período — serve como sua referência para a declaração.",
    link: { label: "Ver minha declaração", href: "/urssaf" }
  },
  {
    id: "envia-urssaf",
    question: "O Oracle envia a declaração para a URSSAF?",
    answer:
      "Não. O Oracle prepara e organiza a base a partir dos seus dados. Ele não transmite nada automaticamente à URSSAF — o envio oficial é feito por você (ou pelo Conselheiro) fora do Oracle.",
    link: { label: "Configurar URSSAF", href: "/urssaf/configuracao" }
  },
  {
    id: "conselheiro",
    question: "Como pedir ajuda ao Conselheiro?",
    answer:
      "Você pode enviar sua solicitação ao Meu Conselheiro. Uma pessoa da equipe responde em até 48 horas e pode revisar sua base antes da declaração oficial.",
    link: { label: "Falar com o Conselheiro", href: "/conselheiro" }
  }
];

export const ASSISTANT_INTRO =
  "Olá! Sou o Assistente de Declarações do Oracle. Posso explicar como sua base é preparada, o que significa cada status e como resolver pendências antes de solicitar a revisão do Conselheiro.";
