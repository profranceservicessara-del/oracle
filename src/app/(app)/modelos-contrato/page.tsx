"use client";

import { useState } from "react";
import { FormModal } from "@/components/ui/form-modal";
import { useToast } from "@/components/ui/toast";

// Gestão > Modelos de contrato — biblioteca de modelos. Frontend-only: lista
// estática; "Consulte as instruções." abre um modal local; "Download" mostra
// aviso seguro (sem geração de documento nem validade jurídica).

type Template = { title: string; term: string; desc: string };

const templates: Template[] = [
  { title: "Termos Gerais de Uso", term: "Termos Gerais de Uso", desc: "Os Termos Gerais de Uso definem as regras de utilização do seu site ou serviço pelos usuários." },
  { title: "Contrato de prestação de serviços", term: "contrato de prestação de serviços", desc: "Um contrato de prestação de serviços formaliza a relação entre você e o cliente para a execução de um serviço." },
  { title: "Contrato de subcontratação", term: "de subcontratação", desc: "Um contrato de subcontratação vincula um cliente a um subcontratado para executar parte de um trabalho." },
  { title: "Aviso legal", term: "avisos legais", desc: "Os avisos legais informam os usuários do seu site sobre a identidade do seu provedor e responsável." },
  { title: "Oferta de emprego", term: "carta de oferta de emprego", desc: "Uma carta de oferta de emprego formaliza um compromisso de contratação com um candidato." },
  { title: "Termos e Condições Gerais de Venda (cliente empresarial)", term: "Termos e Condições Gerais de Venda", desc: "Os Termos e Condições Gerais de Venda regem suas relações comerciais com clientes empresariais." },
  { title: "Termos e Condições Gerais de Venda (cliente particular)", term: "Termos e Condições Gerais de Venda", desc: "Os Termos e Condições Gerais de Venda regem suas relações comerciais com clientes particulares." },
  { title: "Contrato de venda (cliente empresarial)", term: "Contrato de Venda", desc: "O Contrato de Venda formaliza a venda de um bem ou serviço a um cliente empresarial." },
  { title: "Contrato de Venda (cliente particular)", term: "Contrato de Venda", desc: "O Contrato de Venda formaliza a venda de um bem ou serviço a um cliente particular." },
  { title: "Contrato de agente comercial", term: "contrato de agência comercial", desc: "Um contrato de agência comercial define a relação entre um mandante e seu agente comercial." },
  { title: "Política de Privacidade", term: "política de privacidade", desc: "Uma política de privacidade informa os usuários sobre o tratamento dos seus dados pessoais." },
  { title: "Acordo de parceria", term: "Acordo de Parceria Comercial", desc: "O Acordo de Parceria Comercial formaliza a colaboração entre você e um parceiro." },
  { title: "Acordo de encaminhamento (cliente que encaminha)", term: "contrato de indicação comercial", desc: "Um contrato de indicação comercial rege a relação entre quem encaminha e quem recebe o cliente." },
  { title: "Acordo de indicação comercial (cliente que faz o pedido)", term: "contrato de indicação comercial", desc: "Um contrato de indicação comercial rege a relação entre quem indica e quem faz o pedido." },
  { title: "Formulário de desistência", term: "formulário de rescisão", desc: "O formulário de rescisão permite ao cliente exercer o seu direito de desistência." },
  { title: "Reconhecimento da dívida", term: "reconhecimento de dívida", desc: "Um reconhecimento de dívida é um documento no qual o devedor reconhece dever um valor." },
  { title: "Carta de intenções", term: "carta de intenções", desc: "Uma carta de intenções pré-contratual expressa a intenção das partes de negociar um acordo." },
  { title: "Termos e Condições Gerais de Venda - Profissional da Construção Civil", term: "Termos e Condições Gerais de Venda", desc: "Os Termos e Condições Gerais de Venda regem suas relações comerciais como profissional da construção civil." },
  { title: "Termos e Condições Gerais de Venda - Estafeta", term: "Termos e Condições Gerais de Venda", desc: "Os Termos e Condições Gerais de Venda regem suas relações comerciais como estafeta." },
  { title: "Termos e Condições Gerais de Venda - Fotógrafo", term: "Termos e Condições Gerais de Venda", desc: "Os Termos e Condições Gerais de Venda regem suas relações comerciais como fotógrafo." },
  { title: "Termos e Condições Gerais de Venda - Serviços Pessoais", term: "Termos e Condições Gerais de Venda", desc: "Os Termos e Condições Gerais de Venda regem suas relações comerciais em serviços pessoais." },
  { title: "Termos e Condições Gerais de Venda - Serviços de Estética", term: "Termos e Condições Gerais de Venda", desc: "Os Termos e Condições Gerais de Venda regem suas relações comerciais em serviços de estética." },
  { title: "Termos e Condições Gerais de Venda - Venda de Veículos Usados", term: "Termos e Condições Gerais de Venda", desc: "Os Termos e Condições Gerais de Venda regem suas relações comerciais na venda de veículos usados." },
  { title: "Termos e Condições Gerais de Venda - Mecânico", term: "Termos e Condições Gerais de Venda", desc: "Os Termos e Condições Gerais de Venda regem suas relações comerciais como mecânico." },
  { title: "Ordem de desembolso", term: "autorização de desembolso", desc: "Uma autorização de desembolso é um documento formal para autorizar um pagamento a um terceiro." },
  { title: "Contrato de aluguel - Equipamentos", term: "contrato de locação de equipamentos", desc: "Um contrato de locação de equipamentos rege o aluguel de um bem entre locador e locatário." },
  { title: "Ordem de compra", term: "ordem de compra", desc: "Uma ordem de compra é um documento comercial emitido por um comprador a um fornecedor." }
];

