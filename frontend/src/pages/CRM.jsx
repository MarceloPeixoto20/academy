import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import SectionCard from "../components/SectionCard";

const etapas = ["NOVO", "CONTATO", "AGENDADO", "NEGOCIACAO", "GANHO", "PERDIDO"];

export default function CRM() {
  const [dashboard, setDashboard] = useState({ por_etapa: {} });
  const [board, setBoard] = useState({});
  const [filiais, setFiliais] = useState([]);
  const [form, setForm] = useState({ etapa: "NOVO", temperatura: "MORNO", probabilidade: 0, valor_previsto: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const oportunidades = useMemo(() => Object.values(board).flat(), [board]);

  function setField(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  function nova() {
    setEditingId(null);
    setForm({ etapa: "NOVO", temperatura: "MORNO", probabilidade: 0, valor_previsto: 0 });
    setShowForm(true);
  }

  function editar(row) {
    setEditingId(row.id);
    setForm({ ...row });
    setShowForm(true);
  }

  async function load() {
    try {
      setError("");
      const [dashboardResp, boardResp, filiaisResp] = await Promise.all([
        api("/operacional/crm/dashboard"),
        api("/operacional/crm/kanban"),
        api("/filiais/"),
      ]);
      setDashboard(dashboardResp);
      setBoard(boardResp);
      setFiliais(filiaisResp);
    } catch (err) {
      setError(err.message);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      const endpoint = "/operacional/crm/oportunidades";
      if (editingId) await api(`${endpoint}/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
      else await api(endpoint, { method: "POST", body: JSON.stringify(form) });
      setSuccess(editingId ? "Oportunidade atualizada." : "Oportunidade cadastrada.");
      setEditingId(null);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function mover(row, etapa) {
    try {
      await api(`/operacional/crm/oportunidades/${row.id}`, { method: "PUT", body: JSON.stringify({ ...row, etapa }) });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section>
      <div className="page-title row"><div><h1>CRM</h1><p>Oportunidades, pipeline comercial, Kanban e dashboard do funil.</p></div><button onClick={nova}>Nova oportunidade</button></div>
      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="cards crm-cards">
        <div className="card"><span>Oportunidades</span><strong>{dashboard.total || 0}</strong></div>
        <div className="card"><span>Valor aberto</span><strong>R$ {Number(dashboard.valor_aberto || 0).toFixed(2)}</strong></div>
        <div className="card"><span>Ganhas</span><strong>{dashboard.ganhos || 0}</strong></div>
        <div className="card"><span>Perdidas</span><strong>{dashboard.perdidos || 0}</strong></div>
      </div>

      {showForm && <form className="student-form" onSubmit={salvar}><SectionCard title={editingId ? "Editar oportunidade" : "Nova oportunidade"}><div className="student-grid four">
        <Select label="Filial" value={form.filial_id} onChange={(v) => setField("filial_id", v)} options={filiais.map((f) => ({ value: f.id, label: f.nome }))} />
        <Input label="Nome" value={form.nome} onChange={(v) => setField("nome", v)} required />
        <Input label="Telefone" value={form.telefone} onChange={(v) => setField("telefone", v)} />
        <Input label="Email" type="email" value={form.email} onChange={(v) => setField("email", v)} />
        <Input label="Origem" value={form.origem} onChange={(v) => setField("origem", v)} />
        <Select label="Etapa" value={form.etapa} onChange={(v) => setField("etapa", v)} options={etapas.map((x) => ({ value: x, label: x }))} />
        <Select label="Temperatura" value={form.temperatura} onChange={(v) => setField("temperatura", v)} options={["FRIO", "MORNO", "QUENTE"].map((x) => ({ value: x, label: x }))} />
        <Input label="Valor previsto" type="number" value={form.valor_previsto} onChange={(v) => setField("valor_previsto", v)} />
        <Input label="Probabilidade %" type="number" value={form.probabilidade} onChange={(v) => setField("probabilidade", v)} />
        <Input label="Próximo contato" type="date" value={form.proximo_contato} onChange={(v) => setField("proximo_contato", v)} />
        <label className="span-2"><span>Observações</span><textarea value={form.observacoes || ""} onChange={(e) => setField("observacoes", e.target.value)} /></label>
      </div><div className="form-actions"><button type="submit">Salvar</button><button type="button" className="ghost" onClick={() => setShowForm(false)}>Cancelar</button></div></SectionCard></form>}

      <div className="kanban-board">
        {etapas.map((etapa) => <div className="kanban-column" key={etapa}><h3>{etapa} <small>{board[etapa]?.length || 0}</small></h3>{(board[etapa] || []).map((item) => <div className="kanban-card" key={item.id}><strong>{item.nome}</strong><span>{item.telefone || item.email || "Sem contato"}</span><small>{item.origem || "Sem origem"} • R$ {Number(item.valor_previsto || 0).toFixed(2)}</small><button className="small-button ghost" onClick={() => editar(item)}>Editar</button><select value={item.etapa} onChange={(e) => mover(item, e.target.value)}>{etapas.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>)}</div>)}
      </div>

      <SectionCard title="Lista completa"><DataTable rows={oportunidades} columns={[{ key: "nome", label: "Nome" }, { key: "telefone", label: "Telefone" }, { key: "origem", label: "Origem" }, { key: "etapa", label: "Etapa" }, { key: "valor_previsto", label: "Valor", render: (r) => `R$ ${Number(r.valor_previsto || 0).toFixed(2)}` }]} /></SectionCard>
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) {
  return <label><span>{label}</span><input required={required} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}
function Select({ label, value, onChange, options }) {
  return <label><span>{label}</span><select value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
