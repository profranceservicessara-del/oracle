"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// ---------------------------------------------------------------------------
// Configurações > Cobrança > Aparência — document appearance customization.
// Frontend-only (no persistence yet): the selected template lives in component
// state. Safe fallback preview data is hardcoded below.
// ---------------------------------------------------------------------------

type TemplateId = "classic" | "right" | "dense" | "card" | "warm";

type Template = {
  id: TemplateId;
  name: string;
  accent: string;
  titleAlign: "left" | "right";
  dense: boolean;
  cardStyle: boolean;
  warm: boolean;
};

const templates: Template[] = [
  { id: "classic", name: "Clássico azul", accent: "#2563eb", titleAlign: "left", dense: false, cardStyle: false, warm: false },
  { id: "right", name: "Título à direita", accent: "#2563eb", titleAlign: "right", dense: false, cardStyle: false, warm: false },
  { id: "dense", name: "Profissional denso", accent: "#1e40af", titleAlign: "left", dense: true, cardStyle: false, warm: false },
  { id: "card", name: "Card moderno", accent: "#2563eb", titleAlign: "right", dense: false, cardStyle: true, warm: false },
  { id: "warm", name: "Criativo laranja", accent: "#ea7317", titleAlign: "left", dense: false, cardStyle: false, warm: true }
];

const rail = [
  { key: "estrutura", label: "Estrutura" },
  { key: "logotipo", label: "Logotipo" },
  { key: "cores", label: "Cores" },
  { key: "tipografia", label: "Tipografia" },
  { key: "pintura", label: "Pintura" },
  { key: "decoracao", label: "Decoração" },
  { key: "rodapes", label: "Rodapés" },
  { key: "espacamento", label: "Espaçamento" },
  { key: "link", label: "Link" }
];

// Safe fallback preview data (example invoice).
const doc = {
  sellerName: "Laboratório Criativo EI",
  sellerLines: ["Bruna Silva", "contato@brunatattoo.com", "+33 7 82 98 77 75", "França", "Número SIRET atualmente atribuído"],
  buyerLines: ["Avenida General Leclerc, 223", "54000 Nancy, França"],
  emission: "02/07/2026",
  due: "01/08/2026",
  items: [
    { n: 1, code: "TESTE-01", desc: "Suco de laranja", sub: "", unit: "unidade", qty: 1, pu: "€ 2,45", ht: "€ 2,45", ttc: "€ 2,94" },
    { n: 2, code: "TESTE-02", desc: "Reparo de computadores", sub: "Prestação de serviços", unit: "Hora", qty: 1, pu: "€ 90,00", ht: "€ 90,00", ttc: "€ 108,00" },
    { n: 3, code: "TESTE-03", desc: "Desenvolvimento de sites", sub: "Prestação de serviços", unit: "Hora", qty: 1, pu: "€ 95,00", ht: "€ 95,00", ttc: "€ 114,00" },
    { n: 4, code: "TESTE-04", desc: "Joias de ébano", sub: "", unit: "artigo", qty: 1, pu: "€ 24,99", ht: "€ 24,99", ttc: "€ 29,99" }
  ],
  total: "€ 212,44"
};

