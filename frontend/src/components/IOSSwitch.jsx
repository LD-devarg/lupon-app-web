// src/components/IOSSwitch.jsx
import { motion } from "framer-motion";

function IOSSwitch({ checked, onChange, disabled = false }) {
  return (
    <motion.button
      type="button"
      layout
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      className={`
        flex items-center w-11 h-6 rounded-full p-0.5
        ${checked ? "justify-end bg-lime-400/90" : "justify-start bg-slate-500/80"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        shadow-[0_0_10px_rgba(0,0,0,0.4)]
        transition-colors
      `}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-5 h-5 rounded-full bg-white shadow-md"
      />
    </motion.button>
  );
}

export default IOSSwitch;
