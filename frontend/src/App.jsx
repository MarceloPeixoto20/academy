import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Alunos from "./pages/Alunos";
import AlunoCadastroDetalhe from "./pages/AlunoCadastroDetalhe";
import Financeiro from "./pages/Financeiro";
import Usuarios from "./pages/Usuarios";
import Grupos from "./pages/Grupos";
import Logs from "./pages/Logs";
import CrudPage from "./pages/CrudPage";
import Treinadores from "./pages/Treinadores";
import Treinos from "./pages/Treinos";
import OperacionalPage from "./pages/OperacionalPage";
import ModalidadesGrade from "./pages/ModalidadesGrade";
import CRM from "./pages/CRM";

const crudConfigs = {
  filiais: {
    title: "Filiais",
    endpoint: "/filiais/",
    createPermission: "filiais.criar",
    editPermission: "filiais.editar",
    initial: { status: "ATIVA" },
    fields: [
      { name: "nome", label: "Nome" }, { name: "cnpj", label: "CNPJ" },
      { name: "telefone", label: "Telefone" }, { name: "email", label: "Email" },
      { name: "cep", label: "CEP" }, { name: "endereco", label: "Endereço" },
      { name: "numero", label: "Número" }, { name: "complemento", label: "Complemento" },
      { name: "bairro", label: "Bairro" }, { name: "cidade", label: "Cidade" }, { name: "uf", label: "UF" },
      { name: "status", label: "Status", type: "select", options: [{value:"ATIVA",label:"ATIVA"},{value:"INATIVA",label:"INATIVA"}] }
    ],
    columns: ["nome","cidade","uf","status"]
  },
  planos: {
    title: "Planos",
    endpoint: "/planos/",
    createPermission: "planos.criar",
    editPermission: "planos.editar",
    initial: { status: "ATIVO", duracao_meses: 1, multa_atraso_ativa: false },
    fields: [
      { name: "nome", label: "Nome" }, { name: "descricao", label: "Descrição" },
      { name: "valor_mensal", label: "Valor mensal", type: "number" },
      { name: "duracao_meses", label: "Duração em meses", type: "number" },
      { name: "multa_atraso_ativa", label: "Multa ativa", type: "checkbox" },
      { name: "percentual_multa", label: "% Multa", type: "number" },
      { name: "juros_dia", label: "Juros ao dia", type: "number" },
      { name: "status", label: "Status", type: "select", options: [{value:"ATIVO",label:"ATIVO"},{value:"INATIVO",label:"INATIVO"}] }
    ],
    columns: ["nome","valor_mensal","duracao_meses","status"]
  },
  exercicios: {
    title: "Exercícios",
    endpoint: "/exercicios/",
    createPermission: "exercicios.criar",
    editPermission: "exercicios.editar",
    initial: { status: "ATIVO" },
    fields: [
      { name: "nome", label: "Nome" }, { name: "descricao", label: "Descrição", type: "textarea" },
      { name: "equipamento", label: "Equipamento" }, { name: "video_url", label: "URL do vídeo" },
      { name: "status", label: "Status", type: "select", options: [{value:"ATIVO",label:"ATIVO"},{value:"INATIVO",label:"INATIVO"}] }
    ],
    columns: ["nome","equipamento","status"]
  },
  configuracoes: {
    title: "Configurações",
    endpoint: "/configuracoes/",
    createPermission: "configuracoes.editar",
    editPermission: "configuracoes.editar",
    upsertOnly: true,
    fields: [
      { name: "chave", label: "Chave" }, { name: "valor", label: "Valor" },
      { name: "tipo", label: "Tipo", type: "select", options: [{value:"texto",label:"texto"},{value:"numero",label:"numero"},{value:"booleano",label:"booleano"},{value:"json",label:"json"},{value:"data",label:"data"}] },
      { name: "descricao", label: "Descrição" }
    ],
    columns: ["chave","valor","tipo","descricao"]
  }
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="alunos" element={<Alunos />} />
        <Route path="alunos/:alunoId" element={<AlunoCadastroDetalhe />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="grupos" element={<Grupos />} />
        <Route path="logs" element={<Logs />} />
        <Route path="treinadores" element={<Treinadores />} />
        <Route path="treinos" element={<Treinos />} />
        <Route path="colaboradores" element={<OperacionalPage type="colaboradores" />} />
        <Route path="horarios-funcionamento" element={<OperacionalPage type="horarios" />} />
        <Route path="modalidades" element={<OperacionalPage type="modalidades" />} />
        <Route path="grade-modalidades" element={<ModalidadesGrade />} />
        <Route path="indicacoes" element={<OperacionalPage type="indicacoes" />} />
        <Route path="crm" element={<CRM />} />
        {Object.entries(crudConfigs).map(([path, config]) => <Route key={path} path={path} element={<CrudPage config={config} />} />)}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
