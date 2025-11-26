import { useEffect, useState } from "react";
import { getVentas } from "../services/api/ventas";
import SellDetailModal from "../components/SellDetailModal";

export default function Sells() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const cargarVentas = async () => {
    try {
      const data = await getVentas();
      setVentas(data);
    } catch (error) {
      console.error("Error cargando ventas:", error);
    }
  };

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      await cargarVentas();
      setLoading(false);
    };
    cargar();
  }, []);

  return (
    <div className="p-4 mt-4">

      <h2 className="text-white text-xl font-semibold mb-4">Ventas</h2>

      {loading ? (
        <p className="text-gray-300">Cargando...</p>
      ) : ventas.length === 0 ? (
        <p className="text-gray-400 text-center mt-6">No hay ventas realizadas.</p>
      ) : (
        <div className="space-y-3">
          {ventas.map((v) => (
            <div
              key={v.id}
              onClick={() => setVentaSeleccionada(v)}
              className="
                cursor-pointer p-4 rounded-2xl bg-slate-800/70 backdrop-blur-sm
                text-white shadow-lg transition hover:scale-[1.01]
              "
            >
              <p className="font-semibold text-lg">Venta #{v.id}</p>
              <p className="text-gray-300">{v.pedido_cliente_nombre}</p>
              <p className="text-gray-400 text-sm">Fecha: {v.fecha_venta}</p>
              <p className="mt-1">
                Total: <span className="font-bold">${v.total}</span>
              </p>
              <p className="text-gray-400 text-sm">
                Forma de pago: {v.forma_pago}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalle */}
      <SellDetailModal
        open={!!ventaSeleccionada}
        onClose={() => setVentaSeleccionada(null)}
        venta={ventaSeleccionada}
      />

    </div>
  );
}
