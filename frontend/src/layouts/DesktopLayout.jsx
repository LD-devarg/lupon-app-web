/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/ui/Sidebar";
import Navbar from "../components/ui/Navbar";
import { Bars3Icon } from "@heroicons/react/24/outline";
import Logo from "../assets/logo-lupon.png";

const TitleContext = createContext(null);

export function useHeaderTitle() {
    const context = useContext(TitleContext);
    if (!context) {
        return { title: "", setTitle: () => { }, setActions: () => { } };
    }
    return context;
}

const FALLBACK_TITLES = {
    "/home": "Inicio",
    "/ventas": "Ventas",
    "/cobros": "Cobros",
    "/cobros/listado": "Listado de Cobros",
    "/productos": "Productos",
    "/contactos": "Contactos",
    "/logistica": "Logística",
    "/compras": "Compras",
    "/compras/listado": "Listado de Compras",
    "/pagos": "Pagos",
    "/pagos/listado": "Listado de Pagos",
    "/caja": "Caja",
    "/notas-credito": "Notas de Crédito",
    "/notas-credito/listado": "Listado de Notas de Crédito",
    "/dashboard": "Dashboard Financiero",
    "/cuenta-corriente-clientes": "Cuenta Corriente de Clientes",
};

export default function DesktopLayout({ children }) {
    const [title, setTitle] = useState("");
    const [actions, setActions] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Reset title, actions and close mobile menu when navigating to a new path
    useEffect(() => {
        setTitle("");
        setActions(null);
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const currentPath = location.pathname;
    const fallbackTitle = FALLBACK_TITLES[currentPath] || "";
    const displayTitle = title || fallbackTitle;

    const isAuthPage = ["/", "/login", "/register"].includes(currentPath);

    return (
        <TitleContext.Provider value={{ title, setTitle, actions, setActions }}>
            {isAuthPage ? (
                <div className="h-screen bg-[#0a0a0a]">{children}</div>
            ) : (
                <div className="flex flex-col md:flex-row h-screen bg-[#0a0a0a] overflow-hidden">
                    {/* Mobile topbar */}
                    <div className="flex md:hidden items-center justify-between px-4 h-14 border-b border-stone-900 bg-[#111111] select-none flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="text-white hover:text-lime-400 p-1"
                        >
                            <Bars3Icon className="h-6 w-6" />
                        </button>
                        <h1 className="text-lg font-semibold text-white truncate px-2">
                            {displayTitle}
                        </h1>
                        <img className="h-8 w-8 object-contain" src={Logo} alt="Lupon Logo" />
                    </div>

                    {/* Mobile Drawer (Overlay & Panel) */}
                    {isMobileMenuOpen && (
                        <div className="fixed inset-0 z-50 md:hidden flex">
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />

                            {/* Sidebar Drawer Panel */}
                            <div className="relative flex-1 flex flex-col max-w-[260px] w-full bg-[#111111] shadow-2xl transition-transform duration-300 ease-in-out">
                                <Sidebar showLabel={true} onClose={() => setIsMobileMenuOpen(false)} />
                            </div>
                        </div>
                    )}

                    {/* Desktop Sidebar (hidden on mobile via internal classes) */}
                    <Sidebar />

                    {/* Main Content */}
                    <main className="flex-1 p-4 overflow-hidden flex flex-col">
                        <div className="mb-4 border-b border-stone-900 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-4">
                                {displayTitle && (
                                    <h1 className="hidden md:block text-2xl font-semibold text-white p-1">
                                        {displayTitle}
                                    </h1>
                                )}
                                {actions && <div className="flex items-center gap-2">{actions}</div>}
                            </div>
                            <Navbar />
                        </div>
                        <div className="flex-1 overflow-auto">
                            {children}
                        </div>
                    </main>
                </div>
            )}
        </TitleContext.Provider>
    );
}
