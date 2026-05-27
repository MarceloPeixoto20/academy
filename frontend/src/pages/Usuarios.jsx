import { useEffect, useState } from "react";
import { api } from "../api/client";
import PermissionGate from "../components/PermissionGate";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    api("/usuarios/").then(setUsuarios).catch(console.error);
  }, []);

  return (
    <section>
      <div className="page-title row">
        <div>
          <h1>Usuários</h1>
          <p>Usuários administrativos vinculados a grupos e filiais.</p>
        </div>
        <PermissionGate permission="usuarios.criar">
          <button>Novo usuário</button>
        </PermissionGate>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Grupo</th>
              <th>Status</th>
              <th>Filiais vinculadas</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{u.grupo}</td>
                <td>{u.status}</td>
                <td>{u.filiais?.length || "Todas"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
