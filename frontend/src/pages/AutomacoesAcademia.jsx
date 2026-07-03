import { useEffect, useState } from "react";
import { api } from "../api/client";
import SectionCard from "../components/SectionCard";

export default function AutomacoesAcademia() {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setField(field, value) { setForm((old) => ({ ...old, [field]: value })); }

  async function load() {
    try { setForm(await api("/academy/configuracoes/automacoes")); }
    catch (err) { setError(err.message); }
  }

  async function save(e) {
    e.preventDefault();
    try { setError(""); setSuccess(""); const resp = await api("/academy/configuracoes/automacoes", { method: "POST", body: JSON.stringify(form) }); setForm(resp); setSuccess("Configurações salvas."); }
    catch (err) { setError(err.message); }
  }

  async function bloquear() {
    try { setError(""); setSuccess(""); const resp = await api("/academy/inadimplencia/aplicar-bloqueio", { method: "POST" }); setSuccess(`Bloqueados: ${resp.bloqueados || 0}`); }
    catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, []);

  return <section><div className="page-title"><h1>Automações e integrações</h1><p>Configurações de bloqueio de inadimplentes e base para integração com balança.</p></div>{error && <div className="alert">{error}</div>}{success && <div className="success">{success}</div>}<form className="student-form" onSubmit={save}><SectionCard title="Bloqueio automático de inadimplentes"><div className="student-grid four"><label><span>Ativar bloqueio automático</span><select value={form["inadimplencia.bloqueio_automatico_ativo"] || "false"} onChange={(e) => setField("inadimplencia.bloqueio_automatico_ativo", e.target.value)}><option value="false">Não</option><option value="true">Sim</option></select></label><label><span>Dias de atraso para bloquear</span><input type="number" value={form["inadimplencia.dias_atraso_bloqueio"] || "10"} onChange={(e) => setField("inadimplencia.dias_atraso_bloqueio", e.target.value)} /></label></div><button type="button" className="ghost" onClick={bloquear}>Aplicar bloqueio agora</button></SectionCard><SectionCard title="Integração com balança" description="Base configurável para futura leitura automática de peso/medidas."><div className="student-grid four"><label><span>Integração ativa</span><select value={form["balanca.integracao_ativa"] || "false"} onChange={(e) => setField("balanca.integracao_ativa", e.target.value)}><option value="false">Não</option><option value="true">Sim</option></select></label><label><span>Modo</span><select value={form["balanca.modo"] || "MANUAL"} onChange={(e) => setField("balanca.modo", e.target.value)}><option value="MANUAL">Manual</option><option value="SERIAL">Serial</option><option value="HTTP">HTTP/API</option></select></label><label><span>Endpoint HTTP</span><input value={form["balanca.endpoint"] || ""} onChange={(e) => setField("balanca.endpoint", e.target.value)} /></label><label><span>Porta serial</span><input value={form["balanca.porta_serial"] || ""} onChange={(e) => setField("balanca.porta_serial", e.target.value)} /></label></div></SectionCard><button type="submit">Salvar configurações</button></form></section>;
}
