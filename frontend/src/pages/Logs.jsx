import { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";

export default function Logs() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(()=>{ api("/logs/").then(setRows).catch(err=>setError(err.message)); }, []);

  return (
    <section>
      <div className="page-title"><h1>Logs de auditoria</h1><p>Alterações importantes feitas no sistema.</p></div>
      {error && <div className="alert">{error}</div>}
      <DataTable rows={rows} columns={[
        {key:"created_at", label:"Data"},
        {key:"acao", label:"Ação"},
        {key:"entidade", label:"Entidade"},
        {key:"entidade_id", label:"ID"},
        {key:"ip", label:"IP"}
      ]} />
    </section>
  );
}
