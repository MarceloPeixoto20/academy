import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, Dumbbell, Wallet, Settings, Shield, LogOut, UserRound, Building2, Activity, ClipboardList } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import PermissionGate from "../components/PermissionGate";

export default function AdminLayout() {
  const { user, logout } = useAuth();

  const links = [
    ["dashboard.visualizar", "/", LayoutDashboard, "Dashboard"],
    ["filiais.visualizar", "/filiais", Building2, "Filiais"],
    ["alunos.visualizar", "/alunos", Users, "Alunos"],
    ["alunos.medidas.visualizar", "/medidas", "Medidas"],
    ["treinadores.visualizar", "/treinadores", Activity, "Treinadores"],
    ["treinos.visualizar", "/treinos", Dumbbell, "Treinos"],
    ["exercicios.visualizar", "/exercicios", ClipboardList, "Exercícios"],
    ["planos.visualizar", "/planos", ClipboardList, "Planos"],
    ["financeiro.visualizar", "/financeiro", Wallet, "Financeiro"],
    ["usuarios.visualizar", "/usuarios", UserRound, "Usuários"],
    ["grupos.visualizar", "/grupos", Shield, "Grupos"],
    ["configuracoes.visualizar", "/configuracoes", Settings, "Configurações"],
    ["logs.visualizar", "/logs", Shield, "Logs"],
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Academia Admin</div>
        <nav>
          {links.map(([permission, to, Icon, label]) => (
            <PermissionGate key={to} permission={permission}>
              <NavLink to={to} end={to === "/"}><Icon size={18} /> {label}</NavLink>
            </PermissionGate>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <strong>{user?.nome}</strong>
            <span>{user?.grupo} • {user?.filiais?.length ? `${user.filiais.length} filial(is)` : "Todas as filiais"}</span>
          </div>
          <button className="ghost" onClick={logout}><LogOut size={16} /> Sair</button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
