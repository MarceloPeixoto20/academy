import MaskedInput from "./MaskedInput";

export default function FormBuilder({ fields, form, setForm }) {
  function setValue(name, value) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  return (
    <div className="form-grid">
      {fields.map((f) => (
        <label key={f.name}>
          <span>{f.label}</span>
          {f.type === "select" ? (
            <select value={form[f.name] ?? ""} onChange={(e) => setValue(f.name, e.target.value)}>
              <option value="">Selecione</option>
              {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === "textarea" ? (
            <textarea value={form[f.name] ?? ""} onChange={(e) => setValue(f.name, e.target.value)} />
          ) : f.type === "checkbox" ? (
            <input type="checkbox" checked={Boolean(form[f.name])} onChange={(e) => setValue(f.name, e.target.checked)} />
          ) : (
            <MaskedInput name={f.name} label={null} type={f.type || "text"} value={form[f.name]} onChange={(value) => setValue(f.name, value)} />
          )}
        </label>
      ))}
    </div>
  );
}
