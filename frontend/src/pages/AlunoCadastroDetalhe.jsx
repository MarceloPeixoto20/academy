import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import PermissionGate from "../components/PermissionGate";
import SectionCard from "../components/SectionCard";
import AlunoTreinosTab from "./AlunoTreinosTab";

const emptyAluno = {
  status: "ATIVO",
  dia_vencimento: 10,
  desconto_valor: 0,
  desconto_percentual: 0,
};

export default function AlunoCadastroDetalhe() {
  const { alunoId } = useParams();
  const isNovo = alunoId === "novo";
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("aluno");
  const [aluno, setAluno] = useState(emptyAluno);
  const [filiais, setFiliais] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [campanhasIndicacao, setCampanhasIndicacao] = useState([]);
  const [campanhaIndicacaoId, setCampanhaIndicacaoId] = useState("");
  const [planoAtivo, setPlanoAtivo] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [medidas, setMedidas] = useState([]);
  const [medidaForm, setMedidaForm] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tabs = useMemo(() => [
    { key: "aluno", label: "Aluno" },
    { key: "financeiro", label: "Plano/Financeiro", disabled: isNovo },
    { key: "treinos", label: "Treinos", disabled: isNovo },
    { key: "medidas", label: "Medidas", disabled: isNovo },
    { key: "indicacao", label: "Indicação", disabled: isNovo },
    { key: "entradas", label: "Entradas", disabled: isNovo },
  ], [isNovo]);

  const campanhaIndicacao = useMemo(() => campanhasIndicacao.find((campanha) => campanha.id === campanhaIndicacaoId) || campanhasIndicacao.find((campanha) => campanha.status === "ATIVA") || campanhasIndicacao[0], [campanhasIndicacao, campanhaIndicacaoId]);
  const linkIndicacao = useMemo(() => {
    if (isNovo || !campanhaIndicacao || !aluno?.id) return "";
    return `${window.location.origin}/indicar/${campanhaIndicacao.id}/ALUNO:${aluno.id}:${campanhaIndicacao.id}`;
  }, [aluno?.id, campanhaIndicacao, isNovo]);

  function setAlunoField(field, value) {
    setAluno((old) => ({ ...old, [field]: value }));
  }

  function setMedidaField(field, value) {
    setMedidaForm((old) => ({ ...old, [field]: value }));
  }

  async function loadBase() {
    const [filiaisResp, planosResp, campanhasResp] = await Promise.all([
      api("/filiais/"),
      api("/planos/"),
      api("/academy/indicacoes/campanhas"),
    ]);
    setFiliais(filiaisResp);
    setPlanos(planosResp);
    setCampanhasIndicacao(campanhasResp);
    if (!campanhaIndicacaoId && campanhasResp.length) setCampanhaIndicacaoId(campanhasResp.find((campanha) => campanha.status === "ATIVA")?.id || campanhasResp[0].id);
  }

  async function loadAluno() {
    if (isNovo) return;
    const data = await api(`/alunos/${alunoId}`);
    setAluno(data);
    setPlanoAtivo(data.plano_ativo || null);
  }

  async function loadFinanceiro() {
    if (!isNovo) setCobrancas(await api(`/alunos/${alunoId}/financeiro/cobrancas`));
  }

  async function loadMedidas() {
    if (!isNovo) setMedidas(await api(`/alunos/${alunoId}/medidas`));
  }

  async function loadAll() {
    try {
      setError("");
      await loadBase();
      await loadAluno();
      if (!isNovo) await Promise.all([loadFinanceiro(), loadMedidas()]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function salvarAluno(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      const payload = {
        ...aluno,
        desconto_valor: aluno.desconto_valor || 0,
        desconto_percentual: aluno.desconto_percentual || 0,
      };
      const saved = isNovo
        ? await api("/alunos/", { method: "POST", body: JSON.stringify(payload) })
        : await api(`/alunos/${alunoId}`, { method: "PUT", body: JSON.stringify(payload) });
      setSuccess("Aluno salvo com sucesso.");
      if (isNovo) navigate(`/alunos/${saved.id}`);
      else await loadAluno();
    } catch (err) {
      setError(err.message);
    }
  }

  async function salvarPlano(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      const result = await api(`/alunos/${alunoId}/plano`, {
        method: "POST",
        body: JSON.stringify({
          plano_id: aluno.plano_id,
          dia_vencimento: aluno.dia_vencimento || 10,
          desconto_valor: aluno.desconto_valor || 0,
          desconto_percentual: aluno.desconto_percentual || 0,
        }),
      });
      setAluno(result.aluno);
      setPlanoAtivo(result.plano_ativo);
      setSuccess("Plano atualizado com sucesso.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function gerarCobranca() {
    try {
      setError("");
      setSuccess("");
      const now = new Date();
      await api(`/alunos/${alunoId}/financeiro/gerar-cobranca`, {
        method: "POST",
        body: JSON.stringify({ ano: now.getFullYear(), mes: now.getMonth() + 1 }),
      });
      setSuccess("Cobrança gerada/validada com sucesso.");
      await loadFinanceiro();
    } catch (err) {
      setError(err.message);
    }
  }

  async function baixarCobranca(row) {
    try {
      setError("");
      setSuccess("");
      await api(`/financeiro/cobrancas/${row.id}/baixar`, {
        method: "POST",
        body: JSON.stringify({ valor_pago: row.valor_total, forma_pagamento: "MANUAL" }),
      });
      setSuccess("Cobrança baixada com sucesso.");
      await loadFinanceiro();
    } catch (err) {
      setError(err.message);
    }
  }

  async function salvarMedida(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      await api(`/alunos/${alunoId}/medidas`, {
        method: "POST",
        body: JSON.stringify(medidaForm),
      });
      setMedidaForm({});
      setSuccess("Medida cadastrada com sucesso.");
      await loadMedidas();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadAll(); }, [alunoId]);

  return (
    <section>
      <div className="page-title row">
        <div>
          <h1>{isNovo ? "Cadastrar aluno" : aluno.nome || "Aluno"}</h1>
          <p>{isNovo ? "Cadastre o aluno e já defina filial, plano e vencimento." : "Cadastro completo do aluno."}</p>
        </div>
        <button className="ghost" onClick={() => navigate("/alunos")}>Voltar</button>
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="tabs">
        {tabs.map((tab) => (
          <button key={tab.key} disabled={tab.disabled} className={activeTab === tab.key ? "tab active" : "tab"} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "aluno" && (
        <form className="student-form" onSubmit={salvarAluno}>
          <SectionCard title="Dados pessoais" description="Informações principais do aluno.">
            <div className="student-grid four">
              <Input label="Nome" value={aluno.nome} onChange={(v) => setAlunoField("nome", v)} required />
              <Input label="Documento" value={aluno.cpf} onChange={(v) => setAlunoField("cpf", v)} required />
              <Input label="RG" value={aluno.rg} onChange={(v) => setAlunoField("rg", v)} />
              <Input label="Nascimento" type="date" value={aluno.data_nascimento} onChange={(v) => setAlunoField("data_nascimento", v)} />
              <Select label="Sexo" value={aluno.sexo} onChange={(v) => setAlunoField("sexo", v)} options={[{ value: "M", label: "Masculino" }, { value: "F", label: "Feminino" }, { value: "OUTRO", label: "Outro" }]} />
              <Select label="Status" value={aluno.status} onChange={(v) => setAlunoField("status", v)} options={[{ value: "ATIVO", label: "ATIVO" }, { value: "INATIVO", label: "INATIVO" }, { value: "CANCELADO", label: "CANCELADO" }, { value: "BLOQUEADO", label: "BLOQUEADO" }]} />
            </div>
          </SectionCard>

          <SectionCard title="Contato" description="Telefones e canais de comunicação.">
            <div className="student-grid three">
              <Input label="Telefone" value={aluno.telefone} onChange={(v) => setAlunoField("telefone", v)} />
              <Input label="WhatsApp" value={aluno.whatsapp} onChange={(v) => setAlunoField("whatsapp", v)} />
              <Input label="Email" type="email" value={aluno.email} onChange={(v) => setAlunoField("email", v)} />
            </div>
          </SectionCard>

          <SectionCard title="Endereço" description="Endereço residencial do aluno.">
            <div className="student-grid four">
              <Input label="CEP" value={aluno.cep} onChange={(v) => setAlunoField("cep", v)} />
              <Input label="Endereço" value={aluno.endereco} onChange={(v) => setAlunoField("endereco", v)} className="span-2" />
              <Input label="Número" value={aluno.numero} onChange={(v) => setAlunoField("numero", v)} />
              <Input label="Complemento" value={aluno.complemento} onChange={(v) => setAlunoField("complemento", v)} />
              <Input label="Bairro" value={aluno.bairro} onChange={(v) => setAlunoField("bairro", v)} />
              <Input label="Cidade" value={aluno.cidade} onChange={(v) => setAlunoField("cidade", v)} />
              <Input label="UF" value={aluno.uf} onChange={(v) => setAlunoField("uf", v)} />
            </div>
          </SectionCard>

          <SectionCard title="Plano e financeiro" description="Filial, plano, vencimento e descontos.">
            <div className="student-grid four">
              <Select label="Filial" value={aluno.filial_id} onChange={(v) => setAlunoField("filial_id", v)} options={filiais.map((f) => ({ value: f.id, label: f.nome }))} />
              <Select label="Plano" value={aluno.plano_id} onChange={(v) => setAlunoField("plano_id", v)} options={planos.map((p) => ({ value: p.id, label: `${p.nome} - R$ ${Number(p.valor_mensal || 0).toFixed(2)}` }))} />
              <Input label="Dia vencimento" type="number" value={aluno.dia_vencimento} onChange={(v) => setAlunoField("dia_vencimento", v)} />
              <Input label="Desconto R$" type="number" value={aluno.desconto_valor} onChange={(v) => setAlunoField("desconto_valor", v)} />
              <Input label="Desconto %" type="number" value={aluno.desconto_percentual} onChange={(v) => setAlunoField("desconto_percentual", v)} />
            </div>
          </SectionCard>

          <SectionCard title="Observações">
            <label className="full-label"><span>Observações gerais</span><textarea value={aluno.observacoes || ""} onChange={(e) => setAlunoField("observacoes", e.target.value)} /></label>
          </SectionCard>

          <div className="form-actions">
            <PermissionGate permission={isNovo ? "alunos.criar" : "alunos.editar"}><button type="submit">{isNovo ? "Cadastrar aluno" : "Salvar alterações"}</button></PermissionGate>
            <button type="button" className="ghost" onClick={() => navigate("/alunos")}>Cancelar</button>
          </div>
        </form>
      )}

      {activeTab === "financeiro" && !isNovo && (
        <div>
          <form className="student-form" onSubmit={salvarPlano}>
            <SectionCard title="Plano atual" description="Altere o plano, dia de vencimento e descontos.">
              <div className="student-grid four">
                <Select label="Plano" value={aluno.plano_id} onChange={(v) => setAlunoField("plano_id", v)} options={planos.map((p) => ({ value: p.id, label: `${p.nome} - R$ ${Number(p.valor_mensal || 0).toFixed(2)}` }))} />
                <Input label="Dia vencimento" type="number" value={aluno.dia_vencimento} onChange={(v) => setAlunoField("dia_vencimento", v)} />
                <Input label="Desconto R$" type="number" value={aluno.desconto_valor} onChange={(v) => setAlunoField("desconto_valor", v)} />
                <Input label="Desconto %" type="number" value={aluno.desconto_percentual} onChange={(v) => setAlunoField("desconto_percentual", v)} />
              </div>
              {planoAtivo && <div className="info-box"><strong>Plano ativo:</strong> valor R$ {Number(planoAtivo.valor_mensal || 0).toFixed(2)} • vencimento dia {planoAtivo.dia_vencimento}</div>}
              <div className="form-actions">
                <PermissionGate permission="alunos.editar"><button type="submit">Salvar plano</button></PermissionGate>
                <PermissionGate permission="financeiro.gerar_cobranca"><button type="button" className="ghost" onClick={gerarCobranca}>Gerar cobrança do mês</button></PermissionGate>
              </div>
            </SectionCard>
          </form>
          <DataTable rows={cobrancas} columns={[{ key: "competencia", label: "Competência" }, { key: "vencimento", label: "Vencimento" }, { key: "valor_total", label: "Valor", render: (r) => `R$ ${Number(r.valor_total || 0).toFixed(2)}` }, { key: "status", label: "Status" }, { key: "acao", label: "Ação", render: (r) => r.status !== "RECEBIDO" ? <PermissionGate permission="financeiro.baixar_pagamento"><button className="small-button" onClick={() => baixarCobranca(r)}>Baixar</button></PermissionGate> : "Recebido" }]} />
        </div>
      )}

      {activeTab === "treinos" && !isNovo && <AlunoTreinosTab alunoId={alunoId} />}

      {activeTab === "medidas" && !isNovo && (
        <div>
          <form className="student-form" onSubmit={salvarMedida}>
            <SectionCard title="Nova avaliação física" description="Registre as medidas atuais do aluno.">
              <div className="student-grid four">
                <Input label="Data" type="date" value={medidaForm.data_avaliacao} onChange={(v) => setMedidaField("data_avaliacao", v)} />
                <Input label="Peso kg" type="number" value={medidaForm.peso_kg} onChange={(v) => setMedidaField("peso_kg", v)} />
                <Input label="Altura cm" type="number" value={medidaForm.altura_cm} onChange={(v) => setMedidaField("altura_cm", v)} />
                <Input label="Cintura cm" type="number" value={medidaForm.cintura_cm} onChange={(v) => setMedidaField("cintura_cm", v)} />
                <Input label="Abdomen cm" type="number" value={medidaForm.abdomen_cm} onChange={(v) => setMedidaField("abdomen_cm", v)} />
                <Input label="% Gordura" type="number" value={medidaForm.percentual_gordura} onChange={(v) => setMedidaField("percentual_gordura", v)} />
                <Input label="Massa muscular kg" type="number" value={medidaForm.massa_muscular_kg} onChange={(v) => setMedidaField("massa_muscular_kg", v)} />
              </div>
              <label className="full-label"><span>Observações</span><textarea value={medidaForm.observacoes || ""} onChange={(e) => setMedidaField("observacoes", e.target.value)} /></label>
              <PermissionGate permission="alunos.medidas.criar"><button type="submit">Cadastrar medida</button></PermissionGate>
            </SectionCard>
          </form>
          <DataTable rows={medidas} columns={[{ key: "data_avaliacao", label: "Data" }, { key: "peso_kg", label: "Peso" }, { key: "altura_cm", label: "Altura" }, { key: "imc", label: "IMC" }, { key: "cintura_cm", label: "Cintura" }, { key: "percentual_gordura", label: "% gordura" }, { key: "massa_muscular_kg", label: "Massa muscular" }]} />
        </div>
      )}

      {activeTab === "indicacao" && !isNovo && <SectionCard title="Link de indicação do aluno" description="Compartilhe esse link com o aluno para ele indicar amigos. O link é automático por campanha.">{campanhasIndicacao.length === 0 ? <div className="empty-state">Nenhuma campanha de indicação cadastrada. Crie uma campanha na tela de Indicações.</div> : <div className="student-grid two"><Select label="Campanha" value={campanhaIndicacao?.id || ""} onChange={setCampanhaIndicacaoId} options={campanhasIndicacao.map((campanha) => ({ value: campanha.id, label: `${campanha.nome} - ${campanha.status}` }))} /><label className="span-2"><span>Link do aluno</span><input value={linkIndicacao} readOnly onFocus={(e) => e.target.select()} /></label><div className="info-box span-2"><strong>Como funciona:</strong> esse link identifica automaticamente o aluno como indicador. Toda pessoa que preencher o formulário pelo link entra na tabela geral de indicações.</div></div>}</SectionCard>}

      {activeTab === "entradas" && !isNovo && <SectionCard title="Entradas" description="Aba reservada para controle de entrada/check-in do aluno."><div className="empty-state">Nenhum controle de entrada implementado ainda.</div></SectionCard>}
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = false, className = "" }) {
  return <label className={className}><span>{label}</span><input required={required} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options, className = "", required = false }) {
  return <label className={className}><span>{label}</span><select required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
