

export default function ButtonSidebar({
    icon,
    label
}) {
    return (
        <li className="flex items-center gap-2 px-3 py-2.5 rounded-[20px] text-white/80 hover:text-black hover:bg-lime-400 hover:font-medium transition-all duration-200 cursor-pointer w-full overflow-hidden whitespace-nowrap">
            {icon}
            <span className="transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                {label}
            </span>
        </li>
    );
}   