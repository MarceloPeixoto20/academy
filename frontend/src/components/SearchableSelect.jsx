import { useEffect, useMemo, useRef, useState } from "react";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Digite para buscar...",
  className = "",
  required = false,
  forceSelection = true,
}) {
  const wrapperRef = useRef(null);
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value || "")),
    [options, value]
  );

  useEffect(() => {
    setTerm(selectedOption?.label || "");
  }, [selectedOption?.label]);

  const filteredOptions = useMemo(() => {
    const normalizedTerm = normalize(term);

    if (!normalizedTerm) return options.slice(0, 12);

    return options
      .map((option) => {
        const label = normalize(option.label);
        const description = normalize(option.description);
        let score = 0;

        if (label === normalizedTerm) score = 100;
        else if (label.startsWith(normalizedTerm)) score = 80;
        else if (label.includes(normalizedTerm)) score = 60;
        else if (description.includes(normalizedTerm)) score = 40;

        return { option, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.option.label.localeCompare(b.option.label))
      .slice(0, 12)
      .map((item) => item.option);
  }, [options, term]);

  function selectOption(option) {
    onChange(option?.value || "");
    setTerm(option?.label || "");
    setTouched(true);
    setOpen(false);
  }

  function handleChange(event) {
    const nextTerm = event.target.value;
    setTerm(nextTerm);
    setTouched(true);
    setOpen(true);

    const exact = options.find((option) => normalize(option.label) === normalize(nextTerm));
    onChange(exact?.value || "");
  }

  function handleBlur() {
    setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        const exact = options.find((option) => normalize(option.label) === normalize(term));

        if (exact) {
          selectOption(exact);
          return;
        }

        if (forceSelection) {
          setTerm(selectedOption?.label || "");
        }

        setOpen(false);
      }
    }, 120);
  }

  const isInvalid = required && touched && !value;

  return (
    <label className={`searchable-select ${className}`} ref={wrapperRef}>
      <span>{label}</span>
      <input
        value={term}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onChange={handleChange}
        aria-invalid={isInvalid ? "true" : "false"}
      />
      <input
        tabIndex={-1}
        className="searchable-select-required"
        required={required}
        value={value || ""}
        onChange={() => {}}
      />

      {isInvalid && <small className="field-error">Escolha uma opção cadastrada.</small>}

      {open && filteredOptions.length > 0 && (
        <div className="searchable-select-menu">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="searchable-select-option"
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
            >
              <strong>{option.label}</strong>
              {option.description && <small>{option.description}</small>}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
