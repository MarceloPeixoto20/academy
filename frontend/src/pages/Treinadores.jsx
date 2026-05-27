import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import PermissionGate from "../components/PermissionGate";
import SectionCard from "../components/SectionCard";

const emptyForm = { status: "ATIVO", filiais: [] };

export default function Treinadores() {
  const [rows, setRows] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const columns = [
    { key: "nome", label: "Nome" },
    { key: "cpf", label: "Documento" },
    { key: "telefone", label: "Telefone" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "cref", label: "CREF" },
    { key: "especialidade", label: "Especialidade" },
    { key: "status", label: "Status" },
  ];

  function setField(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  function toggleFilial(filialId) {
    setForm((old) => {
      const selected = new Set(old.filiais || []);
      selected.has(filialId) ? selected.delete(filialId) : selected.add(filialId);
      return { ...old, filiais: Array.from(selected) };
    });
  }

  async function load() {
    try {
      setError("");
      const query = busca ? `?q=${encodeURIComponent(busca)}` : "";
      const [treinadoresResp, filiaisResp] = await Promise.all([
        api(`/treinadores/${query}`),
        api("/filiais/"),
      ]);
      setRows(treinadoresResp);
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
      await api("/treinadores/", { method: "POST", body: JSON.stringify(form) });
      setForm({ status: "ATIVO", filiais: [] });
      setShowForm(false);
      setSuccess("Treinador cadastrado com sucesso.");
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
          <h1>Treinadores</h1>
          <p>Cadastro completo, separado por dados, contato, endereço e informações profissionais.</p>
        </div>
        <PermissionGate permission="treinadores.criar">
          <button onClick={() => setShowForm(!showForm)}>{showForm ? "Fechar" : "Novo treinador"}</button>
        </PermissionGate>
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <form className="student-form" onSubmit={salvar}>
          <SectionCard title="Dados pessoais" description="Informações principais do treinador.">
            <div className="student-grid four">
              <Input label="Nome" value={form.nome} onChange={(v) => setField("nome", v)} required />
              <Input label="Documento" value={form.cpf} onChange={(v) => setField("cpf", v)} required />
              <Select label="Status" value={form.status} onChange={(v) => setField("status", v)} options={["ATIVO", "INATIVO"]} />
            </div>
          </SectionCard>

          <SectionCard title="Contato" description="Telefones e canais de comunicação.">
            <div className="student-grid three">
              <Input label="Telefone" value={form.telefone} onChange={(v) => setField("telefone", v)} />
              <Input label="WhatsApp" value={form.whatsapp} onChange={(v) => setField("whatsapp", v)} />
              <Input label="Email" type="email" value={form.email} onChange={(v) => setField("email", v)} />
            </div>
          </SectionCard>

          <SectionCard title="Endereço" description="Endereço do treinador.">
            <div className="student-grid four">
              <Input label="CEP" value={form.cep} onChange={(v) => setField("cep", v)} />
              <Input label="Endereço" value={form.endereco} onChange={(v) => setField("endereco", v)} className="span-2" />
              <Input label="Número" value={form.numero} onChange={(v) => setField("numero", v)} />
              <Input label="Complemento" value={form.complemento} onChange={(v) => setField("complemento", v)} />
              <Input label="Bairro" value={form.bairro} onChange={(v) => setField("bairro", v)} />
              <Input label="Cidade" value={form.cidade} onChange={(v) => setField("cidade", v)} />
              <Input label="UF" value={form.uf} onChange={(v) => setField("uf", v)} />
            </div>
          </SectionCard>

          <SectionCard title="Dados profissionais" description="CREF, especialidade e filiais vinculadas.">
            <div className="student-grid three">
              <Input label="CREF" value={form.cref} onChange={(v) => setField("cref", v)} />
              <Input label="Especialidade" value={form.especialidade} onChange={(v) => setField("especialidade", v)} className="span-2" />
            </div>

            <div className="checkbox-group">
              <strong>Filiais vinculadas</strong>
              <div className="checkbox-grid">
                {filiais.map((filial) => (
                  <label key={filial.id} className="check-row">
                    <input type="checkbox" checked={(form.filiais || []).includes(filial.id)} onChange={() => toggleFilial(filial.id)} />
                    <span>{filial.nome}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="full-label">
              <span>Observações</span>
              <textarea value={form.observacoes || ""} onChange={(e) => setField("observacoes", e.target.value)} />
            </label>
          </SectionCard>

          <div className="form-actions">
            <button type="submit">Salvar treinador</button>
            <button type="button" className="ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <input placeholder="Buscar por nome ou documento" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") load(); }} />
        <button className="ghost" onClick={load}>Buscar</button>
      </div>

      <DataTable rows={rows} columns={columns} />
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = false, className = "" }) {
  return <label className={className}><span>{label}</span><input required={required} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label><span>{label}</span><select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}
