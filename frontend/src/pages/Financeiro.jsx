import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import PermissionGate from "../components/PermissionGate";

export default function Financeiro() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const params = status ? `?status=${status}` : "";
      setRows(await api(`/financeiro/cobrancas${params}`));
    } catch (err) { setError(err.message); }
  }

  async function gerar() {
    try {
      const now = new Date();
      const result = await api("/financeiro/gerar-mensais", {
        method:"POST",
        body:JSON.stringify({ ano: now.getFullYear(), mes: now.getMonth() + 1 })
      });
      alert(`Criadas: ${result.criadas} | Ignoradas: ${result.ignoradas}`);
      await load();
    } catch (err) { setError(err.message); }
  }

  async function baixar(row) {
    try {
      await api(`/financeiro/cobrancas/${row.id}/baixar`, {
        method:"POST",
        body:JSON.stringify({ valor_pago: row.valor_total, forma_pagamento:"MANUAL" })
      });
      await load();
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, [status]);

  return (
    <section>
      <div className="page-title row">
        <div><h1>Financeiro</h1><p>Cobranças dos alunos, geração mensal e baixa manual.</p></div>
        <PermissionGate permission="financeiro.gerar_cobranca"><button onClick={gerar}>Gerar cobranças do mês</button></PermissionGate>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="toolbar">
        <select value={status} onChange={(e)=>setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="ABERTO">ABERTO</option>
          <option value="ATRASADO">ATRASADO</option>
          <option value="RECEBIDO">RECEBIDO</option>
          <option value="CANCELADO">CANCELADO</option>
        </select>
      </div>
      <DataTable rows={rows} columns={[
        {key:"competencia", label:"Competência"},
        {key:"vencimento", label:"Vencimento"},
        {key:"valor_total", label:"Valor", render:(r)=>`R$ ${Number(r.valor_total||0).toFixed(2)}`},
        {key:"status", label:"Status"},
        {key:"acao", label:"Ação", render:(r)=> r.status !== "RECEBIDO" ? <PermissionGate permission="financeiro.baixar_pagamento"><button onClick={()=>baixar(r)}>Baixar</button></PermissionGate> : "Recebido"}
      ]} />
    </section>
  );
}
