import { applyInputMask, getInputMaskAttributes } from "../utils/inputMasks";

export default function MaskedInput({
  name,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  className = "",
  placeholder = "",
  min,
  max,
}) {
  const identifier = name || label;
  const maskAttrs = getInputMaskAttributes(identifier, type);
  const displayedValue = applyInputMask(identifier, value, type);

  function handleChange(event) {
    onChange(applyInputMask(identifier, event.target.value, type));
  }

  const input = (
    <input
      {...maskAttrs}
      required={required}
      value={displayedValue}
      placeholder={placeholder || maskAttrs.placeholder || ""}
      min={min}
      max={max}
      onChange={handleChange}
    />
  );

  if (label === null) return input;

  return (
    <label className={className}>
      {label && <span>{label}</span>}
      {input}
    </label>
  );
}
