import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import PermissionGate from "../components/PermissionGate";
import SectionCard from "../components/SectionCard";

const dias = [
  { value: "SEGUNDA", label: "Segunda" },
  { value: "TERCA", label: "Terça" },
  { value: "QUARTA", label: "Quarta" },
  { value: "QUINTA", label: "Quinta" },
  { value: "SEXTA", label: "Sexta" },
  { value: "SABADO", label: "Sábado" },
  { value: "DOMINGO", label: "Domingo" },
];

const configs = {
  colaboradores: {
    title: "Colaboradores",
    description: "Funcionários, prestadores e terceiros. Base para contas a pagar e remuneração futura.",
    endpoint: "/operacional/colaboradores",
    initial: { status: "ATIVO", tipo: "FUNCIONARIO", forma_remuneracao: "FIXO", valor_base: 0 },
    columns: ["nome", "cargo", "tipo", "forma_remuneracao", "valor_base", "status"],
    fields: [
      ["filial_id", "Filial", "filial"], ["nome", "Nome", "text", true], ["cpf", "Documento"], ["cargo", "Cargo"],
      ["telefone", "Telefone"], ["whatsapp", "WhatsApp"], ["email", "Email", "email"],
      ["tipo", "Tipo", "select:FUNCIONARIO,PRESTADOR,TERCEIRO"],
      ["forma_remuneracao", "Remuneração", "select:FIXO,COMISSAO,POR_SESSAO,POR_HORA"],
      ["valor_base", "Valor base", "number"], ["status", "Status", "select:ATIVO,INATIVO,AFASTADO"],
      ["data_admissao", "Admissão", "date"], ["observacoes", "Observações", "textarea"],
    ],
  },
  horarios: {
    title: "Horários de funcionamento",
    description: "Horários por filial. Por enquanto é apenas cadastro, sem bloqueios automáticos.",
    endpoint: "/operacional/horarios-funcionamento",
    initial: { abre: true, dia_semana: "SEGUNDA" },
    columns: ["filial_nome", "dia_semana", "abre", "hora_abertura", "hora_fechamento"],
    fields: [["filial_id", "Filial", "filial", true], ["dia_semana", "Dia", "dias"], ["abre", "Abre", "checkbox"], ["hora_abertura", "Abertura", "time"], ["hora_fechamento", "Fechamento", "time"], ["observacoes", "Observações", "textarea"]],
  },
  modalidades: {
    title: "Modalidades",
    description: "Cadastre as modalidades antes de montar a grade de horários.",
    endpoint: "/operacional/modalidades",
    initial: { status: "ATIVA" },
    columns: ["nome", "filial_nome", "capacidade_padrao", "status"],
    fields: [["filial_id", "Filial", "filial"], ["nome", "Nome", "text", true], ["descricao", "Descrição", "textarea"], ["capacidade_padrao", "Capacidade padrão", "number"], ["status", "Status", "select:ATIVA,INATIVA"]],
  },
  indicacoes: {
    title: "Indicações e gamificação",
    description: "Alunos ganham desconto e colaboradores podem receber valor por indicações convertidas.",
    endpoint: "/operacional/indicacoes",
    initial: { indicador_tipo: "ALUNO", status: "PENDENTE", recompensa_tipo: "DESCONTO_MENSALIDADE", recompensa_valor: 0 },
    columns: ["indicado_nome", "indicador_tipo", "indicador_nome", "status", "recompensa_tipo", "recompensa_valor"],
    fields: [["filial_id", "Filial", "filial"], ["indicador_tipo", "Tipo indicador", "select:ALUNO,COLABORADOR"], ["aluno_indicador_id", "Aluno indicador", "aluno"], ["colaborador_indicador_id", "Colaborador indicador", "colaborador"], ["indicado_nome", "Nome indicado", "text", true], ["indicado_contato", "Contato indicado"], ["indicado_email", "Email indicado", "email"], ["status", "Status", "select:PENDENTE,CONVERTIDA,RECOMPENSADA,CANCELADA"], ["recompensa_tipo", "Tipo recompensa", "select:DESCONTO_MENSALIDADE,VALOR_FIXO,OUTRO"], ["recompensa_valor", "Valor recompensa", "number"], ["competencia_desconto", "Competência desconto"], ["observacoes", "Observações", "textarea"]],
  },
};

