import Logo from "../../assets/logo-lupon.png";
import { HomeIcon } from "@heroicons/react/24/outline";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import { UsersIcon } from "@heroicons/react/24/outline";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { TruckIcon } from "@heroicons/react/24/outline";
import { CogIcon } from "@heroicons/react/24/outline";
import { ArrowLeftStartOnRectangleIcon, XMarkIcon, BanknotesIcon, DocumentCurrencyDollarIcon } from "@heroicons/react/24/outline";
import ButtonSidebar from "./ButtonSidebar";

const buttonsSidebar = [
    {
        icon: <HomeIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Inicio",
        to: "/home",
    },
    {
        icon: <ShoppingBagIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Pedidos",
        to: "/pedidos-ventas/listado",
    },
    {
        icon: <TruckIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Reparto",
        to: "/logistica",
    },
    {
        icon: <CurrencyDollarIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Cuentas corrientes",
        to: "/cuenta-corriente-clientes",
    },
    {
        icon: <DocumentCurrencyDollarIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Compras",
        to: "/compras",
    },
    {
        icon: <BanknotesIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Caja",
        to: "/caja",
    },
    {
        icon: <UsersIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Contactos",
        to: "/contactos",
    },
    {
        icon: <ShoppingBagIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Productos",
        to: "/productos",
    },
    {
        icon: <CogIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Configuración",
        to: "/configuraciones",
    },
];

export default function Sidebar({ showLabel = false, onClose }) {
    const containerClasses = showLabel
        ? "w-full h-full bg-gradient-to-b from-[#111111] to-[#222222] flex flex-col shadow-xl select-none"
        : "w-16 hover:w-48 h-full bg-gradient-to-b from-[#111111] to-[#222222] flex flex-col transition-all duration-300 ease-in-out group shadow-xl overflow-hidden select-none z-20 flex-shrink-0 hidden md:flex";

    const logoTextClasses = showLabel
        ? "text-white text-[14px] font-bold text-left leading-tight whitespace-nowrap opacity-100"
        : "text-white text-[14px] font-bold text-left transition-opacity duration-300 opacity-0 group-hover:opacity-100 leading-tight whitespace-nowrap";

    return (
        <div className={containerClasses}>
            <div className="flex items-center gap-3 p-3 overflow-hidden border-b border-white/5 h-14 flex-shrink-0">
                <img className="h-10 w-10 flex-shrink-0 object-contain" src={Logo} alt="Lupon Logo" />
                <span className={logoTextClasses}>
                    Lupon <br />Distribuidora
                </span>
                {showLabel && onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-auto text-stone-400 hover:text-white p-1 rounded-md hover:bg-stone-850 transition duration-155"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
            <div className="flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden">
                <ul className="text-white text-[14px] flex flex-col gap-2">
                    {buttonsSidebar.map((button) => (
                        <ButtonSidebar
                            key={button.label}
                            icon={button.icon}
                            label={button.label}
                            to={button.to}
                            showLabel={showLabel}
                            onClick={() => {
                                if (onClose) onClose();
                                if (button.onClick) button.onClick();
                            }}
                        />
                    ))}
                </ul>
            </div>
            <div className="border-t border-white/5 p-2 flex-shrink-0">
                <ButtonSidebar
                    icon={<ArrowLeftStartOnRectangleIcon className="h-6 w-6 flex-shrink-0" />}
                    label="Cerrar sesión"
                    showLabel={showLabel}
                    onClick={() => {
                        if (onClose) onClose();
                        localStorage.removeItem("authAccessToken");
                        window.location.reload();
                    }}
                />
            </div>
        </div>
    );
}