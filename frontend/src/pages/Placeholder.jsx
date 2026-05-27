export default function Placeholder({ title }) {
  return (
    <section>
      <div className="page-title">
        <h1>{title}</h1>
        <p>Módulo preparado na estrutura. Próxima etapa: implementar CRUD e regras específicas.</p>
      </div>
      <div className="card">
        <span>Status</span>
        <strong>Base criada</strong>
      </div>
    </section>
  );
}
