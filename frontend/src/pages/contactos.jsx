import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import {
  createContacto,
  deleteContacto,
  getContactos,
  updateContacto,
} from "../services/api/contactos";
import { useHeaderTitle } from "../layouts/DesktopLayout";
import { FunnelIcon } from "@heroicons/react/24/outline";

const TIPOS = ["cliente", "proveedor"];
const CATEGORIAS = ["Mayorista", "Mayorista Exclusivo", "Minorista"];
const FORMAS_PAGO = ["contado", "cuenta corriente"];

export default function Contactos() {
  const { setTitle } = useHeaderTitle();
  const [contactos, setContactos] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [nombreFiltro, setNombreFiltro] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "",
    nombre: "",
    nombre_fantasia: "",
    email: "",
    telefono: "",
    categoria: "",
    forma_pago: "",
    dias_cc: "",
    calle: "",
    numero: "",
    ciudad: "",
  });

  useEffect(() => {
    setTitle("Contactos");
  }, [setTitle]);

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
        ? contacto.nombre?.toLowerCase().includes(nombre) ||
        contacto.nombre_fantasia?.toLowerCase().includes(nombre)
        : true;
      return matchTipo && matchNombre;
    });
  }, [useFiltro, contactos, tipoFiltro, nombreFiltro]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [nombreFiltro, tipoFiltro, useFiltro]);

  const totalPages = Math.ceil(filteredContactos.length / ITEMS_PER_PAGE) || 1;

  const displayedContactos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContactos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredContactos, currentPage]);

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      tipo: "",
      nombre: "",
      nombre_fantasia: "",
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
      nombre_fantasia: contacto.nombre_fantasia || "",
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
        nombre_fantasia: form.nombre_fantasia,
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
    <div className="mx-auto w-full max-w-[1400px] p-2 text-left text-white">
      <div>
        <p className="text-sm text-stone-400">
          Gestión de clientes y proveedores, categorías tarifarias e historial de saldos.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div></div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border ${
              isFilterOpen || tipoFiltro || nombreFiltro
                ? "bg-[#CAED4E] text-black border-transparent shadow-md"
                : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
            }`}
          >
            <FunnelIcon className="h-4 w-4 mr-1 inline-block" />
            Filtros {(tipoFiltro || nombreFiltro) && "(Activo)"}
          </Button>
          <Button
            type="button"
            className="rounded-xl px-4 py-2 text-xs font-semibold bg-[#CAED4E] text-black hover:opacity-90 transition duration-200"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            Crear contacto
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {isFilterOpen && (
        <form
          className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-stone-800 bg-[#111111] p-5 shadow-lg items-end"
          onSubmit={handleBuscar}
        >
          <div className="flex flex-col col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tipo de contacto</label>
            <select
              className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200 capitalize"
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
          <div className="flex flex-col md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Buscar por nombre</label>
            <div className="mt-2 flex gap-3 items-center w-full">
              <input
                type="text"
                placeholder="Buscar por nombre o fantasía..."
                className="flex-1 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-600 focus:border-stone-700 outline-none transition duration-200"
                value={nombreFiltro}
                onChange={(event) => setNombreFiltro(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap md:col-span-3 gap-3">
            <Button
              type="submit"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-[#CAED4E] text-black hover:opacity-90 transition duration-200 flex-1 md:flex-none"
            >
              Filtrar
            </Button>
            <Button
              type="button"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-stone-850 text-stone-300 hover:bg-stone-800 border border-stone-800 transition duration-200 flex-1 md:flex-none"
              onClick={handleLimpiar}
            >
              Limpiar filtros
            </Button>
          </div>
        </form>
      )}

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-900/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      {/* Grid of contact cards */}
      <div className="mt-6">
        {isLoading ? (
          <div className="text-center py-12 text-stone-400">
            <span className="inline-block w-6 h-6 border-2 border-[#CAED4E] border-t-transparent rounded-full animate-spin mr-2" />
            Cargando contactos...
          </div>
        ) : null}
        {!isLoading && filteredContactos.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-stone-800 text-stone-500">
            No se encontraron contactos en la base.
          </div>
        ) : null}

        {!isLoading && filteredContactos.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedContactos.map((contacto) => {
                const isCliente = contacto.tipo === "cliente";
                const saldo = Number(contacto.saldo_contacto || 0);
                return (
                  <div
                    key={contacto.id}
                    className="rounded-2xl border border-stone-800 bg-stone-900/10 p-5 shadow-xl hover:border-stone-700 transition duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-base font-bold text-stone-200 truncate">
                          {contacto.nombre}
                        </span>
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${isCliente
                          ? "bg-blue-950/40 text-blue-300 border border-blue-800/40"
                          : "bg-amber-950/40 text-amber-300 border border-amber-800/40"
                          }`}>
                          {formatTipo(contacto.tipo)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 border-t border-stone-900 pt-3 text-xs text-stone-400">
                        {contacto.nombre_fantasia && (
                          <p><span className="text-stone-500">Fantasía:</span> <span className="text-stone-300 font-medium">{contacto.nombre_fantasia}</span></p>
                        )}
                        <p><span className="text-stone-500">Email:</span> <span className="text-stone-300 font-medium">{contacto.email || "-"}</span></p>
                        <p><span className="text-stone-500">Teléfono:</span> <span className="text-stone-300 font-medium">{contacto.telefono || "-"}</span></p>
                        <p><span className="text-stone-500">Categoría:</span> <span className="text-stone-300 font-medium">{contacto.categoria || "-"}</span></p>
                      </div>
                    </div>

                    <div className="mt-0">
                      <div className="flex items-center justify-between border-t border-stone-900 pt-3 text-sm font-semibold mb-4">
                        <span className="text-stone-500">Saldo:</span>
                        <span className={saldo < 0 ? "text-rose-400" : saldo > 0 ? "text-emerald-400" : "text-stone-300"}>
                          {formatArs(contacto.saldo_contacto)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1 rounded-xl bg-stone-800 hover:bg-stone-700 py-2.5 text-xs font-bold text-stone-200 transition duration-200"
                          onClick={() => handleEdit(contacto)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 rounded-xl bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 border border-rose-800/40 py-2.5 text-xs font-bold transition duration-200"
                          onClick={() => handleDelete(contacto.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2 py-3 border-t border-stone-900">
                <div className="text-xs text-stone-500">
                  Mostrando <span className="font-semibold text-stone-300">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredContactos.length)}</span> a <span className="font-semibold text-stone-300">{Math.min(currentPage * ITEMS_PER_PAGE, filteredContactos.length)}</span> de <span className="font-semibold text-stone-300">{filteredContactos.length}</span> contactos
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 px-4 py-2 text-xs font-semibold disabled:opacity-40 disabled:hover:bg-stone-800 transition"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center text-xs text-stone-400 font-bold px-3">
                    Página {currentPage} de {totalPages}
                  </div>
                  <Button
                    type="button"
                    className="rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 px-4 py-2 text-xs font-semibold disabled:opacity-40 disabled:hover:bg-stone-800 transition"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CRUD modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-stone-900 border border-stone-800 p-6 text-left shadow-2xl text-white overflow-y-auto max-h-[90vh]">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-md p-1 text-stone-400 hover:text-white hover:bg-stone-800 transition"
              onClick={resetForm}
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId ? "Editar Contacto" : "Crear Nuevo Contacto"}
            </h3>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {formError ? (
                <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 px-4 py-2.5 text-xs text-rose-300">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tipo</label>
                <select
                  className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200 capitalize"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Nombre / Razón Social</label>
                  <input
                    type="text"
                    placeholder="Ej. Distribuidora S.A."
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                    value={form.nombre}
                    onChange={(event) => handleInputChange("nombre", event.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Nombre Fantasía</label>
                  <input
                    type="text"
                    placeholder="Ej. Lupon"
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                    value={form.nombre_fantasia}
                    onChange={(event) =>
                      handleInputChange("nombre_fantasia", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Email</label>
                  <input
                    type="email"
                    placeholder="ejemplo@mail.com"
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                    value={form.email}
                    onChange={(event) => handleInputChange("email", event.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej. 11 1234 5678"
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                    value={form.telefono}
                    onChange={(event) => handleInputChange("telefono", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Categoría Tarifaria</label>
                  <select
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200"
                    value={form.categoria}
                    onChange={(event) =>
                      handleInputChange("categoria", event.target.value)
                    }
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Forma de Pago Def.</label>
                  <select
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200"
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
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Límite de Cuenta Corriente (Días CC)</label>
                <input
                  type="number"
                  placeholder="Ej. 15"
                  className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                  value={form.dias_cc}
                  onChange={(event) => handleInputChange("dias_cc", event.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-stone-900 pt-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Calle</label>
                  <input
                    type="text"
                    className="mt-1.5 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                    value={form.calle}
                    onChange={(event) => handleInputChange("calle", event.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Número</label>
                  <input
                    type="text"
                    className="mt-1.5 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                    value={form.numero}
                    onChange={(event) => handleInputChange("numero", event.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Ciudad</label>
                  <input
                    type="text"
                    className="mt-1.5 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                    value={form.ciudad}
                    onChange={(event) => handleInputChange("ciudad", event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-stone-900">
                <Button
                  type="submit"
                  className="w-full rounded-xl px-4 py-3 text-sm font-semibold bg-[#CAED4E] text-black hover:opacity-90 transition duration-200"
                >
                  {editingId ? "Actualizar Contacto" : "Crear Contacto"}
                </Button>
                {editingId ? (
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 px-4 py-3 text-sm font-semibold transition duration-200"
                    onClick={resetForm}
                  >
                    Cancelar edición
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
