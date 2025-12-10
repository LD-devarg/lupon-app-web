import { useState } from "react";
import { crearContacto } from "../services/api/contacts";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function NewContactModal({ open, onClose }) {
  if (!open) return null;

  // Form state
  const [tipo, setTipo] = useState("cliente");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [ciudad, setCiudad] = useState("Mar del Plata");
  const [provincia, setProvincia] = useState("Buenos Aires");
  const [tipoPago, setTipoPago] = useState("contado");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const resetForm = () => {
    setTipo("cliente");
    setNombre("");
    setEmail("");
    setTelefono("");
    setCalle("");
    setNumero("");
    setCiudad("Mar del Plata");
    setProvincia("Buenos Aires");
    setTipoPago("contado");
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nombre.trim()) {
      setErrorMsg("El nombre es obligatorio.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Ingresá un email válido.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        tipo,
        nombre,
        email,
        telefono,
        calle,
        numero,
        ciudad,
        provincia,
        tipo_pago: tipoPago,
        activo: true,
      };

      await crearContacto(payload);

      resetForm();
      onClose(); // cerrar modal

    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo crear el contacto. Verificá que el email no esté repetido.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      
      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-end justify-center px-4 pb-6">
        <DialogPanel className="w-full max-w-md bg-slate-900 rounded-2xl p-5 text-white shadow-xl">

          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <DialogTitle className="text-lg font-semibold">Nuevo Contacto</DialogTitle>
            <button onClick={onClose}>
              <XMarkIcon className="h-6 w-6 text-white/70 hover:text-white" />
            </button>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="mb-3 p-2 bg-red-500/20 border border-red-400 text-red-300 rounded-xl text-sm">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-sm">

            {/* Tipo */}
            <div>
              <label className="block mb-1 text-gray-300">Tipo de contacto</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-xl"
              >
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
              </select>
            </div>

            {/* Nombre */}
            <div>
              <label className="block mb-1 text-gray-300">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-xl"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block mb-1 text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-xl"
                placeholder="correo@ejemplo.com"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block mb-1 text-gray-300">Teléfono</label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-xl"
                placeholder="223..."
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block mb-1 text-gray-300">Calle</label>
              <input
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-xl"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-300">Número</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-xl"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-300">Ciudad</label>
              <input
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-xl"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-300">Provincia</label>
              <input
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-xl"
                placeholder="Ej: Buenos Aires"
              />
            </div>

            {/* Tipo de pago */}
            <div>
              <label className="block mb-1 text-gray-300">Tipo de pago</label>
              <select
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value)}
                className="w-full p-2 bg-slate-800 rounded-xl"
              >
                <option value="contado">Contado</option>
                <option value="cuenta corriente">Cuenta Corriente</option>
              </select>
            </div>

            {/* Botón Crear */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition 
                         disabled:bg-blue-600/40 disabled:cursor-not-allowed mt-2"
            >
              {saving ? "Guardando..." : "Crear Contacto"}
            </button>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
