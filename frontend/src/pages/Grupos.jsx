import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Grupos() {
  const [grupos, setGrupos] = useState([]);
  const [permissoes, setPermissoes] = useState([]);

  useEffect(() => {
    api("/grupos/").then(setGrupos).catch(console.error);
    api("/grupos/permissoes").then(setPermissoes).catch(console.error);
  }, []);

  return (
    <section>
      <div className="page-title">
        <h1>Grupos de usuários</h1>
        <p>Permissões granulares por módulo, ação e botão visual.</p>
      </div>

      <div className="grid-two">
        <div className="table-card">
          <h2>Grupos</h2>
          {grupos.map((g) => (
            <div className="list-item" key={g.id}>
              <strong>{g.nome}</strong>
              <span>{g.is_admin ? "Administrador total" : `${g.permissoes?.length || 0} permissões`}</span>
            </div>
          ))}
        </div>

        <div className="table-card">
          <h2>Permissões cadastradas</h2>
          <div className="permission-list">
            {permissoes.map((p) => (
              <div key={p.id}>
                <code>{p.codigo}</code>
                <small>{p.descricao}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
