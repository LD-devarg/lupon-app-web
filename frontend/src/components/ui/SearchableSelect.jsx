import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

function normalizeOption(option) {
  if (!option) return null;
  if (typeof option === "string") {
    return { value: option, label: option };
  }
  return {
    value: option.value,
    label: option.label ?? String(option.value ?? ""),
    ...option,
  };
}

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Buscar...",
  disabled = false,
  wrapperClassName = "",
  inputClassName = "",
  selectClassName = "",
  noOptionsText = "Sin resultados",
  size = "md",
}) {
  const normalizedOptions = options.map(normalizeOption);
  const selectedOption =
    value === "" || value === null || value === undefined
      ? null
      : normalizedOptions.find((option) => String(option.value) === String(value)) || null;

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      minHeight: size === "sm" ? 40 : 44,
      borderRadius: "0.75rem",
      backgroundColor: "#e5e7eb",
      boxShadow:
        "inset -4px -4px 10px rgba(255,255,255,1), inset 4px 4px 10px rgba(0,0,0,0.15)",
      "& fieldset": {
        borderColor: "rgba(156, 163, 175, 0.8)",
      },
      "&:hover fieldset": {
        borderColor: "rgba(100, 116, 139, 0.95)",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#334155",
        borderWidth: 1,
      },
    },
    "& .MuiInputBase-input": {
      fontSize: "0.875rem",
      color: "#1f2937",
      py: size === "sm" ? "8px" : "10px",
    },
    "& .MuiInputLabel-root": {
      color: "#64748b",
      fontSize: "0.875rem",
    },
    "& .MuiSvgIcon-root": {
      color: "#475569",
    },
  };

  return (
    <div className={wrapperClassName}>
      <Autocomplete
        options={normalizedOptions}
        value={selectedOption}
        disabled={disabled}
        noOptionsText={noOptionsText}
        isOptionEqualToValue={(option, currentValue) =>
          String(option.value) === String(currentValue?.value)
        }
        getOptionLabel={(option) => option?.label ?? ""}
        onChange={(_, nextValue) => onChange(nextValue?.value ?? "")}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            className={inputClassName || selectClassName}
            sx={inputSx}
          />
        )}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "0.9rem",
              mt: 0.75,
              boxShadow: "0 20px 45px -25px rgba(15,23,42,0.35)",
            },
          },
        }}
      />
    </div>
  );
}
