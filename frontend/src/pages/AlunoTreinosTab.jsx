import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import PermissionGate from "../components/PermissionGate";
import SearchableSelect from "../components/SearchableSelect";
import SectionCard from "../components/SectionCard";

const diasSemana = [
  { value: "SEGUNDA", label: "Segunda-feira" },
  { value: "TERCA", label: "Terça-feira" },
  { value: "QUARTA", label: "Quarta-feira" },
  { value: "QUINTA", label: "Quinta-feira" },
  { value: "SEXTA", label: "Sexta-feira" },
  { value: "SABADO", label: "Sábado" },
  { value: "DOMINGO", label: "Domingo" },
];

const novoForm = () => ({ status: "ATIVO", dia_semana: "SEGUNDA" });

export default function AlunoTreinosTab({ alunoId }) {
  const [treinosBase, setTreinosBase] = useState([]);
  const [treinosAluno, setTreinosAluno] = useState([]);
  const [treinadores, setTreinadores] = useState([]);
  const [form, setForm] = useState(novoForm());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const treinadorOptions = useMemo(() => treinadores.map((t) => ({
    value: t.id,
    label: t.nome,
    description: [t.cref, t.especialidade].filter(Boolean).join(" • "),
  })), [treinadores]);

  function setField(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  async function load() {
    try {
      setError("");
      const [baseResp, alunoResp, treinadoresResp] = await Promise.all([
        api("/treinos/?status=ATIVO"),
        api(`/treinos/aluno/${alunoId}`),
        api("/treinadores/?q="),
      ]);
      setTreinosBase(baseResp);
      setTreinosAluno(alunoResp);
      setTreinadores(treinadoresResp);
    } catch (err) {
      setError(err.message);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await api(`/treinos/aluno/${alunoId}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(novoForm());
      setSuccess("Treino alocado ao aluno com sucesso.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remover(row) {
    try {
      setError("");
      setSuccess("");
      await api(`/treinos/aluno/${alunoId}/${row.id}`, { method: "DELETE" });
      setSuccess("Treino removido do aluno.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [alunoId]);

  return (
    <div>
      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form className="student-form" onSubmit={salvar}>
        <SectionCard title="Alocar treino ao aluno" description="Escolha um treino-base já cadastrado e defina o dia da semana.">
          <div className="student-grid four">
            <Select
              label="Treino-base"
              value={form.treino_id}
              onChange={(v) => setField("treino_id", v)}
              options={treinosBase.map((t) => ({ value: t.id, label: `${t.nome}${t.objetivo ? ` - ${t.objetivo}` : ""}` }))}
              required
              className="span-2"
            />
            <Select label="Dia da semana" value={form.dia_semana} onChange={(v) => setField("dia_semana", v)} options={diasSemana} required />
            <SearchableSelect label="Treinador" value={form.treinador_id} onChange={(v) => setField("treinador_id", v)} options={treinadorOptions} placeholder="Digite o nome ou CREF" />
            <Input label="Data início" type="date" value={form.data_inicio} onChange={(v) => setField("data_inicio", v)} />
            <Select label="Status" value={form.status} onChange={(v) => setField("status", v)} options={[{ value: "ATIVO", label: "ATIVO" }, { value: "INATIVO", label: "INATIVO" }, { value: "FINALIZADO", label: "FINALIZADO" }]} />
          </div>

          <label className="full-label">
            <span>Observações</span>
            <textarea value={form.observacoes || ""} onChange={(e) => setField("observacoes", e.target.value)} />
          </label>

          <PermissionGate permission="treinos.criar">
            <button type="submit">Alocar treino</button>
          </PermissionGate>
        </SectionCard>
      </form>

      {treinosAluno.length === 0 ? (
        <SectionCard title="Treinos do aluno">
          <div className="empty-state">Nenhum treino alocado para este aluno.</div>
        </SectionCard>
      ) : (
        <DataTable rows={treinosAluno} columns={[
          { key: "treino_nome", label: "Treino" },
          { key: "dia_semana", label: "Dia" },
          { key: "treinador_nome", label: "Treinador" },
          { key: "nivel", label: "Nível" },
          { key: "status", label: "Status" },
          { key: "data_inicio", label: "Início" },
          { key: "acao", label: "Ação", render: (r) => r.status === "ATIVO" ? <PermissionGate permission="treinos.editar"><button className="small-button ghost" onClick={() => remover(r)}>Remover</button></PermissionGate> : "Inativo" },
        ]} />
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", className = "" }) {
  return <label className={className}><span>{label}</span><input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options, className = "", required = false }) {
  return <label className={className}><span>{label}</span><select required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
