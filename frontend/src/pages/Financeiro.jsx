import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import PermissionGate from "../components/PermissionGate";
import SectionCard from "../components/SectionCard";

export default function Financeiro() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [gerando, setGerando] = useState(false);

  async function load() {
    try {
      const params = status ? `?status=${status}` : "";
      setRows(await api(`/financeiro/cobrancas${params}`));
    } catch (err) { setError(err.message); }
  }

  async function gerarPrevia() {
    try {
      setError("");
      setGerando(true);
      const now = new Date();
      const result = await api("/academy/financeiro/lotes/preview", {
        method:"POST",
        body:JSON.stringify({ ano: now.getFullYear(), mes: now.getMonth() + 1 })
      });
      setPreview(result);
    } catch (err) { setError(err.message); }
    finally { setGerando(false); }
  }

  async function confirmarLote() {
    if (!preview?.id) return;
    try {
      setError("");
      const result = await api(`/academy/financeiro/lotes/${preview.id}/confirmar`, { method:"POST" });
      alert(`Lote gerado: ${result.quantidade_gerada} cobrança(s) | R$ ${Number(result.valor_total_gerado || 0).toFixed(2)}`);
      setPreview(null);
      await load();
    } catch (err) { setError(err.message); }
  }

  async function cancelarPreview() {
    if (!preview?.id) return setPreview(null);
    try {
      await api(`/academy/financeiro/lotes/${preview.id}/cancelar`, { method:"POST" });
      setPreview(null);
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
        <div><h1>Financeiro</h1><p>Cobranças dos alunos, prévia de lotes, geração mensal e baixa manual.</p></div>
        <PermissionGate permission="financeiro.lotes"><button onClick={gerarPrevia} disabled={gerando}>{gerando ? "Gerando prévia..." : "Gerar prévia do mês"}</button></PermissionGate>
      </div>
      {error && <div className="alert">{error}</div>}

      {preview && <div className="modal-backdrop"><div className="modal-card large-modal"><SectionCard title="Prévia do lote de cobranças" description="Confira antes de confirmar a geração dos boletos.">
        <div className="cards"><div className="card"><span>Boletos a gerar</span><strong>{preview.quantidade_prevista}</strong></div><div className="card"><span>Valor total</span><strong>R$ {Number(preview.valor_total_previsto || 0).toFixed(2)}</strong></div><div className="card"><span>Status do lote</span><strong>{preview.status}</strong></div></div>
        <DataTable searchable rows={preview.preview || []} columns={[{key:"aluno_nome", label:"Aluno"},{key:"plano_nome", label:"Plano"},{key:"vencimento", label:"Vencimento"},{key:"valor_total", label:"Valor", render:(r)=>`R$ ${Number(r.valor_total||0).toFixed(2)}`},{key:"existente", label:"Já existe", render:(r)=>r.existente ? "Sim" : "Não"}]} />
        <div className="form-actions"><button onClick={confirmarLote}>Confirmar geração</button><button className="ghost" onClick={cancelarPreview}>Cancelar lote</button></div>
      </SectionCard></div></div>}

      <div className="toolbar">
        <select value={status} onChange={(e)=>setStatus(e.target.value)}>
          <option value="">Todos</option><option value="ABERTO">ABERTO</option><option value="ATRASADO">ATRASADO</option><option value="RECEBIDO">RECEBIDO</option><option value="CANCELADO">CANCELADO</option>
        </select>
      </div>
      <DataTable rows={rows} columns={[{key:"competencia", label:"Competência"},{key:"vencimento", label:"Vencimento"},{key:"valor_total", label:"Valor", render:(r)=>`R$ ${Number(r.valor_total||0).toFixed(2)}`},{key:"status", label:"Status"},{key:"lote_id", label:"Lote"},{key:"acao", label:"Ação", render:(r)=> r.status !== "RECEBIDO" ? <PermissionGate permission="financeiro.baixar_pagamento"><button onClick={()=>baixar(r)}>Baixar</button></PermissionGate> : "Recebido"}]} />
    </section>
  );
}
