import { useEffect, useState } from "react";
import { api } from "../api/client";
import MaskedInput from "../components/MaskedInput";
import PermissionGate from "../components/PermissionGate";
import SectionCard from "../components/SectionCard";

export default function Integracoes() {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setField(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  async function load() {
    try {
      setError("");
      setForm(await api("/academy/integracoes"));
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      const resp = await api("/academy/integracoes", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(resp);
      setSuccess("Integrações salvas.");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section>
      <div className="page-title">
        <h1>Integrações</h1>
        <p>Conectores externos, dispositivos e canais que podem ampliar a operação da academia.</p>
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form className="student-form" onSubmit={save}>
        <SectionCard title="Balança e avaliação física">
          <div className="student-grid four">
            <Select label="Integração ativa" value={form["balanca.integracao_ativa"] || "false"} onChange={(v) => setField("balanca.integracao_ativa", v)} options={yesNoOptions} />
            <Select label="Modo" value={form["balanca.modo"] || "MANUAL"} onChange={(v) => setField("balanca.modo", v)} options={[{ value: "MANUAL", label: "Manual" }, { value: "SERIAL", label: "Serial" }, { value: "HTTP", label: "HTTP/API" }]} />
            <Input label="Endpoint HTTP" value={form["balanca.endpoint"] || ""} onChange={(v) => setField("balanca.endpoint", v)} />
            <Input label="Porta serial" value={form["balanca.porta_serial"] || ""} onChange={(v) => setField("balanca.porta_serial", v)} />
          </div>
        </SectionCard>

        <SectionCard title="Pagamentos">
          <div className="student-grid four">
            <Select label="Gateway ativo" value={form["pagamentos.gateway_ativo"] || "false"} onChange={(v) => setField("pagamentos.gateway_ativo", v)} options={yesNoOptions} />
            <Select label="Provedor" value={form["pagamentos.provedor"] || "ASAAS"} onChange={(v) => setField("pagamentos.provedor", v)} options={["ASAAS", "IUGU", "PAGSEGURO", "MERCADO_PAGO", "OUTRO"].map((value) => ({ value, label: value }))} />
            <Input label="URL base da API" value={form["pagamentos.api_base_url"] || ""} onChange={(v) => setField("pagamentos.api_base_url", v)} />
            <Select label="Webhook ativo" value={form["pagamentos.webhook_ativo"] || "false"} onChange={(v) => setField("pagamentos.webhook_ativo", v)} options={yesNoOptions} />
          </div>
        </SectionCard>

        <SectionCard title="Comunicação">
          <div className="student-grid four">
            <Select label="WhatsApp ativo" value={form["comunicacao.whatsapp_ativo"] || "false"} onChange={(v) => setField("comunicacao.whatsapp_ativo", v)} options={yesNoOptions} />
            <Select label="Provedor" value={form["comunicacao.provedor"] || "MANUAL"} onChange={(v) => setField("comunicacao.provedor", v)} options={["MANUAL", "ZAPI", "TWILIO", "META", "OUTRO"].map((value) => ({ value, label: value }))} />
            <Input label="Número remetente" value={form["comunicacao.numero_remetente"] || ""} onChange={(v) => setField("comunicacao.numero_remetente", v)} />
            <Input label="Webhook/endpoint" value={form["comunicacao.webhook_url"] || ""} onChange={(v) => setField("comunicacao.webhook_url", v)} />
          </div>
        </SectionCard>

        <SectionCard title="Controle de acesso">
          <div className="student-grid four">
            <Select label="Integração ativa" value={form["acesso.integracao_ativa"] || "false"} onChange={(v) => setField("acesso.integracao_ativa", v)} options={yesNoOptions} />
            <Select label="Tipo" value={form["acesso.tipo"] || "MANUAL"} onChange={(v) => setField("acesso.tipo", v)} options={["MANUAL", "CATRACA", "FACIAL", "QR_CODE", "DIGITAL"].map((value) => ({ value, label: value }))} />
            <Input label="Endpoint do dispositivo" value={form["acesso.endpoint"] || ""} onChange={(v) => setField("acesso.endpoint", v)} />
            <Input label="Chave do dispositivo" value={form["acesso.chave_dispositivo"] || ""} onChange={(v) => setField("acesso.chave_dispositivo", v)} />
          </div>
        </SectionCard>

        <SectionCard title="Convênios e marketplaces">
          <div className="student-grid four">
            <Select label="Wellhub ativo" value={form["marketplaces.wellhub_ativo"] || "false"} onChange={(v) => setField("marketplaces.wellhub_ativo", v)} options={yesNoOptions} />
            <Select label="TotalPass ativo" value={form["marketplaces.totalpass_ativo"] || "false"} onChange={(v) => setField("marketplaces.totalpass_ativo", v)} options={yesNoOptions} />
          </div>
        </SectionCard>

        <PermissionGate permission="integracoes.editar">
          <button type="submit">Salvar integrações</button>
        </PermissionGate>
      </form>
    </section>
  );
}

const yesNoOptions = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

function Input({ label, value, onChange }) {
  return <MaskedInput name={label} label={label} value={value} onChange={onChange} />;
}

function Select({ label, value, onChange, options }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
