import { useEffect } from "react";
import { useHeaderTitle } from "../layouts/DesktopLayout";
import CardData from "../components/ui/CardData";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { TruckIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/outline";



const data = [
    { title: "Pedidos pendientes", value: "$123.456", description: "Pendientes de preparación", icon: ShoppingCartIcon },
    { title: "Pendientes", value: "$123.456", description: "Pendientes de cobro", icon: BanknotesIcon },
    { title: "Entregados", value: "$123.456", description: "Entregados", icon: TruckIcon },
    { title: "Cancelados", value: "$123.456", description: "Cancelados", icon: XMarkIcon },
];

export default function Home() {
    const { setTitle } = useHeaderTitle();

    useEffect(() => {
        setTitle("Inicio");
    }, [setTitle]);

    return (
        <div className="space-y-8 text-white p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.map((item, index) => (
                    <CardData key={index} {...item} />
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-stone-900/30 p-6 rounded-2xl border border-stone-900 hover:border-stone-800 transition duration-300">
                    <h2 className="text-lg font-semibold mb-2">Ventas</h2>
                    <p className="text-sm text-stone-400">Resumen y accesos de ventas.</p>
                </div>
                <div className="bg-stone-900/30 p-6 rounded-2xl border border-stone-900 hover:border-stone-800 transition duration-300">
                    <h2 className="text-lg font-semibold mb-2">Compras</h2>
                    <p className="text-sm text-stone-400">Resumen y accesos de compras.</p>
                </div>
                <div className="bg-stone-900/30 p-6 rounded-2xl border border-stone-900 hover:border-stone-800 transition duration-300">
                    <h2 className="text-lg font-semibold mb-2">Caja</h2>
                    <p className="text-sm text-stone-400">Resumen y movimientos de caja.</p>
                </div>
                <div className="bg-stone-900/30 p-6 rounded-2xl border border-stone-900 hover:border-stone-800 transition duration-300">
                    <h2 className="text-lg font-semibold mb-2">Contactos</h2>
                    <p className="text-sm text-stone-400">Gestión de clientes y proveedores.</p>
                </div>
                <div className="bg-stone-900/30 p-6 rounded-2xl border border-stone-900 hover:border-stone-800 transition duration-300">
                    <h2 className="text-lg font-semibold mb-2">Productos</h2>
                    <p className="text-sm text-stone-400">Catálogo y lista de precios.</p>
                </div>
                <div className="bg-stone-900/30 p-6 rounded-2xl border border-stone-900 hover:border-stone-800 transition duration-300">
                    <h2 className="text-lg font-semibold mb-2">Logística</h2>
                    <p className="text-sm text-stone-400">Rutas de entregas y repartos.</p>
                </div>
            </div>
        </div>
    );
}