export default function OperacionalPage({ type }) {
  const config = configs[type];
  const [rows, setRows] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [form, setForm] = useState(config.initial || {});
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const columns = useMemo(() => [...config.columns.map((key) => ({ key, label: key })), { key: "acao", label: "Ação", render: (row) => <button className="small-button ghost" onClick={() => edit(row)}>Editar</button> }], [config]);

  function setField(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  function novo() {
    setEditingId(null);
    setForm(config.initial || {});
    setShowForm(true);
  }

  function edit(row) {
    setEditingId(row.id);
    setForm({ ...(config.initial || {}), ...row });
    setShowForm(true);
  }

  async function load() {
    try {
      setError("");
      const [rowsResp, filiaisResp, alunosResp, colaboradoresResp] = await Promise.all([
        api(config.endpoint), api("/filiais/"), api("/alunos/"), api("/operacional/colaboradores"),
      ]);
      setRows(rowsResp);
      setFiliais(filiaisResp);
      setAlunos(alunosResp);
      setColaboradores(colaboradoresResp);
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      if (editingId) await api(`${config.endpoint}/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
      else await api(config.endpoint, { method: "POST", body: JSON.stringify(form) });
      setSuccess(editingId ? "Cadastro atualizado." : "Cadastro realizado.");
      setEditingId(null);
      setForm(config.initial || {});
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [type]);

  return (
    <section>
      <div className="page-title row"><div><h1>{config.title}</h1><p>{config.description}</p></div><PermissionGate permission="operacional.editar"><button onClick={novo}>Novo cadastro</button></PermissionGate></div>
      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}
      {showForm && <form className="student-form" onSubmit={save}><SectionCard title={editingId ? "Editar cadastro" : "Novo cadastro"}><div className="student-grid four">{config.fields.map(([name, label, kind = "text", required = false]) => <Field key={name} name={name} label={label} kind={kind} value={form[name]} required={required} setField={setField} filiais={filiais} alunos={alunos} colaboradores={colaboradores} />)}</div><div className="form-actions"><button type="submit">Salvar</button><button type="button" className="ghost" onClick={() => setShowForm(false)}>Cancelar</button></div></SectionCard></form>}
      <DataTable rows={rows} columns={columns} />
    </section>
  );
}

function Field({ name, label, kind, value, required, setField, filiais, alunos, colaboradores }) {
  const common = { required, value: value ?? "", onChange: (e) => setField(name, e.target.type === "checkbox" ? e.target.checked : e.target.value) };
  if (kind === "textarea") return <label className="span-2"><span>{label}</span><textarea value={value || ""} onChange={(e) => setField(name, e.target.value)} /></label>;
  if (kind === "checkbox") return <label><span>{label}</span><input type="checkbox" checked={Boolean(value)} onChange={(e) => setField(name, e.target.checked)} /></label>;
  if (kind === "filial") return <Select label={label} value={value} required={required} onChange={(v) => setField(name, v)} options={filiais.map((f) => ({ value: f.id, label: f.nome }))} />;
  if (kind === "aluno") return <Select label={label} value={value} onChange={(v) => setField(name, v)} options={alunos.map((a) => ({ value: a.id, label: a.nome }))} />;
  if (kind === "colaborador") return <Select label={label} value={value} onChange={(v) => setField(name, v)} options={colaboradores.map((c) => ({ value: c.id, label: c.nome }))} />;
  if (kind === "dias") return <Select label={label} value={value} onChange={(v) => setField(name, v)} options={dias} />;
  if (kind.startsWith("select:")) return <Select label={label} value={value} onChange={(v) => setField(name, v)} options={kind.replace("select:", "").split(",").map((x) => ({ value: x, label: x }))} />;
  return <label><span>{label}</span><input type={kind} {...common} /></label>;
}

function Select({ label, value, onChange, options, required = false }) {
  return <label><span>{label}</span><select required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
