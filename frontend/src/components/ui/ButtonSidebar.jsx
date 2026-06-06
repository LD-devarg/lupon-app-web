

import { NavLink } from "react-router-dom";

export default function ButtonSidebar({
    icon,
    label,
    to,
    onClick,
    showLabel
}) {
    const baseClass = "flex items-center gap-2 px-3 py-2.5 rounded-[20px] text-white/80 hover:text-black hover:bg-lime-400 hover:font-medium transition-all duration-200 cursor-pointer w-full overflow-hidden whitespace-nowrap";
    const activeClass = "text-black bg-lime-400 font-medium";

    const content = (
        <>
            {icon}
            <span className={`transition-opacity duration-300 ${showLabel ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                {label}
            </span>
        </>
    );

    if (to) {
        return (
            <li>
                <NavLink
                    to={to}
                    onClick={onClick}
                    className={({ isActive }) =>
                        `${baseClass} ${isActive ? activeClass : ""}`
                    }
                >
                    {content}
                </NavLink>
            </li>
        );
    }

    return (
        <li
            onClick={onClick}
            className={baseClass}
        >
            {content}
        </li>
    );
}