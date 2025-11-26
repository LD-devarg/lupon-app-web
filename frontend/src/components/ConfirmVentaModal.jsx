import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useState } from "react";

export default function ConfirmVentaModal({ open, onClose, pedido, onConfirm }) {
  const [formaPago, setFormaPago] = useState("contado");
  const [medioPago, setMedioPago] = useState("");

  const total = pedido.total_calculado || 0;

  const handleConfirm = () => {
    onConfirm({ forma_pago: formaPago, medio_pago: medioPago });
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="w-full max-w-md p-6 rounded-2xl bg-slate-900 text-white shadow-xl">

          <h2 className="text-xl font-semibold mb-4">Confirmar Venta</h2>

          <p className="text-gray-300 mb-4">
            Total del pedido: <span className="font-bold">${total}</span>
          </p>

          {/* Forma de pago */}
          <label className="block text-gray-400 mb-1">Forma de pago</label>
          <select
            value={formaPago}
            onChange={(e) => {
              setFormaPago(e.target.value);
              setMedioPago("");
            }}
            className="w-full p-3 rounded-lg bg-white/10 mb-4"
          >
            <option value="contado">Contado</option>
            <option value="cuenta corriente">Cuenta Corriente</option>
          </select>

          {/* Medio de pago */}
          {formaPago === "contado" && (
            <>
              <label className="block text-gray-400 mb-1">Medio de pago</label>
              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                className="w-full p-3 rounded-lg bg-white/10 mb-4"
              >
                <option value="">— Sin pagar por ahora —</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </>
          )}

          <button
            className="w-full py-3 mt-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
            onClick={handleConfirm}
          >
            Confirmar Venta
          </button>

          <button
            className="w-full py-2 mt-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
            onClick={onClose}
          >
            Cancelar
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
