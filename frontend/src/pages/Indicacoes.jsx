import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import SectionCard from "../components/SectionCard";

export default function Indicacoes() {
  const [indicacoes, setIndicacoes] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [campanhaForm, setCampanhaForm] = useState({ status: "ATIVA", sem_fim: true, recompensa_aluno_tipo: "DESCONTO_MENSALIDADE", recompensa_aluno_valor: 0, recompensa_colaborador_tipo: "VALOR_FIXO", recompensa_colaborador_valor: 0 });
  const [linkForm, setLinkForm] = useState({ indicador_tipo: "ALUNO" });
  const [linkGerado, setLinkGerado] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setCampanhaField(field, value) { setCampanhaForm((old) => ({ ...old, [field]: value })); }
  function setLinkField(field, value) { setLinkForm((old) => ({ ...old, [field]: value })); }

  async function load() {
    try {
      setError("");
      const [indicacoesResp, campanhasResp, filiaisResp, alunosResp, colaboradoresResp] = await Promise.all([
        api("/operacional/indicacoes"), api("/academy/indicacoes/campanhas"), api("/filiais/"), api("/alunos/"), api("/operacional/colaboradores?status=ATIVO"),
      ]);
      setIndicacoes(indicacoesResp); setCampanhas(campanhasResp); setFiliais(filiaisResp); setAlunos(alunosResp); setColaboradores(colaboradoresResp);
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

  async function gerarLink(e) {
    e.preventDefault();
    try {
      const campanhaId = linkForm.campanha_id;
      const indicadorId = linkForm.indicador_tipo === "ALUNO" ? linkForm.aluno_id : linkForm.colaborador_id;
      const resp = await api(`/academy/indicacoes/link/${campanhaId}`, { method: "POST", body: JSON.stringify({ indicador_tipo: linkForm.indicador_tipo, indicador_id: indicadorId }) });
      setLinkGerado(`${window.location.origin}${resp.link}`);
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, []);

  return <section><div className="page-title"><h1>Indicações</h1><p>Cadastre indicações manualmente ou gere campanhas com links próprios por aluno/colaborador.</p></div>{error && <div className="alert">{error}</div>}{success && <div className="success">{success}</div>}
    <div className="grid-two">
      <form className="student-form" onSubmit={salvarCampanha}><SectionCard title="Nova campanha"><div className="student-grid two"><Input label="Nome" value={campanhaForm.nome} onChange={(v) => setCampanhaField("nome", v)} required /><Input label="Slug do link" value={campanhaForm.slug} onChange={(v) => setCampanhaField("slug", v.toLowerCase().replace(/\s+/g, "-"))} required /><Select label="Filial" value={campanhaForm.filial_id} onChange={(v) => setCampanhaField("filial_id", v)} options={filiais.map((f) => ({ value: f.id, label: f.nome }))} /><Select label="Status" value={campanhaForm.status} onChange={(v) => setCampanhaField("status", v)} options={["ATIVA", "INATIVA", "ENCERRADA"].map((x) => ({ value: x, label: x }))} /><Input label="Início" type="date" value={campanhaForm.inicio} onChange={(v) => setCampanhaField("inicio", v)} /><Input label="Fim" type="date" value={campanhaForm.fim} onChange={(v) => setCampanhaField("fim", v)} /><label><span>Sem fim</span><input type="checkbox" checked={Boolean(campanhaForm.sem_fim)} onChange={(e) => setCampanhaField("sem_fim", e.target.checked)} /></label><Input label="Desconto aluno" type="number" value={campanhaForm.recompensa_aluno_valor} onChange={(v) => setCampanhaField("recompensa_aluno_valor", v)} /><Input label="Valor colaborador" type="number" value={campanhaForm.recompensa_colaborador_valor} onChange={(v) => setCampanhaField("recompensa_colaborador_valor", v)} /></div><button type="submit">Criar campanha</button></SectionCard></form>
      <form className="student-form" onSubmit={gerarLink}><SectionCard title="Gerar link de indicação"><div className="student-grid two"><Select label="Campanha" value={linkForm.campanha_id} onChange={(v) => setLinkField("campanha_id", v)} options={campanhas.map((c) => ({ value: c.id, label: c.nome }))} /><Select label="Indicador" value={linkForm.indicador_tipo} onChange={(v) => setLinkField("indicador_tipo", v)} options={["ALUNO", "COLABORADOR"].map((x) => ({ value: x, label: x }))} />{linkForm.indicador_tipo === "ALUNO" ? <Select label="Aluno" value={linkForm.aluno_id} onChange={(v) => setLinkField("aluno_id", v)} options={alunos.map((a) => ({ value: a.id, label: a.nome }))} /> : <Select label="Colaborador" value={linkForm.colaborador_id} onChange={(v) => setLinkField("colaborador_id", v)} options={colaboradores.map((c) => ({ value: c.id, label: c.nome }))} />}</div><button type="submit">Gerar link</button>{linkGerado && <div className="info-box"><strong>Link:</strong><input value={linkGerado} readOnly onFocus={(e) => e.target.select()} /></div>}</SectionCard></form>
    </div>
    <SectionCard title="Campanhas"><DataTable rows={campanhas} columns={[{key:"nome", label:"Nome"},{key:"slug", label:"Slug"},{key:"status", label:"Status"},{key:"sem_fim", label:"Sem fim", render:(r)=>r.sem_fim ? "Sim" : "Não"},{key:"fim", label:"Fim"}]} /></SectionCard>
    <SectionCard title="Todas as indicações"><DataTable rows={indicacoes} columns={[{key:"indicado_nome", label:"Indicado"},{key:"origem", label:"Origem"},{key:"indicador_tipo", label:"Tipo"},{key:"indicador_nome", label:"Indicador"},{key:"status", label:"Status"},{key:"recompensa_valor", label:"Recompensa", render:(r)=>`R$ ${Number(r.recompensa_valor||0).toFixed(2)}`}]} /></SectionCard>
  </section>;
}

function Input({ label, value, onChange, type = "text", required = false }) { return <label><span>{label}</span><input required={required} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>; }
function Select({ label, value, onChange, options }) { return <label><span>{label}</span><select value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }
