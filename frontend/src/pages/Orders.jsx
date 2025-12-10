import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderDetailModal from "../components/OrderDetailModal";
import { getPedidosVentas } from "../services/api/pedidosVentas";

export default function Orders() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const navigate = useNavigate();

  /* -------------------------------
     Función reutilizable para cargar
  -------------------------------- */
  const cargarPedidos = async () => {
    try {
      const data = await getPedidosVentas();
      setPedidos(data);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    }
  };

  /* -------------------------------
     Cargar pedidos al montar
  -------------------------------- */
  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        setLoading(true);
        await cargarPedidos();
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  return (
    <div className="p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-semibold">Pedidos de Venta</h2>
        <button
          onClick={() => navigate("/orders/new")}
          className="px-4 py-2 rounded-xl bg-blue-600/60 hover:bg-blue-600 transition text-white"
        >
          Nuevo Pedido
        </button>
      </div>

      {/* LISTA */}
      {loading ? (
        <p className="text-gray-300">Cargando...</p>
      ) : pedidos.length === 0 ? (
        <p className="text-gray-400 text-center mt-6">No hay pedidos cargados.</p>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => (
            <div
              key={p.id}
              onClick={() => setPedidoSeleccionado(p)}
              className="
                cursor-pointer p-4 rounded-2xl bg-slate-800/70 backdrop-blur-sm
                text-white shadow-lg transition hover:scale-[1.01]
              "
            >
              <div className="flex justify-between">
                <div>
                  <p className="text-lg font-semibold">Pedido #{p.id}</p>
                  <p className="text-sm text-gray-300">{p.cliente_nombre}</p>

                  {p.cliente_direccion && (
                    <p className="text-sm text-gray-400">{p.cliente_direccion}</p>
                  )}

                  <p className="text-sm text-gray-400">Fecha: {p.fecha}</p>

                  <p className="text-sm mt-1">
                    Total: <span className="font-semibold">${p.total_calculado}</span>
                  </p>
                </div>

                <EstadoBadge estado={p.estado} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DETALLE */}
      <OrderDetailModal
        open={!!pedidoSeleccionado}
        onClose={() => {
          setPedidoSeleccionado(null);
          cargarPedidos(); // refrescar lista después de cambios
        }}
        pedido={pedidoSeleccionado}
      />
    </div>
  );
}

function EstadoBadge({ estado }) {
  let color = "text-gray-400";
  let bg = "bg-gray-600/20";

  if (estado === "pendiente") {
    color = "text-yellow-400";
    bg = "bg-yellow-600/20";
  }
  if (estado === "aceptado") {
    color = "text-green-400";
    bg = "bg-green-600/20";
  }
  if (estado === "cancelado") {
    color = "text-red-400";
    bg = "bg-red-600/20";
  }

  return (
    <span className={`h-fit px-3 py-1 rounded-full ${bg} ${color} text-xs`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  );
}
