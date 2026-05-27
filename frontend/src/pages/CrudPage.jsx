import { useEffect, useState } from "react";
import { api } from "../api/client";
import PermissionGate from "../components/PermissionGate";
import FormBuilder from "../components/FormBuilder";
import DataTable from "../components/DataTable";

export default function CrudPage({ config }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(config.initial || {});
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      setRows(await api(config.endpoint));
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      setError("");
      await api(config.endpoint, { method: "POST", body: JSON.stringify(form) });
      setForm(config.initial || {});
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [config.endpoint]);

  const columns = config.columns.map((key) => ({ key, label: key }));

  return (
    <section>
      <div className="page-title row">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description || "Cadastro e listagem do módulo."}</p>
        </div>
        <PermissionGate permission={config.createPermission}>
          <button onClick={() => setShowForm(!showForm)}>{showForm ? "Fechar" : "Novo cadastro"}</button>
        </PermissionGate>
      </div>

      {error && <div className="alert">{error}</div>}

      {showForm && (
        <form className="table-card form-card" onSubmit={save}>
          <FormBuilder fields={config.fields} form={form} setForm={setForm} />
          <button type="submit">Salvar</button>
        </form>
      )}

      <DataTable columns={columns} rows={rows} />
    </section>
  );
}
