import { useEffect, useState } from "react";
import { api } from "../api/client";
import PermissionGate from "../components/PermissionGate";

export default function Planos() {
  const [planos, setPlanos] = useState([]);

  useEffect(() => {
    api("/planos/").then(setPlanos).catch(console.error);
  }, []);

  return (
    <section>
      <div className="page-title row">
        <div>
          <h1>Planos</h1>
          <p>Planos mensais e regras de multa/juros.</p>
        </div>
        <PermissionGate permission="planos.criar">
          <button>Novo plano</button>
        </PermissionGate>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Valor mensal</th>
              <th>Multa ativa</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {planos.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>R$ {Number(p.valor_mensal || 0).toFixed(2)}</td>
                <td>{p.multa_atraso_ativa ? "Sim" : "Não"}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
