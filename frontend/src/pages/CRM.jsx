import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import SectionCard from "../components/SectionCard";

const camposObrigatorios = ["telefone", "email", "valor_previsto", "proximo_contato", "perda_motivo"];

export default function CRM() {
  const [activeTab, setActiveTab] = useState("resumo");
  const [dashboard, setDashboard] = useState({ por_etapa: {} });
  const [board, setBoard] = useState({});
  const [etapas, setEtapas] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [form, setForm] = useState({ etapa: "NOVO", temperatura: "MORNO", probabilidade: 0, valor_previsto: 0 });
  const [etapaForm, setEtapaForm] = useState({ status: "ATIVO", ordem: 1, probabilidade_padrao: 0, campos_obrigatorios: [] });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dragged, setDragged] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const oportunidades = useMemo(() => Object.values(board).flat(), [board]);
  const ultimasOportunidades = useMemo(() => oportunidades.slice(0, 10), [oportunidades]);

  function setField(field, value) { setForm((old) => ({ ...old, [field]: value })); }
  function setEtapaField(field, value) { setEtapaForm((old) => ({ ...old, [field]: value })); }

  function nova() {
    setEditingId(null);
    const primeiraEtapa = etapas[0]?.codigo || "NOVO";
    setForm({ etapa: primeiraEtapa, temperatura: "MORNO", probabilidade: 0, valor_previsto: 0 });
    setShowForm(true);
  }

  function editar(row) { setEditingId(row.id); setForm({ ...row }); setShowForm(true); }

  async function load() {
    try {
      setError("");
      const [dashboardResp, boardResp, filiaisResp, etapasResp] = await Promise.all([
        api("/operacional/crm/dashboard"), api("/operacional/crm/kanban"), api("/filiais/"), api("/academy/crm/etapas"),
      ]);
      setDashboard(dashboardResp); setBoard(boardResp); setFiliais(filiaisResp); setEtapas(etapasResp.filter((e) => e.status === "ATIVO"));
    } catch (err) { setError(err.message); }
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      setError(""); setSuccess("");
      const endpoint = "/operacional/crm/oportunidades";
      if (editingId) await api(`${endpoint}/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
      else await api(endpoint, { method: "POST", body: JSON.stringify(form) });
      setSuccess(editingId ? "Oportunidade atualizada." : "Oportunidade cadastrada.");
      setEditingId(null); setShowForm(false); await load();
    } catch (err) { setError(err.message); }
  }

  async function salvarEtapa(e) {
    e.preventDefault();
    try {
      setError(""); setSuccess("");
      await api("/academy/crm/etapas", { method: "POST", body: JSON.stringify(etapaForm) });
      setEtapaForm({ status: "ATIVO", ordem: 1, probabilidade_padrao: 0, campos_obrigatorios: [] });
      setSuccess("Etapa criada."); await load();
    } catch (err) { setError(err.message); }
  }

  async function mover(row, etapa) {
    try {
      setError("");
      await api(`/academy/crm/oportunidades/${row.id}/mover`, { method: "POST", body: JSON.stringify({ etapa_id: etapa.id }) });
      await load();
    } catch (err) { setError(err.missing ? `Preencha antes: ${err.missing.join(", ")}` : err.message); }
  }

  function toggleCampo(field) {
    setEtapaForm((old) => {
      const set = new Set(old.campos_obrigatorios || []);
      set.has(field) ? set.delete(field) : set.add(field);
      return { ...old, campos_obrigatorios: Array.from(set) };
    });
  }

  useEffect(() => { load(); }, []);

  return (
    <section>
      <div className="page-title row"><div><h1>CRM</h1><p>Dashboard comercial, últimas oportunidades, Kanban e configuração de etapas.</p></div><div className="row-actions"><button onClick={nova}>Nova oportunidade</button></div></div>
      {error && <div className="alert">{error}</div>}{success && <div className="success">{success}</div>}
      <div className="tabs clean-tabs"><button className={activeTab === "resumo" ? "tab active" : "tab"} onClick={() => setActiveTab("resumo")}>Dashboard e lista</button><button className={activeTab === "kanban" ? "tab active" : "tab"} onClick={() => setActiveTab("kanban")}>Kanban</button><button className={activeTab === "etapas" ? "tab active" : "tab"} onClick={() => setActiveTab("etapas")}>Configurar etapas</button></div>

      {showForm && <div className="modal-backdrop"><div className="modal-card large-modal"><form className="student-form" onSubmit={salvar}><SectionCard title={editingId ? "Editar oportunidade" : "Nova oportunidade"}><div className="student-grid four"><Select label="Filial" value={form.filial_id} onChange={(v) => setField("filial_id", v)} options={filiais.map((f) => ({ value: f.id, label: f.nome }))} /><Input label="Nome" value={form.nome} onChange={(v) => setField("nome", v)} required /><Input label="Telefone" value={form.telefone} onChange={(v) => setField("telefone", v)} /><Input label="Email" type="email" value={form.email} onChange={(v) => setField("email", v)} /><Input label="Origem" value={form.origem} onChange={(v) => setField("origem", v)} /><Select label="Etapa" value={form.etapa} onChange={(v) => setField("etapa", v)} options={etapas.map((x) => ({ value: x.codigo, label: x.nome }))} /><Select label="Temperatura" value={form.temperatura} onChange={(v) => setField("temperatura", v)} options={["FRIO", "MORNO", "QUENTE"].map((x) => ({ value: x, label: x }))} /><Input label="Valor previsto" type="number" value={form.valor_previsto} onChange={(v) => setField("valor_previsto", v)} /><Input label="Probabilidade %" type="number" value={form.probabilidade} onChange={(v) => setField("probabilidade", v)} /><Input label="Próximo contato" type="date" value={form.proximo_contato} onChange={(v) => setField("proximo_contato", v)} /><Input label="Motivo perda" value={form.perda_motivo} onChange={(v) => setField("perda_motivo", v)} /><label className="span-2"><span>Observações</span><textarea value={form.observacoes || ""} onChange={(e) => setField("observacoes", e.target.value)} /></label></div><div className="form-actions"><button type="submit">Salvar</button><button type="button" className="ghost" onClick={() => setShowForm(false)}>Cancelar</button></div></SectionCard></form></div></div>}

      {activeTab === "resumo" && <><div className="kpi-grid crm-cards"><div className="flow-card"><span>Oportunidades</span><strong>{dashboard.total || 0}</strong></div><div className="flow-card"><span>Valor aberto</span><strong>R$ {Number(dashboard.valor_aberto || 0).toFixed(2)}</strong></div><div className="flow-card"><span>Ganhas</span><strong>{dashboard.ganhos || 0}</strong></div><div className="flow-card"><span>Perdidas</span><strong>{dashboard.perdidos || 0}</strong></div></div><SectionCard title="Últimas oportunidades cadastradas"><DataTable rows={ultimasOportunidades} columns={[{ key: "nome", label: "Nome" }, { key: "telefone", label: "Telefone" }, { key: "origem", label: "Origem" }, { key: "etapa", label: "Etapa" }, { key: "valor_previsto", label: "Valor", render: (r) => `R$ ${Number(r.valor_previsto || 0).toFixed(2)}` }, { key: "acao", label: "Ação", render: (r) => <button className="small-button ghost" onClick={() => editar(r)}>Editar</button> }]} /></SectionCard></>}

      {activeTab === "kanban" && <div className="kanban-board">{etapas.map((etapa) => <div className="kanban-column" key={etapa.id} onDragOver={(e) => e.preventDefault()} onDrop={() => dragged && mover(dragged, etapa)}><h3>{etapa.nome} <small>{board[etapa.codigo]?.length || 0}</small></h3>{(board[etapa.codigo] || []).map((item) => <div className="kanban-card" key={item.id} draggable onDragStart={() => setDragged(item)}><strong>{item.nome}</strong><span>{item.telefone || item.email || "Sem contato"}</span><small>{item.origem || "Sem origem"} • R$ {Number(item.valor_previsto || 0).toFixed(2)}</small><button className="small-button ghost" onClick={() => editar(item)}>Editar</button><select value={item.etapa} onChange={(e) => mover(item, etapas.find((etapaItem) => etapaItem.codigo === e.target.value))}>{etapas.map((x) => <option key={x.id} value={x.codigo}>{x.nome}</option>)}</select></div>)}</div>)}</div>}

      {activeTab === "etapas" && <form className="student-form" onSubmit={salvarEtapa}><SectionCard title="Configurar etapas do CRM" description="Sugestão padrão: Novo Lead → Tentativa de Contato → Visita/Aula Experimental → Proposta/Negociação → Ganho/Perdido."><div className="student-grid four"><Input label="Nome" value={etapaForm.nome} onChange={(v) => setEtapaField("nome", v)} required /><Input label="Código" value={etapaForm.codigo} onChange={(v) => setEtapaField("codigo", v.toUpperCase().replace(/\s+/g, "_"))} required /><Input label="Ordem" type="number" value={etapaForm.ordem} onChange={(v) => setEtapaField("ordem", v)} /><Input label="Probabilidade padrão" type="number" value={etapaForm.probabilidade_padrao} onChange={(v) => setEtapaField("probabilidade_padrao", v)} /></div><div className="checkbox-grid">{camposObrigatorios.map((campo) => <label className="check-row" key={campo}><input type="checkbox" checked={(etapaForm.campos_obrigatorios || []).includes(campo)} onChange={() => toggleCampo(campo)} /> <span>Exigir {campo}</span></label>)}</div><button type="submit">Criar etapa</button><DataTable rows={etapas} columns={[{key:"nome", label:"Etapa"},{key:"codigo", label:"Código"},{key:"ordem", label:"Ordem"},{key:"campos_obrigatorios", label:"Campos obrigatórios", render:(r)=>(r.campos_obrigatorios || []).join(", ")}]} /></SectionCard></form>}
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) { return <label><span>{label}</span><input required={required} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>; }
function Select({ label, value, onChange, options }) { return <label><span>{label}</span><select value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }
