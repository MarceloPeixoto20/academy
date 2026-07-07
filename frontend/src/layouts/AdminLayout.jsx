import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, Dumbbell, Wallet, Settings, Shield, LogOut, UserRound, Building2, Activity, ClipboardList, Plug } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import PermissionGate from "../components/PermissionGate";
import flowGymLogo from "../assets/flowgym-logo.svg";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("sidebarOpen") !== "false");
  const [closedGroups, setClosedGroups] = useState(() => JSON.parse(localStorage.getItem("closedSidebarGroups") || "{}"));

  const groups = useMemo(() => [
    { key: "geral", label: "Geral", links: [["dashboard.visualizar", "/", LayoutDashboard, "Dashboard"]] },
    { key: "academia", label: "Academia", links: [["filiais.visualizar", "/filiais", Building2, "Filiais"], ["alunos.visualizar", "/alunos", Users, "Alunos"], ["treinadores.visualizar", "/treinadores", Activity, "Treinadores"], ["treinos.visualizar", "/treinos", Dumbbell, "Treinos"], ["exercicios.visualizar", "/exercicios", ClipboardList, "Exercícios"], ["planos.visualizar", "/planos", ClipboardList, "Planos"]] },
    { key: "operacional", label: "Operacional", links: [["operacional.visualizar", "/colaboradores", UserRound, "Colaboradores"], ["operacional.visualizar", "/horarios-funcionamento", Building2, "Funcionamento"], ["operacional.visualizar", "/modalidades", Dumbbell, "Modalidades"], ["operacional.visualizar", "/grade-modalidades", ClipboardList, "Grade"], ["operacional.visualizar", "/indicacoes", Users, "Indicações"]] },
    { key: "comercial", label: "Comercial", links: [["crm.visualizar", "/crm", Activity, "CRM"]] },
    { key: "financeiro", label: "Financeiro", links: [["financeiro.visualizar", "/financeiro", Wallet, "Financeiro"]] },
    { key: "admin", label: "Administração", links: [["usuarios.visualizar", "/usuarios", UserRound, "Usuários"], ["grupos.visualizar", "/grupos", Shield, "Grupos"], ["configuracoes.visualizar", "/configuracoes", Settings, "Configurações"], ["integracoes.visualizar", "/integracoes", Plug, "Integrações"], ["logs.visualizar", "/logs", Shield, "Logs"]] },
  ], []);

  function toggleSidebar() {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    localStorage.setItem("sidebarOpen", String(next));
  }

  function toggleGroup(key) {
    setClosedGroups((old) => {
      const next = { ...old, [key]: !old[key] };
      localStorage.setItem("closedSidebarGroups", JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className={sidebarOpen ? "shell" : "shell sidebar-collapsed"}>
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand flowgym-brand">
            <img src={flowGymLogo} alt="FlowGym" />
            {sidebarOpen && <span>FlowGym</span>}
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>{sidebarOpen ? "‹" : "›"}</button>
        </div>
        {sidebarOpen && <nav>{groups.map((group) => <div className="sidebar-group" key={group.key}><button className="sidebar-group-title" onClick={() => toggleGroup(group.key)}>{group.label}<span>{closedGroups[group.key] ? "+" : "−"}</span></button>{!closedGroups[group.key] && group.links.map(([permission, to, Icon, label]) => <PermissionGate key={to} permission={permission}><NavLink to={to} end={to === "/"}><Icon size={18} /> {label}</NavLink></PermissionGate>)}</div>)}</nav>}
      </aside>
      <main className="main"><header className="topbar"><div><strong>FlowGym</strong><span>{user?.nome} • {user?.grupo} • {user?.filiais?.length ? `${user.filiais.length} filial(is)` : "Todas as filiais"}</span></div><button className="ghost" onClick={logout}><LogOut size={16} /> Sair</button></header><Outlet /></main>
    </div>
  );
}
