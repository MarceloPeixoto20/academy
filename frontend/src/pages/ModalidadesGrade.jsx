import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import MaskedInput from "../components/MaskedInput";
import SectionCard from "../components/SectionCard";

const dias = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"];
const horas = Array.from({ length: 17 }, (_, index) => `${String(index + 5).padStart(2, "0")}:00`);

export default function ModalidadesGrade() {
  const [grade, setGrade] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ dia_semana: "SEGUNDA", status: "ATIVO", remuneracao_tipo: "POR_SESSAO", remuneracao_valor: 0 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const grouped = useMemo(() => dias.reduce((acc, dia) => ({ ...acc, [dia]: grade.filter((item) => item.dia_semana === dia) }), {}), [grade]);

  function setField(field, value) { setForm((old) => ({ ...old, [field]: value })); }
  function openModal(dia = "SEGUNDA", hora = "06:00") { setForm({ dia_semana: dia, hora_inicio: hora, status: "ATIVO", remuneracao_tipo: "POR_SESSAO", remuneracao_valor: 0 }); setShowModal(true); }

  async function load() {
    try {
      setError("");
      const [gradeResp, filiaisResp, modalidadesResp, colaboradoresResp] = await Promise.all([
        api("/operacional/modalidades/grade"), api("/filiais/"), api("/operacional/modalidades"), api("/operacional/colaboradores?status=ATIVO"),
      ]);
      setGrade(gradeResp); setFiliais(filiaisResp); setModalidades(modalidadesResp); setColaboradores(colaboradoresResp);
    } catch (err) { setError(err.message); }
  }

  async function save(e) {
    e.preventDefault();
    try {
      setError(""); setSuccess("");
      await api("/operacional/modalidade-horarios", { method: "POST", body: JSON.stringify(form) });
      setShowModal(false); setSuccess("Horário cadastrado na grade."); await load();
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, []);

  return (
    <section>
      <div className="page-title row"><div><h1>Grade de modalidades</h1><p>Calendário semanal das modalidades, professores e remuneração por sessão.</p></div><button onClick={() => openModal()}>Cadastrar horário</button></div>
      {error && <div className="alert">{error}</div>}{success && <div className="success">{success}</div>}

      {showModal && <div className="modal-backdrop"><div className="modal-card large-modal"><form className="student-form" onSubmit={save}><SectionCard title="Cadastrar horário" description="Cada sessão pode ter professor/colaborador e regra de remuneração própria."><div className="student-grid four"><Select label="Filial" value={form.filial_id} onChange={(v) => setField("filial_id", v)} required options={filiais.map((f) => ({ value: f.id, label: f.nome }))} /><Select label="Modalidade" value={form.modalidade_id} onChange={(v) => setField("modalidade_id", v)} required options={modalidades.map((m) => ({ value: m.id, label: m.nome }))} /><Select label="Colaborador" value={form.colaborador_id} onChange={(v) => setField("colaborador_id", v)} options={colaboradores.map((c) => ({ value: c.id, label: c.nome }))} /><Select label="Dia" value={form.dia_semana} onChange={(v) => setField("dia_semana", v)} options={dias.map((d) => ({ value: d, label: d }))} /><Input label="Início" type="time" value={form.hora_inicio} onChange={(v) => setField("hora_inicio", v)} required /><Input label="Fim" type="time" value={form.hora_fim} onChange={(v) => setField("hora_fim", v)} required /><Input label="Sala" value={form.sala} onChange={(v) => setField("sala", v)} /><Input label="Capacidade" type="number" value={form.capacidade} onChange={(v) => setField("capacidade", v)} /><Select label="Remuneração" value={form.remuneracao_tipo} onChange={(v) => setField("remuneracao_tipo", v)} options={["POR_SESSAO", "POR_HORA", "PERCENTUAL", "FIXO_MENSAL"].map((x) => ({ value: x, label: x }))} /><Input label="Valor" type="number" value={form.remuneracao_valor} onChange={(v) => setField("remuneracao_valor", v)} /></div><div className="form-actions"><button type="submit">Salvar horário</button><button type="button" className="ghost" onClick={() => setShowModal(false)}>Cancelar</button></div></SectionCard></form></div></div>}

      <div className="calendar-grid"><div className="calendar-corner">Hora</div>{dias.map((dia) => <div className="calendar-head" key={dia}>{dia}</div>)}{horas.map((hora) => <CalendarRow key={hora} hora={hora} grouped={grouped} openModal={openModal} />)}</div>
    </section>
  );
}

function CalendarRow({ hora, grouped, openModal }) {
  return <><div className="calendar-time">{hora}</div>{dias.map((dia) => { const events = (grouped[dia] || []).filter((item) => String(item.hora_inicio || "").startsWith(hora.slice(0, 2))); return <div className="calendar-cell" key={`${dia}-${hora}`} onDoubleClick={() => openModal(dia, hora)}>{events.map((item) => <div className="calendar-event" key={item.id}><strong>{item.hora_inicio} - {item.hora_fim}</strong><span>{item.modalidade_nome}</span><small>{item.colaborador_nome || "Sem colaborador"}</small></div>)}</div>; })}</>;
}

function Input({ label, value, onChange, type = "text", required = false }) { return <MaskedInput name={label} label={label} value={value} onChange={onChange} type={type} required={required} />; }
function Select({ label, value, onChange, options, required = false }) { return <label><span>{label}</span><select required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }
