import { useEffect, useState } from "react";
import { api } from "../api/client";
import PermissionGate from "../components/PermissionGate";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/dashboard/")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!data) return <div>Carregando dashboard...</div>;

  return (
    <section>
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>Resumo respeitando permissões e filiais do usuário.</p>
      </div>

      <div className="cards">
        <Card label="Total de alunos" value={data.total_alunos} />

        <PermissionGate permission="dashboard.card_alunos_ativos">
          <Card label="Alunos ativos" value={data.alunos_ativos} />
        </PermissionGate>

        <PermissionGate permission="dashboard.card_alunos_inativos">
          <Card label="Alunos inativos" value={data.alunos_inativos} />
        </PermissionGate>

        <PermissionGate permission="dashboard.card_financeiro">
          <Card label="Cobranças abertas" value={data.cobrancas_abertas} />
          <Card label="Cobranças atrasadas" value={data.cobrancas_atrasadas} />
        </PermissionGate>
      </div>
    </section>
  );
}

function Card({ label, value }) {
  return (
    <div className="card">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </div>
  );
}
