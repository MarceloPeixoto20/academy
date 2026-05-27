import { useEffect, useState } from "react";
import { api } from "../api/client";
import FormBuilder from "../components/FormBuilder";
import DataTable from "../components/DataTable";

export default function Medidas() {
  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState("");
  const [medidas, setMedidas] = useState([]);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  async function loadAlunos() {
    try { setAlunos(await api("/alunos/")); } catch (err) { setError(err.message); }
  }

  async function loadMedidas(id = alunoId) {
    if (!id) return;
    try { setMedidas(await api(`/alunos/${id}/medidas`)); } catch (err) { setError(err.message); }
  }

  async function save(e) {
    e.preventDefault();
    try {
      await api(`/alunos/${alunoId}/medidas`, { method:"POST", body:JSON.stringify(form) });
      setForm({});
      await loadMedidas();
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { loadAlunos(); }, []);

  const fields = [
    { name:"data_avaliacao", label:"Data", type:"date" },
    { name:"peso_kg", label:"Peso kg", type:"number" },
    { name:"altura_cm", label:"Altura cm", type:"number" },
    { name:"cintura_cm", label:"Cintura cm", type:"number" },
    { name:"abdomen_cm", label:"Abdomen cm", type:"number" },
    { name:"quadril_cm", label:"Quadril cm", type:"number" },
    { name:"braco_direito_cm", label:"Braço direito", type:"number" },
    { name:"braco_esquerdo_cm", label:"Braço esquerdo", type:"number" },
    { name:"coxa_direita_cm", label:"Coxa direita", type:"number" },
    { name:"coxa_esquerda_cm", label:"Coxa esquerda", type:"number" },
    { name:"percentual_gordura", label:"% gordura", type:"number" },
    { name:"massa_muscular_kg", label:"Massa muscular kg", type:"number" },
    { name:"objetivo", label:"Objetivo" },
    { name:"observacoes", label:"Observações", type:"textarea" }
  ];

  return (
    <section>
      <div className="page-title"><h1>Medidas do aluno</h1><p>Avaliação física com histórico por data.</p></div>
      {error && <div className="alert">{error}</div>}

      <div className="toolbar">
        <select value={alunoId} onChange={(e) => { setAlunoId(e.target.value); loadMedidas(e.target.value); }}>
          <option value="">Selecione o aluno</option>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome} - {a.cpf}</option>)}
        </select>
      </div>

      {alunoId && (
        <form className="table-card form-card" onSubmit={save}>
          <FormBuilder fields={fields} form={form} setForm={setForm} />
          <button>Salvar medida</button>
        </form>
      )}

      <DataTable rows={medidas} columns={[
        {key:"data_avaliacao", label:"Data"},
        {key:"peso_kg", label:"Peso"},
        {key:"altura_cm", label:"Altura"},
        {key:"imc", label:"IMC"},
        {key:"percentual_gordura", label:"% gordura"},
        {key:"massa_muscular_kg", label:"Massa muscular"}
      ]} />
    </section>
  );
}
