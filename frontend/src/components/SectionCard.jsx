export default function SectionCard({ title, description, children }) {
  return (
    <div className="student-section">
      <div className="student-section-header">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
