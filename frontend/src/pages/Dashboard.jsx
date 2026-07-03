import { useEffect, useState } from "react";
import { api } from "../api/client";
import PermissionGate from "../components/PermissionGate";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [filiais, setFiliais] = useState([]);
  const [filters, setFilters] = useState({ filial_id: "", inicio: "", fim: "" });
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const [dashboardResp, filiaisResp] = await Promise.all([
        api(`/dashboard/${params.toString() ? `?${params.toString()}` : ""}`),
        api("/filiais/"),
      ]);
      setData(dashboardResp);
      setFiliais(filiaisResp);
    } catch (err) {
      setError(err.message);
    }
  }

  function setFilter(field, value) {
    setFilters((old) => ({ ...old, [field]: value }));
  }

  useEffect(() => { load(); }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!data) return <div>Carregando dashboard...</div>;

  return (
    <section>
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>Resumo com filtros por filial e período.</p>
      </div>

      <div className="toolbar dashboard-filters">
        <select value={filters.filial_id} onChange={(e) => setFilter("filial_id", e.target.value)}>
          <option value="">Todas as filiais</option>
          {filiais.map((filial) => <option key={filial.id} value={filial.id}>{filial.nome}</option>)}
        </select>
        <input type="date" value={filters.inicio} onChange={(e) => setFilter("inicio", e.target.value)} />
        <input type="date" value={filters.fim} onChange={(e) => setFilter("fim", e.target.value)} />
        <button className="ghost" onClick={load}>Aplicar filtros</button>
      </div>

      <div className="cards">
        <Card label="Total de alunos" value={data.total_alunos} />
        <Card label="Cadastrados no período" value={data.alunos_cadastrados_periodo} />
        <Card label="Ativos com plano OK" value={data.alunos_ativos_com_plano} />
        <Card label="Valor em aberto" value={`R$ ${Number(data.valor_em_aberto || 0).toFixed(2)}`} />
        <PermissionGate permission="dashboard.card_alunos_ativos"><Card label="Alunos ativos" value={data.alunos_ativos} /></PermissionGate>
        <PermissionGate permission="dashboard.card_alunos_inativos"><Card label="Alunos inativos" value={data.alunos_inativos} /></PermissionGate>
        <PermissionGate permission="dashboard.card_financeiro"><Card label="Cobranças abertas" value={data.cobrancas_abertas} /><Card label="Cobranças atrasadas" value={data.cobrancas_atrasadas} /></PermissionGate>
      </div>

      <div className="grid-two dashboard-grid">
        <ChartCard title="Gênero dos alunos" rows={(data.genero || []).map((item) => ({ label: item.sexo, value: item.quantidade, percent: item.percentual }))} suffix="%" />
        <ChartCard title="Top 5 planos vendidos" rows={(data.top_planos || []).map((item) => ({ label: item.nome, value: item.quantidade }))} />
        <ChartCard title="Indicações por status" rows={Object.entries(data.indicacoes_por_status || {}).map(([label, value]) => ({ label, value }))} />
        <div className="table-card chart-card"><h2>Indicações feitas</h2><strong className="big-number">{data.indicacoes_total || 0}</strong><p>Total de indicações manuais e por campanha/link no período filtrado.</p></div>
      </div>
    </section>
  );
}

function Card({ label, value }) {
  return <div className="card"><span>{label}</span><strong>{value ?? 0}</strong></div>;
}

function ChartCard({ title, rows, suffix = "" }) {
  const max = Math.max(...rows.map((row) => Number(row.value || 0)), 1);
  return (
    <div className="table-card chart-card">
      <h2>{title}</h2>
      {rows.length === 0 && <p>Nenhum dado encontrado.</p>}
      {rows.map((row) => {
        const width = row.percent ?? (Number(row.value || 0) * 100 / max);
        return <div className="bar-row" key={row.label}><div className="bar-header"><span>{row.label}</span><strong>{row.percent ?? row.value}{suffix}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(width, 100)}%` }} /></div></div>;
      })}
    </div>
  );
}
