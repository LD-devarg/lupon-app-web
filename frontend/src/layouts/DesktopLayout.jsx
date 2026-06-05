import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/ui/Sidebar";
import Navbar from "../components/ui/Navbar";

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
    const location = useLocation();

    // Reset title and actions when navigating to a new path
    useEffect(() => {
        setTitle("");
        setActions(null);
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
                <div className="flex h-screen bg-[#0a0a0a]">
                    <Sidebar />
                    <main className="flex-1 p-4 overflow-hidden flex flex-col">
                        <div className="mb-4 border-b border-stone-900 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-4">
                                {displayTitle && (
                                    <h1 className="text-2xl font-semibold text-white p-1">
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
