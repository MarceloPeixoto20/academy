import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

export default function ReferralForm() {
  const { campanhaId, token } = useParams();
  const [form, setForm] = useState({});
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function setField(field, value) { setForm((old) => ({ ...old, [field]: value })); }

  async function submit(e) {
    e.preventDefault();
    try {
      setError("");
      await api(`/academy/public/referrals/public/indicacoes/${campanhaId}/${token}`, { method: "POST", body: JSON.stringify(form) });
      setSent(true);
    } catch (err) { setError(err.message); }
  }

  if (sent) return <div className="public-page"><div className="public-card"><h1>Indicação enviada!</h1><p>Obrigado. A academia vai entrar em contato.</p></div></div>;

  return <div className="public-page"><form className="public-card" onSubmit={submit}><h1>Indique uma pessoa</h1><p>Preencha os dados de quem tem interesse na academia.</p>{error && <div className="alert">{error}</div>}<label><span>Nome</span><input required value={form.nome || ""} onChange={(e) => setField("nome", e.target.value)} /></label><label><span>Telefone/WhatsApp</span><input required value={form.telefone || ""} onChange={(e) => setField("telefone", e.target.value)} /></label><label><span>Email</span><input type="email" value={form.email || ""} onChange={(e) => setField("email", e.target.value)} /></label><label><span>Observações</span><textarea value={form.observacoes || ""} onChange={(e) => setField("observacoes", e.target.value)} /></label><button type="submit">Enviar indicação</button></form></div>;
}
