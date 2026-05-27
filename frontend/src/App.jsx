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

const crudConfigs = {
  filiais: {
    title: "Filiais",
    endpoint: "/filiais/",
    createPermission: "filiais.criar",
    initial: { status: "ATIVA" },
    fields: [
      { name: "nome", label: "Nome" }, { name: "cnpj", label: "CNPJ" },
      { name: "telefone", label: "Telefone" }, { name: "email", label: "Email" },
      { name: "cidade", label: "Cidade" }, { name: "uf", label: "UF" },
      { name: "status", label: "Status", type: "select", options: [{value:"ATIVA",label:"ATIVA"},{value:"INATIVA",label:"INATIVA"}] }
    ],
    columns: ["nome","cidade","uf","status"]
  },
  planos: {
    title: "Planos",
    endpoint: "/planos/",
    createPermission: "planos.criar",
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
  treinadores: {
    title: "Treinadores",
    endpoint: "/treinadores/",
    createPermission: "treinadores.criar",
    initial: { status: "ATIVO" },
    fields: [
      { name: "nome", label: "Nome" }, { name: "cpf", label: "CPF" },
      { name: "telefone", label: "Telefone" }, { name: "email", label: "Email" },
      { name: "cref", label: "CREF" }, { name: "especialidade", label: "Especialidade" },
      { name: "status", label: "Status", type: "select", options: [{value:"ATIVO",label:"ATIVO"},{value:"INATIVO",label:"INATIVO"}] }
    ],
    columns: ["nome","cpf","telefone","email","status"]
  },
  exercicios: {
    title: "Exercícios",
    endpoint: "/exercicios/",
    createPermission: "exercicios.criar",
    initial: { status: "ATIVO" },
    fields: [
      { name: "nome", label: "Nome" }, { name: "descricao", label: "Descrição", type: "textarea" },
      { name: "equipamento", label: "Equipamento" }, { name: "video_url", label: "URL do vídeo" },
      { name: "status", label: "Status", type: "select", options: [{value:"ATIVO",label:"ATIVO"},{value:"INATIVO",label:"INATIVO"}] }
    ],
    columns: ["nome","equipamento","status"]
  },
  treinos: {
    title: "Treinos",
    endpoint: "/treinos/",
    createPermission: "treinos.criar",
    initial: { status: "ATIVO", nivel: "INICIANTE" },
    fields: [
      { name: "filial_id", label: "ID Filial" }, { name: "aluno_id", label: "ID Aluno" },
      { name: "treinador_id", label: "ID Treinador" }, { name: "nome", label: "Nome" },
      { name: "objetivo", label: "Objetivo" },
      { name: "nivel", label: "Nível", type: "select", options: [{value:"INICIANTE",label:"INICIANTE"},{value:"INTERMEDIARIO",label:"INTERMEDIARIO"},{value:"AVANCADO",label:"AVANCADO"}] },
      { name: "status", label: "Status", type: "select", options: [{value:"ATIVO",label:"ATIVO"},{value:"INATIVO",label:"INATIVO"},{value:"FINALIZADO",label:"FINALIZADO"}] }
    ],
    columns: ["nome","objetivo","nivel","status"]
  },
  configuracoes: {
    title: "Configurações",
    endpoint: "/configuracoes/",
    createPermission: "configuracoes.editar",
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
        {Object.entries(crudConfigs).map(([path, config]) => (
          <Route key={path} path={path} element={<CrudPage config={config} />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
