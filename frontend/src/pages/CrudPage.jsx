import { useEffect, useState } from "react";
import { api } from "../api/client";
import PermissionGate from "../components/PermissionGate";
import FormBuilder from "../components/FormBuilder";
import DataTable from "../components/DataTable";
import SectionCard from "../components/SectionCard";

export default function CrudPage({ config }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(config.initial || {});
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      setError("");
      setRows(await api(config.endpoint));
    } catch (err) {
      setError(err.message);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(config.initial || {});
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({ ...(config.initial || {}), ...row });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function cancelForm() {
    setEditingId(null);
    setForm(config.initial || {});
    setShowForm(false);
  }

  async function save(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");

      if (editingId && !config.upsertOnly) {
        await api(`${config.endpoint}${editingId}`, { method: "PUT", body: JSON.stringify(form) });
        setSuccess(`${config.title} atualizado com sucesso.`);
      } else {
        await api(config.endpoint, { method: "POST", body: JSON.stringify(form) });
        setSuccess(`${config.title} salvo com sucesso.`);
      }

      cancelForm();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [config.endpoint]);

  const columns = [
    ...config.columns.map((key) => ({ key, label: key })),
    {
      key: "acao",
      label: "Ação",
      render: (row) => (
        <PermissionGate permission={config.editPermission || config.createPermission}>
          <button className="small-button ghost" onClick={() => startEdit(row)}>Editar</button>
        </PermissionGate>
      ),
    },
  ];

  return (
    <section>
      <div className="page-title row">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description || "Cadastro, edição e listagem do módulo."}</p>
        </div>
        <PermissionGate permission={config.createPermission}>
          <button onClick={startCreate}>Novo cadastro</button>
        </PermissionGate>
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <form className="student-form" onSubmit={save}>
          <SectionCard title={editingId ? `Editar ${config.title}` : `Novo ${config.title}`} description="Preencha os dados do cadastro.">
            <FormBuilder fields={config.fields} form={form} setForm={setForm} />
            <div className="form-actions">
              <PermissionGate permission={editingId ? (config.editPermission || config.createPermission) : config.createPermission}>
                <button type="submit">{editingId ? "Salvar alterações" : "Cadastrar"}</button>
              </PermissionGate>
              <button type="button" className="ghost" onClick={cancelForm}>Cancelar</button>
            </div>
          </SectionCard>
        </form>
      )}

      <DataTable columns={columns} rows={rows} />
    </section>
  );
}
