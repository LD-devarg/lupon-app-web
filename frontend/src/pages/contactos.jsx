import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import {
  createContacto,
  deleteContacto,
  getContactos,
  updateContacto,
} from "../services/api/contactos";

const TIPOS = ["cliente", "proveedor"];
const CATEGORIAS = ["Mayorista", "Mayorista Exclusivo", "Minorista"];
const FORMAS_PAGO = ["contado", "cuenta corriente"];

export default function Contactos() {
  const [contactos, setContactos] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [nombreFiltro, setNombreFiltro] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "",
    nombre: "",
    email: "",
    telefono: "",
    categoria: "",
    forma_pago: "",
    dias_cc: "",
    calle: "",
    numero: "",
    ciudad: "",
  });

  const loadContactos = async () => {
    setError("");
    try {
      setIsLoading(true);
      const data = await getContactos({ useCache: false });
      setContactos(data || []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los contactos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContactos();
  }, []);

  const filteredContactos = useMemo(() => {
    if (!useFiltro) return contactos;
    const nombre = nombreFiltro.trim().toLowerCase();
    return contactos.filter((contacto) => {
      const matchTipo = tipoFiltro ? contacto.tipo === tipoFiltro : true;
      const matchNombre = nombre
        ? contacto.nombre?.toLowerCase().includes(nombre)
        : true;
      return matchTipo && matchNombre;
    });
  }, [useFiltro, contactos, tipoFiltro, nombreFiltro]);

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      tipo: "",
      nombre: "",
      email: "",
      telefono: "",
      categoria: "",
      forma_pago: "",
      dias_cc: "",
      calle: "",
      numero: "",
      ciudad: "",
    });
    setEditingId(null);
    setFormError("");
    setIsModalOpen(false);
  };

  const handleEdit = (contacto) => {
    setEditingId(contacto.id);
    setIsModalOpen(true);
    setForm({
      tipo: contacto.tipo || "",
      nombre: contacto.nombre || "",
      email: contacto.email || "",
      telefono: contacto.telefono || "",
      categoria: contacto.categoria || "",
      forma_pago: contacto.forma_pago || "",
      dias_cc: contacto.dias_cc ?? "",
      calle: "",
      numero: "",
      ciudad: "",
    });
    setFormError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminar contacto?")) return;
    try {
      await deleteContacto(id);
      await loadContactos();
    } catch (err) {
      setError(err?.message || "No se pudo eliminar el contacto.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.tipo || !form.nombre) {
      setFormError("Completa tipo y nombre.");
      return;
    }
    try {
      const payload = {
        tipo: form.tipo,
        nombre: form.nombre,
        email: form.email,
      };
      if (form.telefono.trim()) payload.telefono = form.telefono.trim();
      if (form.categoria) payload.categoria = form.categoria;
      if (form.forma_pago) payload.forma_pago = form.forma_pago;
      if (form.dias_cc !== "") payload.dias_cc = Number(form.dias_cc);
      if (form.calle && form.numero && form.ciudad) {
        payload.calle = form.calle.trim();
        payload.numero = form.numero.trim();
        payload.ciudad = form.ciudad.trim();
      }
      if (editingId) {
        await updateContacto(editingId, payload);
      } else {
        await createContacto(payload);
      }
      await loadContactos();
      resetForm();
    } catch (err) {
      setFormError(err?.message || "No se pudo guardar el contacto.");
    }
  };

  const handleBuscar = (event) => {
    event.preventDefault();
    setUseFiltro(true);
  };

  const handleLimpiar = () => {
    setTipoFiltro("");
    setNombreFiltro("");
    setUseFiltro(false);
  };

  const formatArs = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (Number.isNaN(number)) return "-";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(number);
  };

  const formatTipo = (value) => {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  return (
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Contactos</h2>
      <p className="mt-1 text-sm text-gray-600">
        Gestion de clientes y proveedores.
      </p>

      <form
        className="mt-4 grid grid-cols-3 gap-3 rounded-xl pedidos-shadow p-4 text-left"
        onSubmit={handleBuscar}
      >
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">Tipo</label>
          <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300">
            <select
              className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
              value={tipoFiltro}
              onChange={(event) => setTipoFiltro(event.target.value)}
            >
              <option value="">Todos</option>
              {TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col col-span-2">
          <label className="text-sm font-medium text-gray-700">Nombre</label>
          <input
            type="text"
            placeholder="Buscar por nombre"
            className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
            value={nombreFiltro}
            onChange={(event) => setNombreFiltro(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full rounded-xl px-3 col-span-1 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
        >
          Filtrar
        </Button>
        <Button
          type="button"
          className="w-full rounded-xl px-3 col-span-1 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          Crear contacto
        </Button>
        <Button
          type="button"
          className="w-full rounded-xl px-3 col-span-1 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={handleLimpiar}
        >
          Limpiar filtros
        </Button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-600">Cargando contactos...</p>
        ) : null}
        {!isLoading && filteredContactos.length === 0 ? (
          <p className="text-sm text-gray-600">No hay registros para mostrar.</p>
        ) : null}
        {filteredContactos.map((contacto) => (
          <div
            key={contacto.id}
            className="neuro-shadow-div p-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                {contacto.nombre}
              </span>
              <span className="text-xs rounded-full bg-neutral-300 px-2 py-1 text-gray-700">
                {formatTipo(contacto.tipo)}
              </span>
            </div>
            <p className="text-sm text-gray-700">Email: {contacto.email}</p>
            <p className="text-sm text-gray-700">Telefono: {contacto.telefono}</p>
            <p className="text-sm text-gray-700">
              Categoria: {contacto.categoria || "-"}
            </p>
            <p className="text-sm text-gray-700">
              Saldo: {formatArs(contacto.saldo_contacto)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleEdit(contacto)}
              >
                Editar
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleDelete(contacto.id)}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-lg rounded-xl bg-white p-4 text-left shadow-xl">
            <Button
              type="button"
              className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              onClick={resetForm}
            >
              X
            </Button>
            <h3 className="text-lg font-semibold text-gray-800">
              {editingId ? "Editar contacto" : "Nuevo contacto"}
            </h3>
            <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
              {formError ? (
                <p className="text-sm text-red-600">{formError}</p>
              ) : null}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                  <select
                    className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                    value={form.tipo}
                    onChange={(event) => handleInputChange("tipo", event.target.value)}
                  >
                    <option value="">Seleccionar tipo</option>
                    {TIPOS.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.nombre}
                    onChange={(event) => handleInputChange("nombre", event.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.email}
                    onChange={(event) => handleInputChange("email", event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Telefono</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.telefono}
                    onChange={(event) => handleInputChange("telefono", event.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Categoria</label>
                  <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                    <select
                      className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                      value={form.categoria}
                      onChange={(event) =>
                        handleInputChange("categoria", event.target.value)
                      }
                    >
                      <option value="">Sin categoria</option>
                      {CATEGORIAS.map((categoria) => (
                        <option key={categoria} value={categoria}>
                          {categoria}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Forma de pago</label>
                  <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                    <select
                      className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                      value={form.forma_pago}
                      onChange={(event) =>
                        handleInputChange("forma_pago", event.target.value)
                      }
                    >
                      <option value="">Sin definir</option>
                      {FORMAS_PAGO.map((forma) => (
                        <option key={forma} value={forma}>
                          {forma}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Dias CC</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.dias_cc}
                    onChange={(event) => handleInputChange("dias_cc", event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Calle</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.calle}
                    onChange={(event) => handleInputChange("calle", event.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Numero</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.numero}
                    onChange={(event) => handleInputChange("numero", event.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Ciudad</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.ciudad}
                    onChange={(event) => handleInputChange("ciudad", event.target.value)}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
              >
                {editingId ? "Actualizar contacto" : "Crear contacto"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                  onClick={resetForm}
                >
                  Cancelar edicion
                </Button>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}


