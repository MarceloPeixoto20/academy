import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import SectionCard from "../components/SectionCard";

const dias = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"];

export default function ModalidadesGrade() {
  const [grade, setGrade] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [form, setForm] = useState({ dia_semana: "SEGUNDA", status: "ATIVO", remuneracao_tipo: "POR_SESSAO", remuneracao_valor: 0 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const grouped = useMemo(() => dias.reduce((acc, dia) => ({ ...acc, [dia]: grade.filter((item) => item.dia_semana === dia) }), {}), [grade]);

  function setField(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  async function load() {
    try {
      setError("");
      const [gradeResp, filiaisResp, modalidadesResp, colaboradoresResp] = await Promise.all([
        api("/operacional/modalidades/grade"),
        api("/filiais/"),
        api("/operacional/modalidades"),
        api("/operacional/colaboradores?status=ATIVO"),
      ]);
      setGrade(gradeResp);
      setFiliais(filiaisResp);
      setModalidades(modalidadesResp);
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
      await api("/operacional/modalidade-horarios", { method: "POST", body: JSON.stringify(form) });
      setForm({ dia_semana: "SEGUNDA", status: "ATIVO", remuneracao_tipo: "POR_SESSAO", remuneracao_valor: 0 });
      setSuccess("Horário cadastrado na grade.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section>
      <div className="page-title"><h1>Grade de modalidades</h1><p>Agenda semanal das modalidades, professores e remuneração por sessão.</p></div>
      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form className="student-form" onSubmit={save}>
        <SectionCard title="Cadastrar horário" description="Cada sessão pode ter professor/colaborador e regra de remuneração própria.">
          <div className="student-grid four">
            <Select label="Filial" value={form.filial_id} onChange={(v) => setField("filial_id", v)} required options={filiais.map((f) => ({ value: f.id, label: f.nome }))} />
            <Select label="Modalidade" value={form.modalidade_id} onChange={(v) => setField("modalidade_id", v)} required options={modalidades.map((m) => ({ value: m.id, label: m.nome }))} />
            <Select label="Colaborador" value={form.colaborador_id} onChange={(v) => setField("colaborador_id", v)} options={colaboradores.map((c) => ({ value: c.id, label: c.nome }))} />
            <Select label="Dia" value={form.dia_semana} onChange={(v) => setField("dia_semana", v)} options={dias.map((d) => ({ value: d, label: d }))} />
            <Input label="Início" type="time" value={form.hora_inicio} onChange={(v) => setField("hora_inicio", v)} required />
            <Input label="Fim" type="time" value={form.hora_fim} onChange={(v) => setField("hora_fim", v)} required />
            <Input label="Sala" value={form.sala} onChange={(v) => setField("sala", v)} />
            <Input label="Capacidade" type="number" value={form.capacidade} onChange={(v) => setField("capacidade", v)} />
            <Select label="Remuneração" value={form.remuneracao_tipo} onChange={(v) => setField("remuneracao_tipo", v)} options={["POR_SESSAO", "POR_HORA", "PERCENTUAL", "FIXO_MENSAL"].map((x) => ({ value: x, label: x }))} />
            <Input label="Valor" type="number" value={form.remuneracao_valor} onChange={(v) => setField("remuneracao_valor", v)} />
          </div>
          <button type="submit">Salvar horário</button>
        </SectionCard>
      </form>

      <div className="schedule-grid">
        {dias.map((dia) => <div className="schedule-day" key={dia}><h3>{dia}</h3>{(grouped[dia] || []).map((item) => <div className="schedule-card" key={item.id}><strong>{item.hora_inicio} - {item.hora_fim}</strong><span>{item.modalidade_nome}</span><small>{item.colaborador_nome || "Sem colaborador"} • R$ {Number(item.remuneracao_valor || 0).toFixed(2)} / {item.remuneracao_tipo}</small></div>)}</div>)}
      </div>
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) {
  return <label><span>{label}</span><input required={required} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}
function Select({ label, value, onChange, options, required = false }) {
  return <label><span>{label}</span><select required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