function railIcon(key: string) {
  const p = { fill: "none", height: 16, width: 16, stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.7, viewBox: "0 0 24 24" } as const;
  switch (key) {
    case "estrutura":
      return (<svg {...p}><rect height="18" rx="2" width="18" x="3" y="3" /><path d="M3 9h18M9 9v12" /></svg>);
    case "logotipo":
      return (<svg {...p}><rect height="18" rx="2" width="18" x="3" y="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>);
    case "cores":
      return (<svg {...p}><circle cx="13.5" cy="6.5" r="1.5" /><circle cx="17.5" cy="10.5" r="1.5" /><circle cx="8.5" cy="7.5" r="1.5" /><circle cx="6.5" cy="12.5" r="1.5" /><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2 2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10z" /></svg>);
    case "tipografia":
      return (<svg {...p}><path d="M4 7V5h16v2M9 19h6M12 5v14" /></svg>);
    case "pintura":
      return (<svg {...p}><rect height="14" rx="2" width="18" x="3" y="5" /><path d="M3 10h18" /></svg>);
    case "decoracao":
      return (<svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4m-2.5-6.5-3 3m-6 6-3 3m0-12 3 3m6 6 3 3" /></svg>);
    case "rodapes":
      return (<svg {...p}><rect height="18" rx="2" width="18" x="3" y="3" /><path d="M3 16h18" /></svg>);
    case "espacamento":
      return (<svg {...p}><path d="M3 6h18M3 18h18M8 10l4 4 4-4" /></svg>);
    default:
      return (<svg {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>);
  }
}

function MiniPreview({ template }: { template: Template }) {
  const bg = template.warm ? "#fdf6ec" : "#ffffff";
  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded-md p-2 ring-1 ring-black/10" style={{ background: bg }}>
      <div className={`flex ${template.titleAlign === "right" ? "justify-end" : "justify-start"}`}>
        <div className="h-1.5 w-8 rounded-full" style={{ background: template.accent }} />
      </div>
      <div className={`mt-1 flex ${template.titleAlign === "right" ? "justify-end" : "justify-start"}`}>
        <div className="h-1 w-5 rounded-full bg-slate-300" />
      </div>
      <div className={`mt-2 space-y-1 ${template.cardStyle ? "rounded bg-slate-100 p-1" : ""}`}>
        <div className="h-1 w-3/4 rounded-full bg-slate-200" />
        <div className="h-1 w-2/3 rounded-full bg-slate-200" />
      </div>
      <div className="mt-2 h-1.5 w-full rounded-sm" style={{ background: template.accent }} />
      <div className={`mt-1 ${template.dense ? "space-y-0.5" : "space-y-1"}`}>
        {Array.from({ length: template.dense ? 6 : 4 }).map((_, index) => (
          <div className="h-0.5 w-full rounded-full bg-slate-200" key={index} />
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <div className="h-1.5 w-10 rounded-sm" style={{ background: template.warm ? template.accent : `${template.accent}` }} />
      </div>
    </div>
  );
}

function PreviewDoc({ template }: { template: Template }) {
  const pad = template.dense ? "p-6" : "p-9";
  const text = template.dense ? "text-[11px]" : "text-xs";
  const accent = template.accent;
  const pageBg = template.warm ? "#fdf7ee" : "#ffffff";
  const alignRight = template.titleAlign === "right";

  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5" style={{ background: pageBg }}>
      {/* EXEMPLAR watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <span className="select-none text-6xl font-bold tracking-widest text-slate-900/10 sm:text-7xl" style={{ transform: "rotate(-24deg)" }}>
          EXEMPLAR
        </span>
      </div>

      <div className={`relative ${pad} ${text} text-slate-700`}>
        {/* title */}
        <div className={alignRight ? "text-right" : "text-left"}>
          <div className={`flex items-center gap-2 ${alignRight ? "justify-end" : "justify-start"}`}>
            <span className="text-2xl font-bold" style={{ color: accent }}>Conta</span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Rascunho</span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">Documento provisório</p>
        </div>

        {/* parties */}
        {template.cardStyle ? (
          <div className="mt-5 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-black/5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Emissor</p>
              <p className="mt-1 font-semibold text-slate-800">{doc.sellerName}</p>
              {doc.sellerLines.map((line) => (<p className="text-slate-500" key={line}>{line}</p>))}
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Destinatário</p>
              {doc.buyerLines.map((line) => (<p className="mt-1 text-slate-600 first:mt-1" key={line}>{line}</p>))}
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Data de emissão</p>
              <p className="mt-1 font-semibold text-slate-800">{doc.emission}</p>
              <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Vencimento</p>
              <p className="mt-1 font-semibold text-slate-800">{doc.due}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex justify-between gap-6">
              <div>
                <p className="font-semibold text-slate-800">{doc.sellerName}</p>
                {doc.sellerLines.map((line) => (<p className="text-slate-500" key={line}>{line}</p>))}
              </div>
              <div className="text-right text-slate-500">
                {doc.buyerLines.map((line) => (<p key={line}>{line}</p>))}
              </div>
            </div>
            <div className="mt-3 space-y-0.5">
              <p><span className="font-semibold text-slate-800">Data de emissão</span> <span className="ml-4 tabular-nums">{doc.emission}</span></p>
              <p><span className="font-semibold text-slate-800">Data de vencimento</span> <span className="ml-4 tabular-nums">{doc.due}</span></p>
            </div>
          </>
        )}

        {/* items table */}
        <div className="mt-5 overflow-hidden rounded-md">
          <div className="grid grid-cols-[24px_1fr_60px_50px_70px_70px_84px] items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-white" style={{ background: accent }}>
            <span>#</span><span>Designação e descrição</span><span>Unidade</span><span>Qtd</span><span className="text-right">Preço unit.</span><span className="text-right">S/ IVA</span><span className="text-right">C/ IVA</span>
          </div>
          {doc.items.map((item, index) => (
            <div className={`grid grid-cols-[24px_1fr_60px_50px_70px_70px_84px] items-center gap-1 px-2 ${template.dense ? "py-1.5" : "py-2.5"} tabular-nums ${index % 2 ? "bg-slate-50/60" : ""}`} key={item.n}>
              <span className="text-slate-400">{item.n}</span>
              <span>
                <span className="block text-[9px] font-medium uppercase tracking-wide text-slate-400">{item.code}</span>
                <span className="font-semibold text-slate-800">{item.desc}</span>
                {item.sub ? <span className="block text-[10px] italic text-slate-400">{item.sub}</span> : null}
              </span>
              <span>{item.unit}</span><span>{item.qty}</span>
              <span className="text-right">{item.pu}</span><span className="text-right">{item.ht}</span><span className="text-right">{item.ttc}</span>
            </div>
          ))}
        </div>

        {/* conditions + totals */}
        <div className="mt-5 flex justify-between gap-8">
          <div className="max-w-[55%]">
            <p className="font-semibold text-slate-800">Condições de pagamento</p>
            <p className="mt-1"><span className="font-semibold text-slate-700">Prazo de pagamento</span> — 30 dias</p>
            <p><span className="font-semibold text-slate-700">Atraso no pagamento</span> — 3× a taxa legal</p>
            <p><span className="font-semibold text-slate-700">Métodos de pagamento</span> — Transferência</p>
          </div>
          <div className="w-52 shrink-0">
            <div className="flex items-center justify-between rounded-md px-3 py-2 text-white" style={{ background: accent }}>
              <span className="text-[11px] font-semibold">Total (sem IVA)</span>
              <span className="text-sm font-bold tabular-nums">{doc.total}</span>
            </div>
            <p className="mt-2 text-right text-[10px] text-slate-400">IVA não aplicável, art. 293 B do CGI</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AparenciaPage() {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<TemplateId>("classic");
  const [savedTemplate, setSavedTemplate] = useState<TemplateId>("classic");
  const [editorOpen, setEditorOpen] = useState(false);
  const [section, setSection] = useState("estrutura");

  const current = templates.find((template) => template.id === selected) ?? templates[0];
  const savedCurrent = templates.find((template) => template.id === savedTemplate) ?? templates[0];

  function openEditor() {
    setSelected(savedTemplate);
    setSection("estrutura");
    setEditorOpen(true);
  }

  function save() {
    setSavedTemplate(selected);
    setEditorOpen(false);
    showToast("Aparência salva.", "success");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações · Cobrança</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Aparência</h1>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="font-semibold text-ink">Alterar a aparência dos seus documentos</p>
        <p className="mt-1 text-sm text-muted">Personalize seus documentos de faturamento para refletir sua marca.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* default theme card */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="overflow-hidden rounded-xl ring-1 ring-black/5">
            <div className="mx-auto w-28 py-4"><MiniPreview template={savedCurrent} /></div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="font-medium text-ink">Tema padrão</p>
            <span className="text-slate-400">···</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">{savedCurrent.name}</p>
          <Button className="mt-3 w-full" onClick={openEditor} type="button">Para modificar</Button>
        </div>

        {/* new theme card */}
        <button
          className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-500"
          onClick={openEditor}
          type="button"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <svg fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="22"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <span className="mt-3 text-sm font-medium">Novo tema</span>
        </button>
      </div>

      {/* ---- Editor overlay ---- */}
      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex bg-[#eef1f6]">
          {/* left rail */}
          <aside className="hidden w-52 shrink-0 flex-col border-r border-black/5 bg-white p-4 lg:flex">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Personalização</p>
            <nav className="mt-3 flex flex-col gap-0.5">
              {rail.map((item) => (
                <button
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                    section === item.key ? "bg-[#2563eb]/10 text-[#2563eb]" : "text-slate-500 hover:bg-slate-100 hover:text-ink"
                  }`}
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  type="button"
                >
                  <span className="shrink-0">{railIcon(item.key)}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* middle: structure + templates */}
          <div className="flex w-full max-w-[22rem] shrink-0 flex-col border-r border-black/5 bg-white">
            <div className="flex-1 overflow-y-auto p-5">
              {section === "estrutura" ? (
                <>
                  <h2 className="text-lg font-semibold text-ink">Estrutura</h2>
                  <p className="mt-1 text-sm text-muted">Escolha o formato dos seus documentos.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {templates.map((template) => {
                      const isActive = selected === template.id;
                      return (
                        <button
                          className={`group rounded-xl p-1.5 text-left transition ${isActive ? "bg-[#2563eb]/5 ring-2 ring-[#2563eb]" : "ring-1 ring-black/10 hover:ring-black/20"}`}
                          key={template.id}
                          onClick={() => setSelected(template.id)}
                          type="button"
                        >
                          <div className="relative">
                            <MiniPreview template={template} />
                            {isActive ? (
                              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2563eb] text-white shadow">
                                <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="12"><path d="M20 6 9 17l-5-5" /></svg>
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 truncate px-0.5 text-xs font-medium text-slate-600">{template.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-muted ring-1 ring-black/5">
                  <p className="font-medium text-ink">{rail.find((r) => r.key === section)?.label}</p>
                  <p className="mt-1">Personalização disponível em breve.</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-black/5 p-3">
              <Button onClick={() => setEditorOpen(false)} type="button" variant="secondary">← Voltar</Button>
              <Button className="flex-1" onClick={save} type="button">Salvar</Button>
            </div>
          </div>

          {/* right: preview */}
          <div className="relative flex-1 overflow-y-auto">
            <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
              <Button onClick={() => showToast("Novo tema em branco disponível em breve.", "info")} type="button" variant="secondary">
                + Novo tema
              </Button>
              <button
                aria-label="Fechar"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink"
                onClick={() => setEditorOpen(false)}
                type="button"
              >
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-4 pb-10 pt-20 sm:px-8">
              <PreviewDoc template={current} />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
