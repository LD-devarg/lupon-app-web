import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// SERVICES
import {
  getContacto,
  actualizarContacto,
} from "../services/api/contacts";

export default function EditContact() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contacto, setContacto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ============================
  //     CARGA INICIAL
  // ============================
  useEffect(() => {
    const cargarContacto = async () => {
      try {
        const data = await getContacto(id);
        setContacto(data);
      } catch (err) {
        console.error(err);
        setErrorMsg("No se pudo cargar el contacto");
      } finally {
        setLoading(false);
      }
    };

    cargarContacto();
  }, [id]);

  // ============================
  //     HANDLE CHANGE
  // ============================
  const handleChange = (e) => {
    setContacto({
      ...contacto,
      [e.target.name]: e.target.value,
    });
  };

  // ============================
  //       GUARDAR CAMBIOS
  // ============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const payload = {
        nombre: contacto.nombre,
        email: contacto.email,
        telefono: contacto.telefono,
        tipo: contacto.tipo,
        calle: contacto.calle,
        numero: contacto.numero,
        ciudad: contacto.ciudad,
        provincia: contacto.provincia,
      };

      await actualizarContacto(id, payload);

      navigate("/contacts");
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-white p-4">Cargando...</p>;
  }

  if (!contacto) {
    return (
      <p className="text-red-400 p-4">
        No se encontró el contacto indicado.
      </p>
    );
  }

  return (
    <div className="p-5">

      <h2 className="text-white text-xl font-semibold mb-4">
        Editar Contacto #{contacto.id}
      </h2>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-400 text-red-300 rounded-xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-white">

        {/* Nombre */}
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input
            name="nombre"
            value={contacto.nombre || ""}
            onChange={handleChange}
            required
            className="w-full p-2 rounded-xl bg-white/10 text-white"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={contacto.email || ""}
            onChange={handleChange}
            className="w-full p-2 rounded-xl bg-white/10"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm mb-1">Teléfono</label>
          <input
            name="telefono"
            value={contacto.telefono || ""}
            onChange={handleChange}
            className="w-full p-2 rounded-xl bg-white/10"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm mb-1">Tipo</label>
          <select
            name="tipo"
            value={contacto.tipo || "cliente"}
            onChange={handleChange}
            className="w-full p-2 rounded-xl bg-white/10"
          >
            <option value="cliente">Cliente</option>
            <option value="proveedor">Proveedor</option>
          </select>
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm mb-1">Calle</label>
          <input
            name="calle"
            value={contacto.calle || ""}
            onChange={handleChange}
            className="w-full p-2 rounded-xl bg-white/10"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Número</label>
          <input
            name="numero"
            value={contacto.numero || ""}
            onChange={handleChange}
            className="w-full p-2 rounded-xl bg-white/10"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Ciudad</label>
          <input
            name="ciudad"
            value={contacto.ciudad || ""}
            onChange={handleChange}
            className="w-full p-2 rounded-xl bg-white/10"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Provincia</label>
          <input
            name="provincia"
            value={contacto.provincia || ""}
            onChange={handleChange}
            className="w-full p-2 rounded-xl bg-white/10"
          />
        </div>

        {/* Botón Guardar */}
        <button
          type="submit"
          disabled={saving}
          className="
            w-full py-3 rounded-xl 
            bg-blue-600 hover:bg-blue-700 transition
            disabled:bg-blue-600/40 disabled:cursor-not-allowed
          "
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>

        {/* Cancelar */}
        <button
          type="button"
          onClick={() => navigate("/contacts")}
          className="w-full py-3 rounded-xl bg-gray-600 hover:bg-gray-700 transition"
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}
