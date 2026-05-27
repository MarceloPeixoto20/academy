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

const novaLinhaExercicio = () => ({
  exercicio_id: "",
  grupo_treino: "",
  dia_semana: "",
  ordem: "",
  series: "",
  repeticoes: "",
  carga: "",
  descanso_segundos: "",
  observacoes: "",
});

const novoForm = () => ({ status: "ATIVO", nivel: "INICIANTE", exercicios: [novaLinhaExercicio()] });

export default function Treinos() {
  const [rows, setRows] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [treinadores, setTreinadores] = useState([]);
  const [exercicios, setExercicios] = useState([]);
  const [form, setForm] = useState(novoForm());
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const treinadorOptions = useMemo(() => treinadores.map((t) => ({
    value: t.id,
    label: t.nome,
    description: [t.cpf, t.cref, t.especialidade].filter(Boolean).join(" • "),
  })), [treinadores]);

  const columns = [
    { key: "nome", label: "Treino" },
    { key: "objetivo", label: "Objetivo" },
    { key: "nivel", label: "Nível" },
    { key: "treinador_nome", label: "Treinador" },
    { key: "qtd_exercicios", label: "Exercícios" },
    { key: "status", label: "Status" },
  ];

  function setField(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  function setExerciseField(index, field, value) {
    setForm((old) => ({
      ...old,
      exercicios: (old.exercicios || []).map((item, currentIndex) => currentIndex === index ? { ...item, [field]: value } : item),
    }));
  }

  function addExerciseLine() {
    setForm((old) => ({ ...old, exercicios: [...(old.exercicios || []), novaLinhaExercicio()] }));
  }

  function removeExerciseLine(index) {
    setForm((old) => ({ ...old, exercicios: (old.exercicios || []).filter((_, currentIndex) => currentIndex !== index) }));
  }

  async function load() {
    try {
      setError("");
      const query = busca ? `?q=${encodeURIComponent(busca)}` : "";
      const [treinosResp, filiaisResp, treinadoresResp, exerciciosResp] = await Promise.all([
        api(`/treinos/${query}`),
        api("/filiais/"),
        api("/treinadores/?q="),
        api("/exercicios/"),
      ]);
      setRows(treinosResp);
      setFiliais(filiaisResp);
      setTreinadores(treinadoresResp);
      setExercicios(exerciciosResp);
    } catch (err) {
      setError(err.message);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await api("/treinos/", {
        method: "POST",
        body: JSON.stringify({ ...form, exercicios: (form.exercicios || []).filter((item) => item.exercicio_id) }),
      });
      setForm(novoForm());
      setShowForm(false);
      setSuccess("Treino cadastrado com sucesso.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section>
      <div className="page-title row">
        <div>
          <h1>Treinos</h1>
          <p>Cadastre primeiro o treino-base e seus exercícios. Depois, aloque no aluno.</p>
        </div>
        <PermissionGate permission="treinos.criar">
          <button onClick={() => setShowForm(!showForm)}>{showForm ? "Fechar" : "Novo treino"}</button>
        </PermissionGate>
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <form className="student-form" onSubmit={salvar}>
          <SectionCard title="Dados do treino" description="Informações gerais do treino-base.">
            <div className="student-grid four">
              <Select label="Filial" value={form.filial_id} onChange={(v) => setField("filial_id", v)} required options={filiais.map((f) => ({ value: f.id, label: f.nome }))} />
              <Input label="Nome do treino" value={form.nome} onChange={(v) => setField("nome", v)} required />
              <Input label="Objetivo" value={form.objetivo} onChange={(v) => setField("objetivo", v)} />
              <Select label="Nível" value={form.nivel} onChange={(v) => setField("nivel", v)} options={[{ value: "INICIANTE", label: "Iniciante" }, { value: "INTERMEDIARIO", label: "Intermediário" }, { value: "AVANCADO", label: "Avançado" }]} />
              <SearchableSelect label="Treinador padrão" value={form.treinador_id} onChange={(v) => setField("treinador_id", v)} options={treinadorOptions} placeholder="Digite nome, documento ou CREF" className="span-2" />
              <Select label="Status" value={form.status} onChange={(v) => setField("status", v)} options={[{ value: "ATIVO", label: "ATIVO" }, { value: "INATIVO", label: "INATIVO" }, { value: "FINALIZADO", label: "FINALIZADO" }]} />
            </div>
            <label className="full-label"><span>Observações</span><textarea value={form.observacoes || ""} onChange={(e) => setField("observacoes", e.target.value)} /></label>
          </SectionCard>

          <SectionCard title="Exercícios do treino" description="Monte a sequência de exercícios do treino-base.">
            <div className="exercise-list">
              {(form.exercicios || []).map((item, index) => (
                <div className="exercise-row" key={index}>
                  <div className="student-grid four">
                    <Select label="Exercício" value={item.exercicio_id} onChange={(v) => setExerciseField(index, "exercicio_id", v)} options={exercicios.map((e) => ({ value: e.id, label: e.nome }))} className="span-2" />
                    <Input label="Grupo" value={item.grupo_treino} onChange={(v) => setExerciseField(index, "grupo_treino", v)} placeholder="A, B, C..." />
                    <Select label="Dia sugerido" value={item.dia_semana} onChange={(v) => setExerciseField(index, "dia_semana", v)} options={diasSemana} />
                    <Input label="Ordem" type="number" value={item.ordem} onChange={(v) => setExerciseField(index, "ordem", v)} />
                    <Input label="Séries" type="number" value={item.series} onChange={(v) => setExerciseField(index, "series", v)} />
                    <Input label="Repetições" value={item.repeticoes} onChange={(v) => setExerciseField(index, "repeticoes", v)} />
                    <Input label="Carga" value={item.carga} onChange={(v) => setExerciseField(index, "carga", v)} />
                    <Input label="Descanso seg." type="number" value={item.descanso_segundos} onChange={(v) => setExerciseField(index, "descanso_segundos", v)} />
                    <Input label="Observação" value={item.observacoes} onChange={(v) => setExerciseField(index, "observacoes", v)} className="span-2" />
                  </div>
                  <button type="button" className="ghost small-button" onClick={() => removeExerciseLine(index)}>Remover exercício</button>
                </div>
              ))}
            </div>
            <button type="button" className="ghost" onClick={addExerciseLine}>Adicionar exercício</button>
          </SectionCard>

          <div className="form-actions">
            <button type="submit">Salvar treino-base</button>
            <button type="button" className="ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <input placeholder="Buscar treino por nome ou objetivo" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") load(); }} />
        <button className="ghost" onClick={load}>Buscar</button>
      </div>

      <DataTable rows={rows} columns={columns} />
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = false, className = "", placeholder = "" }) {
  return <label className={className}><span>{label}</span><input required={required} type={type} placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options, className = "", required = false }) {
  return <label className={className}><span>{label}</span><select required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
