import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { eliminarContacto } from "../services/api/contacts";

export default function ContactDetailModal({ open, onClose, contacto }) {
  if (!contacto) return null;
  
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!window.confirm("¿Seguro de eliminar este contacto?")) return;

    try {
      await eliminarContacto(contacto.id);
      onClose(); // cerrar modal
    } catch (err) {
      console.error("Error eliminando contacto:", err);
      alert("No se pudo eliminar el contacto.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      
      {/* Backdrop */}
      <DialogBackdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Contenedor modal */}
      <div className="fixed inset-0 flex items-center justify-center px-4">
        <DialogPanel
          className="
            w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-xl
            p-6 text-white shadow-xl
          "
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <DialogTitle className="text-xl font-semibold">
              {contacto.nombre}
            </DialogTitle>
            <button onClick={onClose}>
              <XMarkIcon className="h-6 w-6 text-white/80 hover:text-white" />
            </button>
          </div>

          {/* Etiqueta tipo */}
          <span
            className={`text-xs px-3 py-1 rounded-full inline-block mb-3 ${
              contacto.tipo === "cliente"
                ? "bg-green-600/20 text-green-400"
                : "bg-blue-600/20 text-blue-400"
            }`}
          >
            {contacto.tipo === "cliente" ? "Cliente" : "Proveedor"}
          </span>

          {/* Teléfono */}
          <div className="mb-2 text-sm">
            <span className="text-gray-400">Teléfono:</span>{" "}
            {contacto.telefono || "No registrado"}
          </div>

          {/* Email */}
          <div className="mb-2 text-sm">
            <span className="text-gray-400">Email:</span>{" "}
            {contacto.email || "No registrado"}
          </div>

          {/* Dirección completa */}
          <div className="mb-4 text-sm">
            <span className="text-gray-400">Dirección:</span>{" "}
            {contacto.direccion_completa || "No especificada"}
          </div>

          {/* Saldo */}
          <div
            className={`mb-4 text-sm font-semibold ${
              contacto.saldo < 0
                ? "text-red-400"
                : contacto.saldo > 0
                ? "text-green-400"
                : "text-gray-300"
            }`}
          >
            Saldo: ${contacto.saldo}
          </div>

          {/* Botones */}
          <div className="grid grid-cols-1 gap-2 mt-4">

            {/* Editar */}
            <button
              onClick={() => navigate(`/contacts/edit/${contacto.id}`)}
              className="w-full py-2 rounded-xl bg-blue-600/40 hover:bg-blue-600/60 transition"
            >
              Editar Contacto
            </button>

            {/* Ver Cuenta Corriente (solo si corresponde) */}
            {contacto.tipo_pago === "cuenta corriente" && (
              <button
                onClick={() => navigate(`/ctacte/${contacto.id}`)}
                className="w-full py-2 rounded-xl bg-indigo-600/40 hover:bg-indigo-600/60 transition"
              >
                Ver Cuenta Corriente
              </button>
            )}

            {/* Eliminar */}
            <button
              onClick={handleDelete}
              className="w-full py-2 rounded-xl bg-red-600/40 hover:bg-red-600/60 transition text-red-200"
            >
              Eliminar Contacto
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
