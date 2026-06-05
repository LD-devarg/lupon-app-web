import Logo from "../../assets/logo-lupon.png";
import { HomeIcon } from "@heroicons/react/24/outline";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import { UsersIcon } from "@heroicons/react/24/outline";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { TruckIcon } from "@heroicons/react/24/outline";
import { CogIcon } from "@heroicons/react/24/outline";
import { ArrowLeftStartOnRectangleIcon } from "@heroicons/react/24/outline";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { DocumentCurrencyDollarIcon } from "@heroicons/react/24/outline";
import ButtonSidebar from "./ButtonSidebar";

const buttonsSidebar = [
    {
        icon: <HomeIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Inicio",
    },
    {
        icon: <ShoppingBagIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Pedidos",
    },
    {
        icon: <TruckIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Reparto",
    },
    {
        icon: <CurrencyDollarIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Cuentas corrientes",
    },
    {
        icon: <DocumentCurrencyDollarIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Compras",
    },
    {
        icon: <BanknotesIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Caja",
    },
    {
        icon: <UsersIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Contactos",
    },
    {
        icon: <ShoppingBagIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Productos",
    },
    {
        icon: <CogIcon className="h-6 w-6 flex-shrink-0" />,
        label: "Configuración",
    },
];

export default function Sidebar() {
    return (
        <div className="w-16 hover:w-48 h-full bg-gradient-to-b from-[#111111] to-[#222222] flex flex-col transition-all duration-300 ease-in-out group shadow-xl overflow-hidden select-none z-20 flex-shrink-0">
            <div className="flex items-center gap-3 p-3 overflow-hidden border-b border-white/5 h-14">
                <img className="h-10 w-10 flex-shrink-0 object-contain" src={Logo} alt="Lupon Logo" />
                <span className="text-white text-[14px] font-bold text-left transition-opacity duration-300 opacity-0 group-hover:opacity-100 leading-tight whitespace-nowrap">
                    Lupon <br />Distribuidora
                </span>
            </div>
            <div className="flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden">
                <ul className="text-white text-[14px] flex flex-col gap-2">
                    {buttonsSidebar.map((button) => (
                        <ButtonSidebar
                            key={button.label}
                            icon={button.icon}
                            label={button.label}
                        />
                    ))}
                </ul>
            </div>
            <div className="border-t border-white/5 p-2">
                <ButtonSidebar
                    icon={<ArrowLeftStartOnRectangleIcon className="h-6 w-6 flex-shrink-0" />}
                    label="Cerrar sesión"
                />
            </div>
        </div>
    );
}