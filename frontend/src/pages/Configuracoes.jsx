import { useEffect, useState } from "react";
import { api } from "../api/client";
import MaskedInput from "../components/MaskedInput";
import PermissionGate from "../components/PermissionGate";
import SectionCard from "../components/SectionCard";

export default function Configuracoes() {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setField(field, value) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  async function load() {
    try {
      setError("");
      setForm(await api("/academy/configuracoes/negocio"));
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      const resp = await api("/academy/configuracoes/negocio", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(resp);
      setSuccess("Configurações salvas.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function aplicarBloqueio() {
    try {
      setError("");
      setSuccess("");
      const resp = await api("/academy/inadimplencia/aplicar-bloqueio", { method: "POST" });
      setSuccess(resp.message || `Alunos bloqueados: ${resp.bloqueados || 0}`);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section>
      <div className="page-title">
        <h1>Configurações</h1>
        <p>Regras de negócio para financeiro, inadimplência, alunos, treinos e CRM.</p>
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form className="student-form" onSubmit={save}>
        <SectionCard title="Financeiro e faturas">
          <div className="student-grid four">
            <Select label="Gerar faturas automaticamente" value={form["financeiro.geracao_automatica_faturas_ativa"] || "false"} onChange={(v) => setField("financeiro.geracao_automatica_faturas_ativa", v)} options={yesNoOptions} />
            <Input label="Dia de geração" type="number" min="1" max="28" value={form["financeiro.dia_geracao_faturas"] || "1"} onChange={(v) => setField("financeiro.dia_geracao_faturas", v)} />
            <Select label="Competência gerada" value={form["financeiro.competencia_geracao"] || "MES_ATUAL"} onChange={(v) => setField("financeiro.competencia_geracao", v)} options={[{ value: "MES_ATUAL", label: "Mês atual" }, { value: "MES_SEGUINTE", label: "Mês seguinte" }]} />
            <Select label="Forma padrão" value={form["financeiro.forma_pagamento_padrao"] || "BOLETO"} onChange={(v) => setField("financeiro.forma_pagamento_padrao", v)} options={["BOLETO", "PIX", "CARTAO", "DINHEIRO"].map((value) => ({ value, label: value }))} />
            <Select label="Ignorar cobranças existentes" value={form["financeiro.ignorar_cobrancas_existentes"] || "true"} onChange={(v) => setField("financeiro.ignorar_cobrancas_existentes", v)} options={yesNoOptions} />
            <Select label="Notificar aluno ao gerar" value={form["financeiro.notificar_aluno_ao_gerar_fatura"] || "false"} onChange={(v) => setField("financeiro.notificar_aluno_ao_gerar_fatura", v)} options={yesNoOptions} />
            <Input label="Alerta antes do vencimento" type="number" min="0" value={form["financeiro.dias_alerta_vencimento"] || "3"} onChange={(v) => setField("financeiro.dias_alerta_vencimento", v)} />
          </div>
        </SectionCard>

        <SectionCard title="Inadimplência e acesso">
          <div className="student-grid four">
            <Select label="Bloqueio automático" value={form["inadimplencia.bloqueio_automatico_ativo"] || "false"} onChange={(v) => setField("inadimplencia.bloqueio_automatico_ativo", v)} options={yesNoOptions} />
            <Input label="Dias de atraso para bloquear" type="number" min="1" value={form["inadimplencia.dias_atraso_bloqueio"] || "10"} onChange={(v) => setField("inadimplencia.dias_atraso_bloqueio", v)} />
            <Select label="Bloquear acesso" value={form["inadimplencia.bloquear_acesso_automaticamente"] || "true"} onChange={(v) => setField("inadimplencia.bloquear_acesso_automaticamente", v)} options={yesNoOptions} />
            <Select label="Desbloquear após pagamento" value={form["inadimplencia.desbloquear_apos_pagamento"] || "true"} onChange={(v) => setField("inadimplencia.desbloquear_apos_pagamento", v)} options={yesNoOptions} />
          </div>
          <div className="form-actions">
            <PermissionGate permission="configuracoes.bloqueio">
              <button type="button" className="ghost" onClick={aplicarBloqueio}>Aplicar bloqueio agora</button>
            </PermissionGate>
          </div>
        </SectionCard>

        <SectionCard title="Operação e relacionamento">
          <div className="student-grid four">
            <Input label="Periodicidade da avaliação" type="number" min="1" value={form["alunos.periodicidade_avaliacao_dias"] || "30"} onChange={(v) => setField("alunos.periodicidade_avaliacao_dias", v)} />
            <Input label="Alerta de treino vencido" type="number" min="0" value={form["treinos.alertar_treino_vencido_dias"] || "7"} onChange={(v) => setField("treinos.alertar_treino_vencido_dias", v)} />
            <Input label="Alerta de CRM sem contato" type="number" min="0" value={form["crm.dias_sem_contato_alerta"] || "3"} onChange={(v) => setField("crm.dias_sem_contato_alerta", v)} />
            <Select label="Aprovar recompensa de indicação" value={form["indicacoes.exigir_aprovacao_recompensa"] || "true"} onChange={(v) => setField("indicacoes.exigir_aprovacao_recompensa", v)} options={yesNoOptions} />
          </div>
        </SectionCard>

        <PermissionGate permission="configuracoes.editar">
          <button type="submit">Salvar configurações</button>
        </PermissionGate>
      </form>
    </section>
  );
}

const yesNoOptions = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

function Input({ label, value, onChange, type = "text", min, max }) {
  return <MaskedInput name={label} label={label} value={value} onChange={onChange} type={type} min={min} max={max} />;
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
