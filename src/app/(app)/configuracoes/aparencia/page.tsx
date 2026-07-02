"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

// ---------------------------------------------------------------------------
// Configurações > Cobrança > Aparência — document appearance editor.
// Frontend-only: all customization lives in component state (no persistence).
// Preview data is hardcoded/safe. Save keeps the current selection + toast.
// ---------------------------------------------------------------------------

type TemplateId = "classic" | "right" | "dense" | "card" | "warm";

type Template = {
  id: TemplateId;
  name: string;
  titleAlign: "left" | "right";
  dense: boolean;
  cardStyle: boolean;
  base: { primary: string; background: string; text: string };
};

const BLUE = { primary: "#0075EB", background: "#FFFFFF", text: "#26385E" };
const templates: Template[] = [
  { id: "classic", name: "Clássico azul", titleAlign: "left", dense: false, cardStyle: false, base: BLUE },
  { id: "right", name: "Título à direita", titleAlign: "right", dense: false, cardStyle: false, base: BLUE },
  { id: "dense", name: "Profissional denso", titleAlign: "left", dense: true, cardStyle: false, base: { primary: "#1E40AF", background: "#FFFFFF", text: "#1E293B" } },
  { id: "card", name: "Card moderno", titleAlign: "right", dense: false, cardStyle: true, base: BLUE },
  { id: "warm", name: "Criativo laranja", titleAlign: "left", dense: false, cardStyle: false, base: { primary: "#EA7317", background: "#FDF7EE", text: "#4A3B2A" } }
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

const palettes = [
  { name: "Azul", primary: "#0075EB", background: "#FFFFFF", text: "#26385E" },
  { name: "Índigo", primary: "#4338CA", background: "#FFFFFF", text: "#1E1B4B" },
  { name: "Esmeralda", primary: "#0F766E", background: "#FFFFFF", text: "#0B3B36" },
  { name: "Verde suave", primary: "#16A34A", background: "#F6FBF6", text: "#14532D" },
  { name: "Grafite", primary: "#334155", background: "#FFFFFF", text: "#0F172A" },
  { name: "Bordô", primary: "#9F1239", background: "#FFFFFF", text: "#4C0519" },
  { name: "Laranja", primary: "#EA7317", background: "#FDF7EE", text: "#4A3B2A" },
  { name: "Violeta", primary: "#7C3AED", background: "#FFFFFF", text: "#2E1065" }
];

const fonts = ["Roboto", "Inter", "Poppins", "Georgia", "Merriweather"];
const fontStack: Record<string, string> = {
  Roboto: "'Roboto', system-ui, sans-serif",
  Inter: "'Inter', system-ui, sans-serif",
  Poppins: "'Poppins', system-ui, sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  Merriweather: "Merriweather, Georgia, serif"
};
const sizeScale: Record<string, number> = { petit: 0.9, normal: 1, grand: 1.15 };

const decorations = [
  { id: "none", label: "Nenhuma", css: "" },
  { id: "dots", label: "Pontos", css: "radial-gradient(currentColor 1px, transparent 1px)", size: "14px 14px" },
  { id: "grid", label: "Grade", css: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)", size: "18px 18px" },
  { id: "diag", label: "Diagonais", css: "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 12px)" },
  { id: "waves", label: "Ondas", css: "radial-gradient(circle at 10px 0, transparent 10px, currentColor 10px 11px, transparent 11px)", size: "20px 20px" },
  { id: "cross", label: "Cruzes", css: "repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 16px), repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 16px)" },
  { id: "glowTop", label: "Brilho topo", css: "radial-gradient(120% 60% at 50% -10%, currentColor, transparent 60%)" },
  { id: "glowCorner", label: "Canto", css: "radial-gradient(60% 60% at 100% 0, currentColor, transparent 60%)" },
  { id: "sideBar", label: "Barra lateral", css: "linear-gradient(90deg, currentColor 0 6px, transparent 6px)" },
  { id: "chevrons", label: "Chevrons", css: "repeating-linear-gradient(135deg, currentColor 0 2px, transparent 2px 14px)" },
  { id: "confetti", label: "Confete", css: "radial-gradient(circle at 25% 25%, currentColor 1.5px, transparent 2px), radial-gradient(circle at 75% 75%, currentColor 1.5px, transparent 2px)", size: "26px 26px" },
  { id: "hlines", label: "Linhas", css: "repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 10px)" },
  { id: "vlines", label: "Colunas", css: "repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 10px)" }
];

const columns = [
  { key: "numero", label: "Número", head: "#", w: "24px", align: "left" as const, cell: (i: (typeof docData.items)[number]) => i.n },
  { key: "designacao", label: "Designação e descrição", head: "Designação e descrição", w: "minmax(0,1fr)", align: "left" as const, cell: (i: (typeof docData.items)[number]) => i.desc },
  { key: "unidade", label: "Unidade", head: "Unidade", w: "58px", align: "left" as const, cell: (i: (typeof docData.items)[number]) => i.unit },
  { key: "quantidade", label: "Quantidade", head: "Qtd", w: "44px", align: "left" as const, cell: (i: (typeof docData.items)[number]) => i.qty },
  { key: "precoUnit", label: "Preço unitário sem IVA", head: "Preço unit.", w: "68px", align: "right" as const, cell: (i: (typeof docData.items)[number]) => i.pu },
  { key: "semIva", label: "Valor sem IVA", head: "S/ IVA", w: "66px", align: "right" as const, cell: (i: (typeof docData.items)[number]) => i.ht },
  { key: "comIva", label: "Valor incluindo IVA", head: "C/ IVA", w: "80px", align: "right" as const, cell: (i: (typeof docData.items)[number]) => i.ttc }
];

const docData = {
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

type TypoState = { titleFont: string; contentFont: string; tableFont: string; titleSize: string; contentSize: string; tableSize: string };
type ColorsState = { primary: string; background: string; text: string };
type TableState = { striped: boolean; border: boolean; coloredHeader: boolean; rounded: number; cols: Record<string, boolean> };
type PreviewStyle = {
  template: Template;
  colors: ColorsState;
  typo: TypoState;
  table: TableState;
  deco: { id: string; opacity: number };
  footer: { branding: boolean };
  links: { label: string; url: string }[];
};

function railIcon(key: string) {
  const p = { fill: "none", height: 16, width: 16, stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.7, viewBox: "0 0 24 24" } as const;
  switch (key) {
    case "estrutura": return (<svg {...p}><rect height="18" rx="2" width="18" x="3" y="3" /><path d="M3 9h18M9 9v12" /></svg>);
    case "logotipo": return (<svg {...p}><rect height="18" rx="2" width="18" x="3" y="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>);
    case "cores": return (<svg {...p}><circle cx="13.5" cy="6.5" r="1.3" /><circle cx="17.5" cy="10.5" r="1.3" /><circle cx="8.5" cy="7.5" r="1.3" /><circle cx="6.5" cy="12.5" r="1.3" /><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2 2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10z" /></svg>);
    case "tipografia": return (<svg {...p}><path d="M4 7V5h16v2M9 19h6M12 5v14" /></svg>);
    case "pintura": return (<svg {...p}><rect height="14" rx="2" width="18" x="3" y="5" /><path d="M3 10h18" /></svg>);
    case "decoracao": return (<svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4m-2.5-6.5-3 3m-6 6-3 3m0-12 3 3m6 6 3 3" /></svg>);
    case "rodapes": return (<svg {...p}><rect height="18" rx="2" width="18" x="3" y="3" /><path d="M3 16h18" /></svg>);
    case "espacamento": return (<svg {...p}><path d="M3 6h18M3 18h18M8 10l4 4 4-4" /></svg>);
    default: return (<svg {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>);
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      aria-pressed={checked}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#0075EB]" : "bg-slate-200"}`}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Segmented({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [{ v: "petit", l: "Pequeno" }, { v: "normal", l: "Normal" }, { v: "grand", l: "Grande" }];
  return (
    <div className="mt-2 flex rounded-xl bg-slate-100 p-0.5">
      {opts.map((o) => (
        <button
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${value === o.v ? "bg-white text-ink shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-ink"}`}
          key={o.v}
          onClick={() => onChange(o.v)}
          type="button"
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-ink">{label}</p>
      <label className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 ring-black/10 transition hover:ring-black/20">
        <span className="h-5 w-5 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: value }} />
        <span className="text-sm tabular-nums text-ink">{value.toUpperCase()}</span>
        <input className="sr-only" onChange={(event) => onChange(event.target.value)} type="color" value={value} />
        <svg aria-hidden="true" className="ml-auto text-slate-400" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="m6 9 6 6 6-6" /></svg>
      </label>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select className="mt-2" onChange={(event) => onChange(event.target.value)} value={value}>
      {fonts.map((font) => (<option key={font} value={font}>{font}</option>))}
    </Select>
  );
}

function MiniPreview({ template }: { template: Template }) {
  const bg = template.id === "warm" ? "#fdf6ec" : "#ffffff";
  const accent = template.base.primary;
  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded-md p-2 ring-1 ring-black/10" style={{ background: bg }}>
      <div className={`flex ${template.titleAlign === "right" ? "justify-end" : "justify-start"}`}><div className="h-1.5 w-8 rounded-full" style={{ background: accent }} /></div>
      <div className={`mt-1 flex ${template.titleAlign === "right" ? "justify-end" : "justify-start"}`}><div className="h-1 w-5 rounded-full bg-slate-300" /></div>
      <div className={`mt-2 space-y-1 ${template.cardStyle ? "rounded bg-slate-100 p-1" : ""}`}><div className="h-1 w-3/4 rounded-full bg-slate-200" /><div className="h-1 w-2/3 rounded-full bg-slate-200" /></div>
      <div className="mt-2 h-1.5 w-full rounded-sm" style={{ background: accent }} />
      <div className={`mt-1 ${template.dense ? "space-y-0.5" : "space-y-1"}`}>{Array.from({ length: template.dense ? 6 : 4 }).map((_, index) => (<div className="h-0.5 w-full rounded-full bg-slate-200" key={index} />))}</div>
      <div className="mt-2 flex justify-end"><div className="h-1.5 w-10 rounded-sm" style={{ background: accent }} /></div>
    </div>
  );
}

function PreviewDoc({ s }: { s: PreviewStyle }) {
  const pad = s.template.dense ? "p-6" : "p-9";
  const accent = s.colors.primary;
  const pageBg = s.colors.background;
  const textColor = s.colors.text;
  const alignRight = s.template.titleAlign === "right";
  const baseFs = (s.template.dense ? 11 : 12) * sizeScale[s.typo.contentSize];
  const visibleCols = columns.filter((column) => s.table.cols[column.key]);
  const gridTemplate = visibleCols.map((column) => column.w).join(" ");
  const deco = decorations.find((d) => d.id === s.deco.id);

  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5" style={{ background: pageBg, color: textColor, fontFamily: fontStack[s.typo.contentFont], fontSize: baseFs }}>
      {/* decoration layer */}
      {deco && deco.css ? (
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ color: accent, opacity: s.deco.opacity / 100, backgroundImage: deco.css, backgroundSize: deco.size ?? "auto" }} />
      ) : null}
      {/* EXEMPLAR watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <span className="select-none text-6xl font-bold tracking-widest text-slate-900/10 sm:text-7xl" style={{ transform: "rotate(-24deg)" }}>EXEMPLAR</span>
      </div>

      <div className={`relative z-[5] ${pad}`}>
        {/* title */}
        <div className={alignRight ? "text-right" : "text-left"}>
          <div className={`flex items-center gap-2 ${alignRight ? "justify-end" : "justify-start"}`}>
            <span className="font-bold" style={{ color: accent, fontFamily: fontStack[s.typo.titleFont], fontSize: 26 * sizeScale[s.typo.titleSize] }}>Conta</span>
            <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-60">Rascunho</span>
          </div>
          <p className="mt-0.5 text-sm font-semibold opacity-90">Documento provisório</p>
        </div>

        {/* parties */}
        {s.template.cardStyle ? (
          <div className="mt-5 grid grid-cols-3 gap-4 rounded-xl bg-black/[0.03] p-4 ring-1 ring-black/5">
            <div><p className="text-[9px] font-semibold uppercase tracking-wide opacity-50">Emissor</p><p className="mt-1 font-semibold">{docData.sellerName}</p>{docData.sellerLines.map((line) => (<p className="opacity-60" key={line}>{line}</p>))}</div>
            <div><p className="text-[9px] font-semibold uppercase tracking-wide opacity-50">Destinatário</p>{docData.buyerLines.map((line) => (<p className="mt-1 opacity-70 first:mt-1" key={line}>{line}</p>))}</div>
            <div><p className="text-[9px] font-semibold uppercase tracking-wide opacity-50">Emissão</p><p className="mt-1 font-semibold">{docData.emission}</p><p className="mt-2 text-[9px] font-semibold uppercase tracking-wide opacity-50">Vencimento</p><p className="mt-1 font-semibold">{docData.due}</p></div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex justify-between gap-6">
              <div><p className="font-semibold">{docData.sellerName}</p>{docData.sellerLines.map((line) => (<p className="opacity-60" key={line}>{line}</p>))}</div>
              <div className="text-right opacity-70">{docData.buyerLines.map((line) => (<p key={line}>{line}</p>))}</div>
            </div>
            <div className="mt-3 space-y-0.5">
              <p><span className="font-semibold">Data de emissão</span> <span className="ml-4 tabular-nums">{docData.emission}</span></p>
              <p><span className="font-semibold">Data de vencimento</span> <span className="ml-4 tabular-nums">{docData.due}</span></p>
            </div>
          </>
        )}

        {/* items table */}
        <div className="mt-5 overflow-hidden" style={{ borderRadius: s.table.rounded, boxShadow: s.table.border ? "0 0 0 1px rgba(0,0,0,0.08)" : "none", fontFamily: fontStack[s.typo.tableFont], fontSize: 11 * sizeScale[s.typo.tableSize] }}>
          <div className="grid items-center gap-1 px-2 py-1.5 text-[10px] font-semibold" style={{ gridTemplateColumns: gridTemplate, background: s.table.coloredHeader ? accent : "#f1f5f9", color: s.table.coloredHeader ? "#fff" : "#475569" }}>
            {visibleCols.map((column) => (<span className={column.align === "right" ? "text-right" : ""} key={column.key}>{column.head}</span>))}
          </div>
          {docData.items.map((item, index) => (
            <div className={`grid items-center gap-1 px-2 tabular-nums ${s.template.dense ? "py-1.5" : "py-2.5"} ${s.table.striped && index % 2 ? "bg-black/[0.03]" : ""} ${s.table.border ? "border-t border-black/5" : ""}`} key={item.n} style={{ gridTemplateColumns: gridTemplate }}>
              {visibleCols.map((column) => (
                <span className={column.align === "right" ? "text-right" : ""} key={column.key}>
                  {column.key === "designacao" ? (
                    <>
                      {item.code ? <span className="block text-[9px] font-medium uppercase tracking-wide opacity-40">{item.code}</span> : null}
                      <span className="font-semibold">{item.desc}</span>
                      {item.sub ? <span className="block text-[10px] italic opacity-40">{item.sub}</span> : null}
                    </>
                  ) : (
                    column.cell(item)
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* conditions + totals */}
        <div className="mt-5 flex justify-between gap-8">
          <div className="max-w-[55%]">
            <p className="font-semibold">Condições de pagamento</p>
            <p className="mt-1"><span className="font-semibold">Prazo de pagamento</span> — 30 dias</p>
            <p><span className="font-semibold">Atraso no pagamento</span> — 3× a taxa legal</p>
            <p><span className="font-semibold">Métodos de pagamento</span> — Transferência</p>
          </div>
          <div className="w-52 shrink-0">
            <div className="flex items-center justify-between rounded-md px-3 py-2 text-white" style={{ background: accent }}>
              <span className="text-[11px] font-semibold">Total (sem IVA)</span>
              <span className="text-sm font-bold tabular-nums">{docData.total}</span>
            </div>
            <p className="mt-2 text-right text-[10px] opacity-50">IVA não aplicável, art. 293 B do CGI</p>
          </div>
        </div>

        {/* links + footer */}
        {s.links.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-black/5 pt-3 text-[11px]">
            {s.links.map((link, index) => (<span className="font-medium" key={index} style={{ color: accent }}>{link.label || link.url || "Link"}</span>))}
          </div>
        ) : null}
        {s.footer.branding ? (
          <p className="mt-6 text-center text-[10px] opacity-40">Gerado com Oracle</p>
        ) : null}
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
  const [showMorePalettes, setShowMorePalettes] = useState(false);

  const [colors, setColors] = useState<ColorsState>(BLUE);
  const [typo, setTypo] = useState<TypoState>({ titleFont: "Roboto", contentFont: "Roboto", tableFont: "Roboto", titleSize: "normal", contentSize: "normal", tableSize: "normal" });
  const [table, setTable] = useState<TableState>({ striped: false, border: true, coloredHeader: true, rounded: 8, cols: { numero: true, designacao: true, unidade: true, quantidade: true, precoUnit: true, semIva: true, comIva: true } });
  const [deco, setDeco] = useState({ id: "none", opacity: 15 });
  const [footer, setFooter] = useState({ branding: true });
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);

  const current = templates.find((template) => template.id === selected) ?? templates[0];
  const savedCurrent = templates.find((template) => template.id === savedTemplate) ?? templates[0];

  const previewStyle: PreviewStyle = { template: current, colors, typo, table, deco, footer, links };

  function pickTemplate(id: TemplateId) {
    setSelected(id);
    const base = templates.find((template) => template.id === id)?.base ?? BLUE;
    setColors(base);
  }

  function openEditor() {
    setSelected(savedTemplate);
    setColors(savedCurrent.base);
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
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="overflow-hidden rounded-xl ring-1 ring-black/5"><div className="mx-auto w-28 py-4"><MiniPreview template={savedCurrent} /></div></div>
          <div className="mt-3 flex items-center justify-between"><p className="font-medium text-ink">Tema padrão</p><span className="text-slate-400">···</span></div>
          <p className="mt-0.5 text-xs text-muted">{savedCurrent.name}</p>
          <Button className="mt-3 w-full" onClick={openEditor} type="button">Para modificar</Button>
        </div>

        <button className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-500" onClick={openEditor} type="button">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><svg fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="22"><path d="M12 5v14M5 12h14" /></svg></span>
          <span className="mt-3 text-sm font-medium">Novo tema</span>
        </button>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex bg-[#eef1f6]">
          {/* left rail */}
          <aside className="hidden w-52 shrink-0 flex-col border-r border-black/5 bg-white p-4 lg:flex">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Personalização</p>
            <nav className="mt-3 flex flex-col gap-0.5">
              {rail.map((item) => (
                <button className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${section === item.key ? "bg-[#0075EB]/10 text-[#0075EB]" : "text-slate-500 hover:bg-slate-100 hover:text-ink"}`} key={item.key} onClick={() => setSection(item.key)} type="button">
                  <span className="shrink-0">{railIcon(item.key)}</span>{item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* middle panel */}
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
                        <button className={`rounded-xl p-1.5 text-left transition ${isActive ? "bg-[#0075EB]/5 ring-2 ring-[#0075EB]" : "ring-1 ring-black/10 hover:ring-black/20"}`} key={template.id} onClick={() => pickTemplate(template.id)} type="button">
                          <div className="relative">
                            <MiniPreview template={template} />
                            {isActive ? (<span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0075EB] text-white shadow"><svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="12"><path d="M20 6 9 17l-5-5" /></svg></span>) : null}
                          </div>
                          <p className="mt-1.5 truncate px-0.5 text-xs font-medium text-slate-600">{template.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {section === "logotipo" ? (
                <>
                  <h2 className="text-lg font-semibold text-ink">Logotipo</h2>
                  <p className="mt-1 text-sm text-muted">Dê um aspecto profissional aos seus documentos.</p>
                  <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-8 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><svg fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="22"><rect height="18" rx="2" width="18" x="3" y="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg></span>
                    <button className="mt-3 text-sm font-semibold text-[#0075EB]" onClick={() => showToast("Importação de logo disponível em breve.", "info")} type="button">Clique para importar</button>
                    <p className="mt-1 text-xs text-muted">PNG, JPG, SVG até 5 MB</p>
                  </div>
                </>
              ) : null}

              {section === "cores" ? (
                <>
                  <h2 className="text-lg font-semibold text-ink">Cores</h2>
                  <p className="mt-1 text-sm text-muted">Personalize as cores dos seus documentos.</p>
                  <p className="mt-4 text-sm font-medium text-ink">Paleta</p>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {(showMorePalettes ? palettes : palettes.slice(0, 4)).map((palette) => {
                      const isActive = colors.primary === palette.primary && colors.background === palette.background && colors.text === palette.text;
                      return (
                        <button className={`overflow-hidden rounded-lg ring-1 transition ${isActive ? "ring-2 ring-[#0075EB]" : "ring-black/10 hover:ring-black/20"}`} key={palette.name} onClick={() => setColors({ primary: palette.primary, background: palette.background, text: palette.text })} title={palette.name} type="button">
                          <div className="flex h-9">
                            <span className="flex-1" style={{ background: palette.primary }} />
                            <span className="flex-1" style={{ background: palette.background }} />
                            <span className="flex-1" style={{ background: palette.text }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button className="mt-2 flex w-full items-center justify-center gap-1 text-sm font-semibold text-[#0075EB]" onClick={() => setShowMorePalettes((value) => !value)} type="button">
                    {showMorePalettes ? "Menos paletes" : "Mais paletes"}
                    <svg className={showMorePalettes ? "rotate-180" : ""} fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  <ColorField hint="Aplicado a acentos e títulos em seus documentos." label="Cor principal" onChange={(v) => setColors((c) => ({ ...c, primary: v }))} value={colors.primary} />
                  <ColorField hint="Define o contexto dos seus documentos." label="Cor de fundo" onChange={(v) => setColors((c) => ({ ...c, background: v }))} value={colors.background} />
                  <ColorField hint="Aplicado a todo o conteúdo do texto principal." label="Cor do texto" onChange={(v) => setColors((c) => ({ ...c, text: v }))} value={colors.text} />
                </>
              ) : null}

              {section === "tipografia" ? (
                <>
                  <h2 className="text-lg font-semibold text-ink">Tipografia</h2>
                  <p className="mt-1 text-sm text-muted">Escolha as fontes para seus documentos.</p>
                  <div className="mt-4"><p className="text-sm font-medium text-ink">Título</p><FontSelect onChange={(v) => setTypo((t) => ({ ...t, titleFont: v }))} value={typo.titleFont} /><Segmented onChange={(v) => setTypo((t) => ({ ...t, titleSize: v }))} value={typo.titleSize} /></div>
                  <div className="mt-5"><p className="text-sm font-medium text-ink">Conteúdo</p><FontSelect onChange={(v) => setTypo((t) => ({ ...t, contentFont: v }))} value={typo.contentFont} /><Segmented onChange={(v) => setTypo((t) => ({ ...t, contentSize: v }))} value={typo.contentSize} /></div>
                  <div className="mt-5"><p className="text-sm font-medium text-ink">Tabela</p><FontSelect onChange={(v) => setTypo((t) => ({ ...t, tableFont: v }))} value={typo.tableFont} /><Segmented onChange={(v) => setTypo((t) => ({ ...t, tableSize: v }))} value={typo.tableSize} /></div>
                </>
              ) : null}

              {section === "pintura" ? (
                <>
                  <h2 className="text-lg font-semibold text-ink">Pintura</h2>
                  <p className="mt-1 text-sm text-muted">Personalize a aparência da sua tabela.</p>
                  {[
                    { key: "striped", label: "Linhas alternadas", hint: "Facilita a leitura da tabela." },
                    { key: "border", label: "Borda visível", hint: "Delimita as células da tabela." },
                    { key: "coloredHeader", label: "Cabeçalho colorido", hint: "Aplique a cor principal ao cabeçalho." }
                  ].map((option) => (
                    <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-black/10" key={option.key}>
                      <input checked={table[option.key as "striped" | "border" | "coloredHeader"]} className="mt-0.5 h-4 w-4 accent-[#0075EB]" onChange={(event) => setTable((t) => ({ ...t, [option.key]: event.target.checked }))} type="checkbox" />
                      <span><span className="block text-sm font-medium text-ink">{option.label}</span><span className="block text-xs text-muted">{option.hint}</span></span>
                    </label>
                  ))}
                  <div className="mt-5"><div className="flex items-center justify-between text-sm"><span className="font-medium text-ink">Arredondado</span><span className="tabular-nums text-muted">{table.rounded}px</span></div><input className="mt-2 w-full accent-[#0075EB]" max="20" min="0" onChange={(event) => setTable((t) => ({ ...t, rounded: Number(event.target.value) }))} type="range" value={table.rounded} /></div>
                  <p className="mt-5 text-sm font-medium text-ink">Colunas</p>
                  <div className="mt-2 space-y-1">
                    {columns.map((column) => (
                      <div className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5" key={column.key}>
                        <span className="text-sm text-slate-600">{column.label}</span>
                        <Toggle checked={table.cols[column.key]} onChange={(v) => setTable((t) => ({ ...t, cols: { ...t.cols, [column.key]: v } }))} />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {section === "decoracao" ? (
                <>
                  <h2 className="text-lg font-semibold text-ink">Decoração</h2>
                  <p className="mt-1 text-sm text-muted">Fundo decorativo do documento.</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {decorations.map((decoration) => {
                      const isActive = deco.id === decoration.id;
                      return (
                        <button className={`relative aspect-square overflow-hidden rounded-lg ring-1 transition ${isActive ? "ring-2 ring-[#0075EB]" : "ring-black/10 hover:ring-black/20"}`} key={decoration.id} onClick={() => setDeco((d) => ({ ...d, id: decoration.id }))} title={decoration.label} type="button">
                          {decoration.id === "none" ? (
                            <span className="flex h-full w-full items-center justify-center text-slate-300"><svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M18 6 6 18M6 6l12 12" /></svg></span>
                          ) : (
                            <span className="block h-full w-full text-[#0075EB]" style={{ backgroundImage: decoration.css, backgroundSize: decoration.size ?? "auto" }} />
                          )}
                          {isActive ? (<span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0075EB] text-white"><svg fill="none" height="10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="10"><path d="M20 6 9 17l-5-5" /></svg></span>) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5"><div className="flex items-center justify-between text-sm"><span className="font-medium text-ink">Opacidade</span><span className="tabular-nums text-muted">{deco.opacity}%</span></div><input className="mt-2 w-full accent-[#0075EB]" max="60" min="0" onChange={(event) => setDeco((d) => ({ ...d, opacity: Number(event.target.value) }))} type="range" value={deco.opacity} /></div>
                </>
              ) : null}

              {section === "rodapes" ? (
                <>
                  <h2 className="text-lg font-semibold text-ink">Rodapés</h2>
                  <p className="mt-1 text-sm text-muted">Personalize o rodapé dos documentos.</p>
                  <p className="mt-4 text-sm font-medium text-ink">Logo do rodapé</p>
                  <div className="mt-2 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-6 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="18"><rect height="18" rx="2" width="18" x="3" y="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg></span>
                    <button className="mt-2 text-sm font-semibold text-[#0075EB]" onClick={() => showToast("Upload de logo do rodapé em breve.", "info")} type="button">Adicionar logo</button>
                  </div>
                  <label className="mt-4 flex items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-black/10">
                    <span><span className="block text-sm font-medium text-ink">Mostrar “Gerado com Oracle”</span><span className="block text-xs text-muted">Exibe a assinatura no rodapé.</span></span>
                    <Toggle checked={footer.branding} onChange={(v) => setFooter({ branding: v })} />
                  </label>
                </>
              ) : null}

              {section === "espacamento" ? (
                <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-muted ring-1 ring-black/5"><p className="font-medium text-ink">Espaçamento</p><p className="mt-1">Ajustes de espaçamento disponíveis em breve.</p></div>
              ) : null}

              {section === "link" ? (
                <>
                  <h2 className="text-lg font-semibold text-ink">Link</h2>
                  <p className="mt-1 text-sm text-muted">Adicione links ao rodapé do documento.</p>
                  {links.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center">
                      <p className="text-sm text-muted">Nenhum link adicionado.</p>
                      <button className="mt-2 text-sm font-semibold text-[#0075EB]" onClick={() => setLinks([{ label: "", url: "" }])} type="button">+ Adicionar um link</button>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {links.map((link, index) => (
                        <div className="rounded-xl p-3 ring-1 ring-black/10" key={index}>
                          <Input onChange={(event) => setLinks((list) => list.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))} placeholder="Rótulo (ex: Site)" value={link.label} />
                          <Input className="mt-2" onChange={(event) => setLinks((list) => list.map((item, i) => (i === index ? { ...item, url: event.target.value } : item)))} placeholder="https://…" value={link.url} />
                          <button className="mt-2 text-xs font-semibold text-rose-600" onClick={() => setLinks((list) => list.filter((_, i) => i !== index))} type="button">Remover</button>
                        </div>
                      ))}
                      <button className="text-sm font-semibold text-[#0075EB]" onClick={() => setLinks((list) => [...list, { label: "", url: "" }])} type="button">+ Adicionar um link</button>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2 border-t border-black/5 p-3">
              <Button onClick={() => setEditorOpen(false)} type="button" variant="secondary">← Voltar</Button>
              <Button className="flex-1" onClick={save} type="button">Salvar</Button>
            </div>
          </div>

          {/* preview */}
          <div className="relative flex-1 overflow-y-auto">
            <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
              <Button onClick={() => showToast("Novo tema em branco disponível em breve.", "info")} type="button" variant="secondary">+ Novo tema</Button>
              <button aria-label="Fechar" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={() => setEditorOpen(false)} type="button">
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-4 pb-10 pt-20 sm:px-8"><PreviewDoc s={previewStyle} /></div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