const faqs = [
  { q: "Como faço para usar esses modelos?", a: "Cada modelo vem com seu próprio manual de instruções completo. Baixe o modelo, preencha os campos conforme indicado no manual e seu modelo estará pronto!" },
  { q: "O que devo fazer se precisar de ajuda?", a: "Se você optou pelo suporte incluído, pode entrar em contato com nossos consultores a qualquer momento através da Central de Ajuda em sua ferramenta." },
  { q: "Como faço para editar os modelos?", a: "Os modelos são fornecidos em formato Microsoft Word e podem ser editados com o Word ou o LibreOffice." }
];

const eyeIcon = (
  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
);
const downloadIcon = (
  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
);

function Desc({ text, term }: { text: string; term: string }) {
  const index = text.indexOf(term);
  if (!term || index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <strong className="font-semibold text-ink">{term}</strong>
      {text.slice(index + term.length)}
    </>
  );
}

export default function ModelosContratoPage() {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Template | null>(null);

  function download() {
    showToast("Modelo ainda não disponível para download.", "info");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Gestão</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Modelos de contrato</h1>
      </div>

      {/* Intro */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#EDE9FF] to-[#F3F0FF] p-6 ring-1 ring-black/5">
        <h2 className="text-lg font-semibold text-ink" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Seus modelos de contrato para autônomos
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Estes modelos foram pensados para profissionais autônomos e trazem instruções simples de seguir. São exemplos e não constituem aconselhamento jurídico.
        </p>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md" key={tpl.title}>
            <h3 className="text-base font-semibold text-ink">{tpl.title}</h3>
            <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">
              <Desc term={tpl.term} text={tpl.desc} />
            </p>
            <div className="mt-4 space-y-2">
              <button className="flex items-center gap-2 text-sm font-medium text-[#5B4BE0] transition hover:underline" onClick={() => setSelected(tpl)} type="button">
                {eyeIcon} Consulte as instruções.
              </button>
              <button className="flex items-center gap-2 text-sm font-medium text-[#5B4BE0] transition hover:underline" onClick={download} type="button">
                {downloadIcon} Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Suggestion banner */}
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#EDE9FF] to-[#F3F0FF] p-6 text-center ring-1 ring-black/5">
        <p className="text-sm font-medium text-slate-600">Não consegue encontrar o modelo de documento que precisa?</p>
        <button className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B4BE0] transition hover:underline" onClick={() => showToast("Sugestão registrada. Obrigado!", "success")} type="button">
          Sugira novos modelos <span aria-hidden>→</span>
        </button>
      </div>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-center text-lg font-semibold text-ink">Perguntas frequentes</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {faqs.map((faq) => (
            <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md" key={faq.q}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-[#5B8DEF]">
                  <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><line x1="12" x2="12" y1="17" y2="17" /></svg>
                </span>
                <h3 className="text-base font-semibold text-ink">{faq.q}</h3>
              </div>
              <p className="mt-3 border-l-2 border-[#5B8DEF] pl-3 text-sm text-muted">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <FormModal
        description={selected?.desc}
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Preencha os campos indicados no modelo e adapte-o à sua situação. Depois de baixar, revise cada cláusula antes de usar.
          </p>
          <p className="rounded-xl bg-amber-50 p-3 text-amber-700 ring-1 ring-amber-200">
            Este é um modelo de exemplo e não constitui aconselhamento jurídico. Em caso de dúvida, consulte um profissional.
          </p>
        </div>
      </FormModal>
    </main>
  );
}
