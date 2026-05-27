import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import PermissionGate from "../components/PermissionGate";
import SectionCard from "../components/SectionCard";

const novoUsuario = () => ({ status: "ATIVO", filiais: [] });

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [form, setForm] = useState(novoUsuario());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const columns = useMemo(() => [
    { key: "nome", label: "Nome" },
    { key: "email", label: "Email" },
    { key: "grupo", label: "Grupo" },
    { key: "status", label: "Status" },
    { key: "filiais", label: "Filiais", render: (u) => u.filiais?.length ? u.filiais.length : "Todas" },
    { key: "acao", label: "Ação", render: (u) => <button className="small-button ghost" onClick={() => editar(u)}>Editar</button> },
  ], []);

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

  function novo() {
    setEditingId(null);
    setForm(novoUsuario());
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function editar(usuario) {
    setEditingId(usuario.id);
    setForm({ ...usuario, senha: "", filiais: usuario.filiais || [] });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function cancelar() {
    setEditingId(null);
    setForm(novoUsuario());
    setShowForm(false);
  }

  async function load() {
    try {
      setError("");
      const [usuariosResp, gruposResp, filiaisResp] = await Promise.all([
        api("/usuarios/"),
        api("/grupos/"),
        api("/filiais/"),
      ]);
      setUsuarios(usuariosResp);
      setGrupos(gruposResp);
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
      const payload = { ...form };
      if (!payload.senha) delete payload.senha;

      if (editingId) {
        await api(`/usuarios/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setSuccess("Usuário atualizado com sucesso.");
      } else {
        await api("/usuarios/", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Usuário cadastrado com sucesso.");
      }

      setEditingId(null);
      setForm(novoUsuario());
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function inativar() {
    if (!editingId) return;
    try {
      setError("");
      setSuccess("");
      await api(`/usuarios/${editingId}`, { method: "DELETE" });
      setSuccess("Usuário inativado com sucesso.");
      cancelar();
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
          <h1>Usuários</h1>
          <p>Cadastro, edição, grupo de acesso e filiais vinculadas.</p>
        </div>
        <PermissionGate permission="usuarios.criar">
          <button onClick={novo}>{showForm ? "Novo usuário" : "Novo usuário"}</button>
        </PermissionGate>
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <form className="student-form" onSubmit={salvar}>
          <SectionCard title={editingId ? "Editar usuário" : "Novo usuário"} description="Dados principais e credenciais de acesso.">
            <div className="student-grid four">
              <Input label="Nome" value={form.nome} onChange={(v) => setField("nome", v)} required />
              <Input label="Email" type="email" value={form.email} onChange={(v) => setField("email", v)} required />
              <Select label="Grupo" value={form.grupo_id} onChange={(v) => setField("grupo_id", v)} required options={grupos.map((g) => ({ value: g.id, label: g.nome }))} />
              <Select label="Status" value={form.status} onChange={(v) => setField("status", v)} options={[{ value: "ATIVO", label: "ATIVO" }, { value: "INATIVO", label: "INATIVO" }, { value: "BLOQUEADO", label: "BLOQUEADO" }]} />
              <Input label={editingId ? "Nova senha" : "Senha"} type="password" value={form.senha} onChange={(v) => setField("senha", v)} required={!editingId} />
            </div>
          </SectionCard>

          <SectionCard title="Filiais" description="Deixe sem marcar para permitir acesso a todas as filiais. Marque apenas quando quiser limitar.">
            <div className="checkbox-grid">
              {filiais.map((filial) => (
                <label key={filial.id} className="check-row">
                  <input type="checkbox" checked={(form.filiais || []).includes(filial.id)} onChange={() => toggleFilial(filial.id)} />
                  <span>{filial.nome}</span>
                </label>
              ))}
            </div>
          </SectionCard>

          <div className="form-actions">
            <PermissionGate permission={editingId ? "usuarios.editar" : "usuarios.criar"}>
              <button type="submit">{editingId ? "Salvar usuário" : "Cadastrar usuário"}</button>
            </PermissionGate>
            {editingId && <PermissionGate permission="usuarios.excluir"><button type="button" className="ghost" onClick={inativar}>Inativar</button></PermissionGate>}
            <button type="button" className="ghost" onClick={cancelar}>Cancelar</button>
          </div>
        </form>
      )}

      <DataTable columns={columns} rows={usuarios} />
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = false, className = "" }) {
  return <label className={className}><span>{label}</span><input required={required} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options, className = "", required = false }) {
  return <label className={className}><span>{label}</span><select required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
