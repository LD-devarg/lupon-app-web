import { useState, useEffect } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import FullScreenOrderProductsModal from "./FullScreenOrderProductsModal";
import ConfirmVentaModal from "./ConfirmVentaModal";
import { cambiarEstadoPedidoVenta } from "../services/api/pedidosVentas";
import { createVentaFromPedido } from "../services/api/ventas";

export default function OrderDetailModal({ open, onClose, pedido }) {
  const [localPedido, setLocalPedido] = useState(pedido || {});
  const [loading, setLoading] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showConfirmVenta, setShowConfirmVenta] = useState(false);

  useEffect(() => {
    if (pedido) {
      setLocalPedido(pedido);
    }
  }, [pedido]);

  if (!pedido) return null;

  const handleChangeEstado = async (nuevoEstado) => {
    try {
      setLoading(true);

      await cambiarEstadoPedidoVenta(pedido.id, nuevoEstado);

      setLocalPedido((prev) => ({
        ...prev,
        estado: nuevoEstado,
      }));

      if (nuevoEstado === "aceptado") {
        setShowConfirmVenta(true);
      }
    } catch (err) {
      console.error("Error cambiando estado:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVenta = async ({ forma_pago, medio_pago }) => {
    try {
      setLoading(true);

      await createVentaFromPedido(pedido.id, forma_pago, medio_pago);

      setShowConfirmVenta(false);
      onClose();

    } catch (err) {
      console.error("Error generando venta:", err);
      alert("Hubo un error generando la venta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

        <div className="fixed inset-0 flex items-center justify-center p-5">
          <DialogPanel className="w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-xl p-6 text-white shadow-xl">

            <div className="flex justify-between items-center mb-4">
              <DialogTitle className="text-xl font-semibold">
                Pedido #{localPedido.id}
              </DialogTitle>

              <button onClick={onClose} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <p><span className="text-gray-400">Cliente:</span> {localPedido.cliente_nombre}</p>

              {localPedido.cliente_direccion && (
                <p className="text-gray-300">{localPedido.cliente_direccion}</p>
              )}

              <p>
                <span className="text-gray-400">Fecha:</span>{" "}
                {localPedido.fecha}
              </p>

              <p>
                <span className="text-gray-400">Total:</span>{" "}
                ${localPedido.total_calculado}
              </p>
            </div>

            <div className="mb-5">
              <label className="text-gray-400 block mb-1">Estado del Pedido</label>

              <select
                value={localPedido.estado}
                onChange={(e) => handleChangeEstado(e.target.value)}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-white/10 text-white"
              >
                <option value="pendiente">Pendiente</option>
                <option value="aceptado">Aceptado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div className="space-y-3 mt-4">
              <button
                className="w-full py-3 rounded-xl bg-blue-600/60 hover:bg-blue-600 transition"
                onClick={() => setShowFullScreen(true)}
              >
                Editar Productos
              </button>

              <button
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>

          </DialogPanel>
        </div>
      </Dialog>

      <FullScreenOrderProductsModal
        open={showFullScreen}
        onClose={() => setShowFullScreen(false)}
        pedidoId={pedido.id}
      />

      <ConfirmVentaModal
        open={showConfirmVenta}
        onClose={() => setShowConfirmVenta(false)}
        pedido={pedido}
        onConfirm={handleConfirmVenta}
      />
    </>
  );
}
