import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useEffect, useState } from "react";
import { getDetallesVenta } from "../services/api/ventas";

export default function SellDetailModal({ open, onClose, venta }) {
  const [detalles, setDetalles] = useState([]);

  useEffect(() => {
    if (!venta) return;

    const cargarDetalles = async () => {
      const data = await getDetallesVenta(venta.pedido);
      setDetalles(data);
    };

    cargarDetalles();
  }, [venta]);

  if (!venta) return null;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">

      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-5">
        <DialogPanel className="w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-xl p-6 text-white">

          <div className="flex justify-between items-center mb-4">
            <DialogTitle className="text-xl font-semibold">
              Venta #{venta.id}
            </DialogTitle>

            <button onClick={onClose} className="text-white/60 hover:text-white">
              ✕
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">Cliente:</span> {venta.pedido_cliente_nombre}</p>
            <p><span className="text-gray-400">Fecha:</span> {venta.fecha_venta}</p>
            <p><span className="text-gray-400">Forma de pago:</span> {venta.forma_pago}</p>
            <p><span className="text-gray-400">Total:</span> ${venta.total}</p>
          </div>

          <div className="mt-4 border-t border-white/10 pt-3">
            <h3 className="font-semibold text-gray-300 mb-2">Productos</h3>

            {detalles.length === 0 ? (
              <p className="text-gray-400">Sin productos</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {detalles.map((d) => (
                  <li key={d.id} className="flex justify-between">
                    <span>{d.producto_nombre} x{d.cantidad}</span>
                    <span>${d.precio_unitario}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
          >
            Cerrar
          </button>

        </DialogPanel>
      </div>

    </Dialog>
  );
}
