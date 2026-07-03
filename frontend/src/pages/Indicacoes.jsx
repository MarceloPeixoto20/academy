import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import SectionCard from "../components/SectionCard";

export default function Indicacoes() {
  const [activeTab, setActiveTab] = useState("indicacoes");
  const [showManualForm, setShowManualForm] = useState(false);
  const [indicacoes, setIndicacoes] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [manualForm, setManualForm] = useState({ indicador_tipo: "ALUNO", status: "PENDENTE", recompensa_tipo: "DESCONTO_MENSALIDADE", recompensa_valor: 0 });
  const [campanhaForm, setCampanhaForm] = useState({ status: "ATIVA", sem_fim: true, recompensa_aluno_tipo: "DESCONTO_MENSALIDADE", recompensa_aluno_valor: 0, recompensa_colaborador_tipo: "VALOR_FIXO", recompensa_colaborador_valor: 0 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setCampanhaField(field, value) { setCampanhaForm((old) => ({ ...old, [field]: value })); }
  function setManualField(field, value) { setManualForm((old) => ({ ...old, [field]: value })); }

  async function load() {
    try {
      setError("");
      const [indicacoesResp, campanhasResp, filiaisResp, alunosResp, colaboradoresResp] = await Promise.all([
        api("/academy/public/referrals/indicacoes"), api("/academy/indicacoes/campanhas"), api("/filiais/"), api("/alunos/"), api("/operacional/colaboradores?status=ATIVO"),
      ]);
      setIndicacoes(indicacoesResp);
      setCampanhas(campanhasResp);
      setFiliais(filiaisResp);
      setAlunos(alunosResp);
      setColaboradores(colaboradoresResp);
    } catch (err) { setError(err.message); }
  }

  async function salvarCampanha(e) {
    e.preventDefault();
    try {
      setError(""); setSuccess("");
      await api("/academy/indicacoes/campanhas", { method: "POST", body: JSON.stringify(campanhaForm) });
      setSuccess("Campanha criada.");
      setCampanhaForm({ status: "ATIVA", sem_fim: true, recompensa_aluno_tipo: "DESCONTO_MENSALIDADE", recompensa_aluno_valor: 0, recompensa_colaborador_tipo: "VALOR_FIXO", recompensa_colaborador_valor: 0 });
      await load();
    } catch (err) { setError(err.message); }
  }

  async function salvarManual(e) {
    e.preventDefault();
    try {
      setError(""); setSuccess("");
      await api("/operacional/indicacoes", { method: "POST", body: JSON.stringify(manualForm) });
      setSuccess("Indicação manual cadastrada.");
      setManualForm({ indicador_tipo: "ALUNO", status: "PENDENTE", recompensa_tipo: "DESCONTO_MENSALIDADE", recompensa_valor: 0 });
      setShowManualForm(false);
      await load();
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, []);

  return <section>
    <div className="page-title row"><div><h1>Indicações</h1><p>Indicações manuais e campanhas de indicação. O link individual fica na ficha de cada aluno.</p></div>{activeTab === "indicacoes" && <button onClick={() => setShowManualForm(true)}>Cadastrar indicação manual</button>}</div>
    {error && <div className="alert">{error}</div>}{success && <div className="success">{success}</div>}

    <div className="tabs clean-tabs"><button className={activeTab === "indicacoes" ? "tab active" : "tab"} onClick={() => setActiveTab("indicacoes")}>Indicações</button><button className={activeTab === "campanhas" ? "tab active" : "tab"} onClick={() => setActiveTab("campanhas")}>Campanhas</button></div>

    {showManualForm && <div className="modal-backdrop"><div className="modal-card"><form className="student-form" onSubmit={salvarManual}><SectionCard title="Cadastrar indicação manual"><div className="student-grid two"><Select label="Filial" value={manualForm.filial_id} onChange={(v) => setManualField("filial_id", v)} options={filiais.map((f) => ({ value: f.id, label: f.nome }))} /><Select label="Tipo indicador" value={manualForm.indicador_tipo} onChange={(v) => setManualField("indicador_tipo", v)} options={["ALUNO", "COLABORADOR"].map((x) => ({ value: x, label: x }))} />{manualForm.indicador_tipo === "ALUNO" ? <Select label="Aluno indicador" value={manualForm.aluno_indicador_id} onChange={(v) => setManualField("aluno_indicador_id", v)} options={alunos.map((a) => ({ value: a.id, label: a.nome }))} /> : <Select label="Colaborador indicador" value={manualForm.colaborador_indicador_id} onChange={(v) => setManualField("colaborador_indicador_id", v)} options={colaboradores.map((c) => ({ value: c.id, label: c.nome }))} />}<Input label="Nome indicado" value={manualForm.indicado_nome} onChange={(v) => setManualField("indicado_nome", v)} required /><Input label="Contato indicado" value={manualForm.indicado_contato} onChange={(v) => setManualField("indicado_contato", v)} /><Input label="Email indicado" type="email" value={manualForm.indicado_email} onChange={(v) => setManualField("indicado_email", v)} /><Select label="Status" value={manualForm.status} onChange={(v) => setManualField("status", v)} options={["PENDENTE", "CONVERTIDA", "RECOMPENSADA", "CANCELADA"].map((x) => ({ value: x, label: x }))} /><Input label="Valor recompensa" type="number" value={manualForm.recompensa_valor} onChange={(v) => setManualField("recompensa_valor", v)} /></div><div className="form-actions"><button type="submit">Salvar indicação</button><button type="button" className="ghost" onClick={() => setShowManualForm(false)}>Cancelar</button></div></SectionCard></form></div></div>}

    {activeTab === "indicacoes" && <SectionCard title="Indicações cadastradas"><DataTable rows={indicacoes} columns={[{key:"indicado_nome", label:"Indicado"},{key:"origem", label:"Origem"},{key:"campanha_nome", label:"Campanha"},{key:"indicador_tipo", label:"Tipo"},{key:"indicador_nome", label:"Indicador"},{key:"status", label:"Status"},{key:"recompensa_valor", label:"Recompensa", render:(r)=>`R$ ${Number(r.recompensa_valor||0).toFixed(2)}`}]} /></SectionCard>}

    {activeTab === "campanhas" && <div className="stacked-page"><form className="student-form" onSubmit={salvarCampanha}><SectionCard title="Nova campanha de indicação"><div className="student-grid four"><Input label="Nome" value={campanhaForm.nome} onChange={(v) => setCampanhaField("nome", v)} required /><Input label="Slug" value={campanhaForm.slug} onChange={(v) => setCampanhaField("slug", v.toLowerCase().replace(/\s+/g, "-"))} required /><Select label="Filial" value={campanhaForm.filial_id} onChange={(v) => setCampanhaField("filial_id", v)} options={filiais.map((f) => ({ value: f.id, label: f.nome }))} /><Select label="Status" value={campanhaForm.status} onChange={(v) => setCampanhaField("status", v)} options={["ATIVA", "INATIVA", "ENCERRADA"].map((x) => ({ value: x, label: x }))} /><Input label="Início" type="date" value={campanhaForm.inicio} onChange={(v) => setCampanhaField("inicio", v)} /><Input label="Fim" type="date" value={campanhaForm.fim} onChange={(v) => setCampanhaField("fim", v)} /><label><span>Sem fim</span><input type="checkbox" checked={Boolean(campanhaForm.sem_fim)} onChange={(e) => setCampanhaField("sem_fim", e.target.checked)} /></label><Input label="Desconto aluno" type="number" value={campanhaForm.recompensa_aluno_valor} onChange={(v) => setCampanhaField("recompensa_aluno_valor", v)} /><Input label="Valor colaborador" type="number" value={campanhaForm.recompensa_colaborador_valor} onChange={(v) => setCampanhaField("recompensa_colaborador_valor", v)} /></div><button type="submit">Criar campanha</button></SectionCard></form><SectionCard title="Campanhas cadastradas"><DataTable rows={campanhas} columns={[{key:"nome", label:"Nome"},{key:"slug", label:"Slug"},{key:"status", label:"Status"},{key:"sem_fim", label:"Sem fim", render:(r)=>r.sem_fim ? "Sim" : "Não"},{key:"inicio", label:"Início"},{key:"fim", label:"Fim"}]} /></SectionCard></div>}
  </section>;
}

function Input({ label, value, onChange, type = "text", required = false }) { return <label><span>{label}</span><input required={required} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>; }
function Select({ label, value, onChange, options }) { return <label><span>{label}</span><select value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }
