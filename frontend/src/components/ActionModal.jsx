
function ActionModal({ open, onClose, onSelect }) {
  if (!open) return null;

  const handleSelect = (action) => {
    if (onSelect) onSelect(action);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >

      <div
        className="w-full max-w-md bg-white rounded-t-2xl p-4 pb-6 shadow-xl"
        onClick={(e) => e.stopPropagation()} // que no cierre al clickear adentro
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            ¿Qué querés cargar?
          </h3>
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <button
            type="button"
            className="border border-slate-200 rounded-xl px-3 py-3 text-left hover:border-sky-400 hover:bg-sky-50"
            onClick={() => handleSelect("sell")}
          >
            <div className="font-semibold text-slate-800">Nueva venta</div>
            <div className="text-xs text-slate-500">
              Registrar una venta y cobro
            </div>
          </button>

          <button
            type="button"
            className="border border-slate-200 rounded-xl px-3 py-3 text-left hover:border-sky-400 hover:bg-sky-50"
            onClick={() => handleSelect("expense")}
          >
            <div className="font-semibold text-slate-800">Nuevo gasto</div>
            <div className="text-xs text-slate-500">
              Registrar un egreso de caja
            </div>
          </button>

          <button
            type="button"
            className="border border-slate-200 rounded-xl px-3 py-3 text-left hover:border-sky-400 hover:bg-sky-50"
            onClick={() => handleSelect("sell-order")}
          >
            <div className="font-semibold text-slate-800">Nuevo pedido de venta</div>
            <div className="text-xs text-slate-500">
              Pedido pendiente de entrega
            </div>
          </button>

          <button
            type="button"
            className="border border-slate-200 rounded-xl px-3 py-3 text-left hover:border-sky-400 hover:bg-sky-50"
            onClick={() => handleSelect("contact")}
          >
            <div className="font-semibold text-slate-800">
              Nuevo contacto
            </div>
            <div className="text-xs text-slate-500">
              Cliente o proveedor nuevo
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActionModal;
