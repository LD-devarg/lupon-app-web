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
  darkMode = true,
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
      backgroundColor: darkMode ? "rgba(12, 10, 9, 0.6)" : "#e5e7eb",
      boxShadow: darkMode
        ? "none"
        : "inset -4px -4px 10px rgba(255,255,255,1), inset 4px 4px 10px rgba(0,0,0,0.15)",
      "& fieldset": {
        borderColor: darkMode ? "#292524" : "rgba(156, 163, 175, 0.8)",
      },
      "&:hover fieldset": {
        borderColor: darkMode ? "#44403c" : "rgba(100, 116, 139, 0.95)",
      },
      "&.Mui-focused fieldset": {
        borderColor: darkMode ? "#78716c" : "#334155",
        borderWidth: 1,
      },
    },
    "& .MuiInputBase-input": {
      fontSize: "0.875rem",
      color: darkMode ? "#ffffff" : "#1f2937",
      py: size === "sm" ? "8px" : "10px",
      "&::placeholder": {
        color: darkMode ? "#78716c" : "#64748b",
        opacity: 1,
      },
    },
    "& .MuiInputLabel-root": {
      color: darkMode ? "#78716c" : "#64748b",
      fontSize: "0.875rem",
    },
    "& .MuiSvgIcon-root": {
      color: darkMode ? "#a8a29e" : "#475569",
    },
    "&.Mui-disabled": {
      opacity: 0.5,
    }
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
              boxShadow: "0 20px 45px -25px rgba(0,0,0,0.5)",
              backgroundColor: darkMode ? "#1c1917" : "#ffffff",
              border: darkMode ? "1px solid #292524" : "none",
              color: darkMode ? "#ffffff" : "inherit",
              "& .MuiAutocomplete-noOptions": {
                color: darkMode ? "#78716c" : "inherit",
                fontSize: "0.875rem",
              },
              "& .MuiAutocomplete-option": {
                fontSize: "0.875rem",
                '&[aria-selected="true"]': {
                  backgroundColor: darkMode ? "#292524" : "rgba(0, 0, 0, 0.08)",
                },
                '&[aria-selected="true"].Mui-focused': {
                  backgroundColor: darkMode ? "#3e3835" : "rgba(0, 0, 0, 0.12)",
                },
                "&.Mui-focused": {
                  backgroundColor: darkMode ? "#292524" : "rgba(0, 0, 0, 0.04)",
                },
                "&:hover": {
                  backgroundColor: darkMode ? "#292524" : "rgba(0, 0, 0, 0.04)",
                },
              },
            },
          },
        }}
      />
    </div>
  );
}
