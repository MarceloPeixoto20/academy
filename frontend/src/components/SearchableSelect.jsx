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
}) {
  const wrapperRef = useRef(null);
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

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
    setOpen(false);
  }

  function handleChange(event) {
    const nextTerm = event.target.value;
    setTerm(nextTerm);
    setOpen(true);

    const exact = options.find((option) => normalize(option.label) === normalize(nextTerm));
    onChange(exact?.value || "");
  }

  function handleBlur() {
    setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        if (!value && term && filteredOptions.length > 0) {
          selectOption(filteredOptions[0]);
          return;
        }
        setOpen(false);
      }
    }, 120);
  }

  return (
    <label className={`searchable-select ${className}`} ref={wrapperRef}>
      <span>{label}</span>
      <input
        value={term}
        required={required}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onChange={handleChange}
      />

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
