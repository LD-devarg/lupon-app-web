import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";

export default function PopupGeneratedSell({ open, onClose, ventaId }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-2xl bg-slate-900/90 p-6 text-white shadow-xl">

          <DialogTitle className="text-lg font-semibold mb-2">
            Nueva Venta creada
          </DialogTitle>

          <p className="text-gray-300 mb-4">
            La venta se generó correctamente. N° <strong>{ventaId}</strong>
          </p>

          <div className="space-y-3">
            <button
              className="w-full py-2 rounded-xl bg-blue-600/60 hover:bg-blue-600 transition"
              onClick={() => {
                // Más adelante: navigate(`/ventas/${ventaId}`)
                console.log("Ver venta aún no implementado");
              }}
            >
              Ver Venta
            </button>

            <button
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
              onClick={onClose}
            >
              OK
            </button>
          </div>

        </DialogPanel>
      </div>
    </Dialog>
  );
}
