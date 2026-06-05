const variants = {
  primary:
    "bg-stone-700 hover:bg-stone-600 text-white border border-stone-600 hover:border-stone-500",
  secondary:
    "bg-[#111111] hover:bg-[#222222] text-white border border-stone-700 hover:border-stone-600",
  ghost:
    "bg-transparent hover:bg-[#222222] text-stone-300 hover:text-white border border-transparent",
  danger:
    "bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800 hover:border-red-700",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export default function ButtonDef({
  text,
  children,
  variant = "secondary",
  size = "md",
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = "",
  disabled = false,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded font-medium",
        "transition-colors duration-200 cursor-pointer",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant] ?? variants.secondary,
        sizes[size] ?? sizes.md,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {LeftIcon && <LeftIcon className="h-4 w-4 flex-shrink-0" />}
      {text ?? children}
      {RightIcon && <RightIcon className="h-4 w-4 flex-shrink-0" />}
    </button>
  );
}