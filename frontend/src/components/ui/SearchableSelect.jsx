import { useEffect, useMemo, useState } from "react";

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  disabled = false,
  wrapperClassName = "",
  inputClassName = "",
  selectClassName = "",
}) {
  const selectedLabel = useMemo(() => {
    const selected = options.find(
      (option) => String(option.value) === String(value)
    );
    return selected?.label || "";
  }, [options, value]);

  const [query, setQuery] = useState(selectedLabel);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.label?.toLowerCase().includes(term)
    );
  }, [options, query]);

  const selectedOption =
    value !== "" && value !== null && value !== undefined
      ? options.find((option) => String(option.value) === String(value))
      : null;

  const visibleOptions =
    selectedOption &&
    !filteredOptions.some(
      (option) => String(option.value) === String(value)
    )
      ? [selectedOption, ...filteredOptions]
      : filteredOptions;

  return (
    <div className={wrapperClassName}>
      <input
        type="text"
        className={inputClassName}
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={disabled}
      />
      <select
        className={selectClassName}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">Seleccionar producto</option>
        {visibleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
