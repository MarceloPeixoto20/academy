import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import PermissionGate from "../components/PermissionGate";
import DataTable from "../components/DataTable";

export default function Alunos() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      const query = params.toString() ? `?${params.toString()}` : "";
      setAlunos(await api(`/alunos/${query}`));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section>
      <div className="page-title row">
        <div>
          <h1>Alunos</h1>
          <p>Cadastro, visualização, plano, financeiro, medidas e entradas.</p>
        </div>

        <PermissionGate permission="alunos.criar">
          <button onClick={() => navigate("/alunos/novo")}>Novo aluno</button>
        </PermissionGate>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="toolbar">
        <input placeholder="Buscar por nome, CPF ou email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ATIVO">ATIVO</option>
          <option value="INATIVO">INATIVO</option>
          <option value="CANCELADO">CANCELADO</option>
          <option value="BLOQUEADO">BLOQUEADO</option>
        </select>
        <button onClick={load}>Buscar</button>
      </div>

      <DataTable
        rows={alunos}
        columns={[
          { key: "nome", label: "Nome" },
          { key: "cpf", label: "CPF" },
          { key: "telefone", label: "Telefone" },
          { key: "email", label: "Email" },
          { key: "status", label: "Status" },
          {
            key: "acao",
            label: "Ação",
            render: (row) => <button className="small-button" onClick={() => navigate(`/alunos/${row.id}`)}>Abrir</button>
          },
        ]}
      />
    </section>
  );
}
