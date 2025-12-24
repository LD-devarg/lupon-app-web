import { motion } from "motion/react";

export default function Button({
  type = "button",
  whileTap,
  whileHover,
  className,
  ...props
}) {
  return (
    <motion.button
      type={type}
      className={className}
      whileTap={whileTap ?? { scale: 0.95 }}
      whileHover={whileHover}
      {...props}
    />
  );
}
