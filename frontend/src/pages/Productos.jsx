import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { createProducto, deleteProducto, getProductos, updateProducto } from "../services/api/productos";
import { useHeaderTitle } from "../layouts/DesktopLayout";
import { FunnelIcon } from "@heroicons/react/24/outline";

const RUBROS = [
  "pollo entero",
  "trozados y derivados",
  "prefritos",
  "elaborados",
  "huevos",
  "panificados",
  "vegetales",
  "cerdo",
];

const UNIDADES = ["kg", "un"];

export default function Productos() {
  const { setTitle } = useHeaderTitle();
  const [productos, setProductos] = useState([]);
  const [preciosEditables, setPreciosEditables] = useState({});
  const [nombreFiltro, setNombreFiltro] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [error, setError] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    rubro: "",
    nombre: "",
    descripcion: "",
    unidad_medida: "",
    precio_compra: "",
    es_oferta: false,
    fecha_inicio_oferta: "",
    fecha_fin_oferta: "",
  });

  useEffect(() => {
    setTitle("Productos");
  }, [setTitle]);

  const loadProductos = async () => {
    setError("");
    try {
      setIsLoading(true);
      const data = await getProductos({ useCache: false });
      const items = data || [];
      setProductos(items);
      const editableMap = {};
      items.forEach((producto) => {
        editableMap[producto.id] = `${producto.precio_compra ?? ""}`;
      });
      setPreciosEditables(editableMap);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los productos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProductos();
  }, []);

  const filteredProductos = useMemo(() => {
    if (!useFiltro) return productos;
    const filtro = nombreFiltro.trim().toLowerCase();
    if (!filtro) return productos;
    return productos.filter((producto) =>
      producto.nombre?.toLowerCase().includes(filtro)
    );
  }, [useFiltro, nombreFiltro, productos]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [nombreFiltro, useFiltro]);

  const totalPages = Math.ceil(filteredProductos.length / ITEMS_PER_PAGE) || 1;

  const displayedProductos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProductos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProductos, currentPage]);

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      rubro: "",
      nombre: "",
      descripcion: "",
      unidad_medida: "",
      precio_compra: "",
      es_oferta: false,
      fecha_inicio_oferta: "",
      fecha_fin_oferta: "",
    });
    setEditingId(null);
    setFormError("");
    setIsModalOpen(false);
  };

  const handleEdit = (producto) => {
    setEditingId(producto.id);
    setIsModalOpen(true);
    setForm({
      rubro: producto.rubro || "",
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      unidad_medida: producto.unidad_medida || "",
      precio_compra: producto.precio_compra ?? "",
      es_oferta: Boolean(producto.es_oferta),
      fecha_inicio_oferta: producto.fecha_inicio_oferta || "",
      fecha_fin_oferta: producto.fecha_fin_oferta || "",
    });
    setFormError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminar producto?")) return;
    try {
      await deleteProducto(id);
      await loadProductos();
    } catch (err) {
      setError(err?.message || "No se pudo eliminar el producto.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.rubro || !form.nombre || !form.unidad_medida) {
      setFormError("Completa rubro, nombre y unidad.");
      return;
    }
    try {
      const payload = {
        rubro: form.rubro,
        nombre: form.nombre,
        unidad_medida: form.unidad_medida,
      };
      if (form.descripcion.trim()) {
        payload.descripcion = form.descripcion.trim();
      }
      if (form.precio_compra !== "") {
        payload.precio_compra = form.precio_compra;
      }
      payload.es_oferta = Boolean(form.es_oferta);
      if (form.fecha_inicio_oferta) {
        payload.fecha_inicio_oferta = form.fecha_inicio_oferta;
      }
      if (form.fecha_fin_oferta) {
        payload.fecha_fin_oferta = form.fecha_fin_oferta;
      }
      if (editingId) {
        await updateProducto(editingId, payload);
      } else {
        await createProducto(payload);
      }
      await loadProductos();
      resetForm();
    } catch (err) {
      setFormError(err?.message || "No se pudo guardar el producto.");
    }
  };

  const handleBuscar = (event) => {
    event.preventDefault();
    setUseFiltro(true);
  };

  const handleLimpiar = () => {
    setNombreFiltro("");
    setUseFiltro(false);
  };

  const parsePrecio = (value) => {
    if (value === null || value === undefined || value === "") return NaN;
    const number = Number(String(value).replace(",", "."));
    if (!Number.isFinite(number)) return NaN;
    return number;
  };

  const normalizarClave = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");

  const parseArchivoPrecios = (rows) => {
    const filas = Array.isArray(rows) ? rows : [];
    const byId = new Map(productos.map((p) => [String(p.id), p]));
    const byNombre = new Map(
      productos.map((p) => [String(p.nombre || "").trim().toLowerCase(), p])
    );
    const cambios = {};
    let aplicadas = 0;
    let omitidas = 0;

    filas.forEach((rawRow) => {
      const row = rawRow && typeof rawRow === "object" ? rawRow : {};
      const normalizada = {};
      Object.entries(row).forEach(([k, v]) => {
        normalizada[normalizarClave(k)] = v;
      });

      const idRaw = normalizada.id ?? normalizada.producto_id;
      const nombreRaw = normalizada.nombre ?? normalizada.producto ?? normalizada.nombre_producto;
      const precioRaw =
        normalizada.precio_compra ??
        normalizada.precio ??
        normalizada.costo ??
        normalizada.precio_de_compra;

      const precio = parsePrecio(precioRaw);
      if (Number.isNaN(precio) || precio < 0) {
        omitidas += 1;
        return;
      }

      let producto = null;
      if (idRaw !== undefined && idRaw !== null && String(idRaw).trim() !== "") {
        producto = byId.get(String(idRaw).trim()) || null;
      }
      if (!producto && nombreRaw) {
        producto = byNombre.get(String(nombreRaw).trim().toLowerCase()) || null;
      }
      if (!producto) {
        omitidas += 1;
        return;
      }

      cambios[producto.id] = precio.toFixed(2);
      aplicadas += 1;
    });

    return { cambios, aplicadas, omitidas };
  };

  const parseCsvLine = (line, separator) => {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const csvToRows = (text) => {
    const lines = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((line) => line.trim() !== "");

    if (lines.length < 2) return [];
    const sample = lines[0];
    const separator = sample.includes(";") ? ";" : sample.includes("\t") ? "\t" : ",";
    const headers = parseCsvLine(lines[0], separator);

    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line, separator);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      return row;
    });
  };

  const handleImportarArchivo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setBulkError("Por ahora solo CSV. Exporta el Excel a .csv e intenta de nuevo.");
      return;
    }

    setBulkError("");
    setBulkSuccess("");
    try {
      setIsImporting(true);
      const text = await file.text();
      const rows = csvToRows(text);
      const { cambios, aplicadas, omitidas } = parseArchivoPrecios(rows);

      if (aplicadas === 0) {
        setBulkError("No se detectaron filas validas. Usa columnas: id o nombre + precio_compra.");
        return;
      }

      setPreciosEditables((prev) => ({ ...prev, ...cambios }));
      setBulkSuccess(
        omitidas > 0
          ? `Importadas ${aplicadas} filas. Omitidas ${omitidas}.`
          : `Importadas ${aplicadas} filas.`
      );
    } catch (err) {
      setBulkError(err?.message || "No se pudo leer el archivo.");
    } finally {
      setIsImporting(false);
    }
  };

  const handlePrecioChange = (productoId, value) => {
    setBulkError("");
    setBulkSuccess("");
    setPreciosEditables((prev) => ({
      ...prev,
      [productoId]: value,
    }));
  };

  const getCambiosPrecioCompra = () => {
    return filteredProductos
      .map((producto) => {
        const editable = preciosEditables[producto.id];
        const nuevo = parsePrecio(editable);
        const actual = parsePrecio(producto.precio_compra);
        return {
          id: producto.id,
          nombre: producto.nombre,
          nuevo,
          actual,
        };
      })
      .filter((item) => !Number.isNaN(item.nuevo) && item.nuevo !== item.actual);
  };

  const resetPreciosEditables = () => {
    const editableMap = {};
    productos.forEach((producto) => {
      editableMap[producto.id] = `${producto.precio_compra ?? ""}`;
    });
    setPreciosEditables(editableMap);
    setBulkError("");
    setBulkSuccess("");
  };

  const handleGuardarPreciosMasivo = async () => {
    setBulkError("");
    setBulkSuccess("");
    const filaInvalida = filteredProductos.find((producto) => {
      const raw = preciosEditables[producto.id];
      if (raw === null || raw === undefined || raw === "") return true;
      const valor = parsePrecio(raw);
      return Number.isNaN(valor) || valor < 0;
    });
    if (filaInvalida) {
      setBulkError(`Precio invalido en ${filaInvalida.nombre}.`);
      return;
    }

    const cambios = getCambiosPrecioCompra();
    if (cambios.length === 0) {
      setBulkError("No hay cambios para guardar.");
      return;
    }

    try {
      setIsSavingBulk(true);
      const results = await Promise.allSettled(
        cambios.map((item) =>
          updateProducto(item.id, { precio_compra: item.nuevo.toFixed(2) })
        )
      );
      const errores = results.filter((result) => result.status === "rejected");
      if (errores.length > 0) {
        setBulkError(
          `Se actualizaron ${cambios.length - errores.length} de ${cambios.length} productos.`
        );
      } else {
        setBulkSuccess(`Se actualizaron ${cambios.length} productos.`);
      }
      await loadProductos();
    } catch (err) {
      setBulkError(err?.message || "No se pudieron guardar los precios.");
    } finally {
      setIsSavingBulk(false);
    }
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

  return (
    <div className="mx-auto w-full max-w-[1400px] p-2 text-left text-white">

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div></div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border ${isFilterOpen || nombreFiltro
              ? "bg-[#CAED4E] text-black border-transparent shadow-md"
              : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
              }`}
          >
            <FunnelIcon className="h-4 w-4 mr-1 inline-block" />
            Filtros {nombreFiltro && "(Activo)"}
          </Button>
          <Button
            type="button"
            className="rounded-xl px-4 py-2 text-xs font-semibold bg-[#CAED4E] text-black hover:opacity-90 transition duration-200"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            Crear producto
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {isFilterOpen && (
        <form
          className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-stone-800 bg-[#111111] p-5 shadow-lg items-end"
          onSubmit={handleBuscar}
        >
          <div className="flex flex-col md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Buscar por nombre</label>
            <input
              type="text"
              placeholder="Ej. Pollo entero..."
              className="mt-2 w-full rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-600 focus:border-stone-700 outline-none transition duration-200"
              value={nombreFiltro}
              onChange={(event) => setNombreFiltro(event.target.value)}
            />
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

      {/* Mass prices edit panel */}
      <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900/10 p-5 shadow-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-200">
              Edición masiva de costo (precio de compra)
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Modifica directamente la columna o importa un archivo CSV con columnas <strong>id</strong> o <strong>nombre</strong> y <strong>precio_compra</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <label className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black bg-[#CAED4E] hover:opacity-90 transition duration-200 cursor-pointer">
              {isImporting ? "Importando..." : "Importar CSV"}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportarArchivo}
                disabled={isImporting || isSavingBulk}
              />
            </label>
            <Button
              type="button"
              className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-stone-800 text-stone-200 hover:bg-stone-700 transition duration-200"
              onClick={resetPreciosEditables}
              disabled={isSavingBulk}
            >
              Descartar
            </Button>
            <Button
              type="button"
              className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black bg-[#CAED4E] hover:opacity-90 transition duration-200"
              onClick={handleGuardarPreciosMasivo}
              disabled={isSavingBulk}
            >
              {isSavingBulk ? "Guardando..." : "Guardar precios"}
            </Button>
          </div>
        </div>

        {bulkError ? (
          <div className="mb-4 rounded-xl border border-rose-900/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-300">
            {bulkError}
          </div>
        ) : null}

        {bulkSuccess ? (
          <div className="mb-4 rounded-xl border border-emerald-900/30 bg-emerald-950/20 px-4 py-2 text-xs text-emerald-300">
            {bulkSuccess}
          </div>
        ) : null}

        {/* Table view */}
        <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/10 shadow-lg">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-950/50 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Rubro</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3 w-[150px]">Costo ($)</th>
                <th className="px-4 py-3">Minorista</th>
                <th className="px-4 py-3">Mayorista</th>
                <th className="px-4 py-3">Exclusivo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-900 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                    <span className="inline-block w-5 h-5 border-2 border-[#CAED4E] border-t-transparent rounded-full animate-spin mr-2" />
                    Cargando productos...
                  </td>
                </tr>
              ) : null}
              {!isLoading && filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                    No se encontraron productos en la base.
                  </td>
                </tr>
              ) : null}
              {!isLoading && displayedProductos.map((producto) => (
                <tr key={producto.id} className="hover:bg-stone-900/30 transition duration-150 align-middle">
                  <td className="px-4 py-3 font-semibold text-stone-200">{producto.nombre}</td>
                  <td className="px-4 py-3 text-stone-400 capitalize">{producto.rubro}</td>
                  <td className="px-4 py-3 text-stone-400">{producto.unidad_medida}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-28 rounded-xl border border-stone-800 bg-stone-950/60 p-2 text-sm text-white focus:border-stone-700 outline-none transition duration-200"
                      value={preciosEditables[producto.id] ?? ""}
                      onChange={(event) => handlePrecioChange(producto.id, event.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3 text-stone-300">{formatArs(producto.precio_minorista)}</td>
                  <td className="px-4 py-3 text-stone-300">{formatArs(producto.precio_mayorista)}</td>
                  <td className="px-4 py-3 text-stone-300">{formatArs(producto.precio_mayorista_exclusivo)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        className="rounded-lg bg-stone-800 hover:bg-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-200 transition"
                        onClick={() => handleEdit(producto)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        className="rounded-lg bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 border border-rose-800/40 px-3 py-1.5 text-xs font-semibold transition"
                        onClick={() => handleDelete(producto.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2 py-3 border-t border-stone-900">
            <div className="text-xs text-stone-500">
              Mostrando <span className="font-semibold text-stone-300">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredProductos.length)}</span> a <span className="font-semibold text-stone-300">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProductos.length)}</span> de <span className="font-semibold text-stone-300">{filteredProductos.length}</span> productos
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
      </div>

      {/* CRUD modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-stone-900 border border-stone-800 p-6 text-left shadow-2xl text-white">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-md p-1 text-stone-400 hover:text-white hover:bg-stone-800 transition"
              onClick={resetForm}
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId ? "Editar Producto" : "Crear Nuevo Producto"}
            </h3>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {formError ? (
                <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 px-4 py-2.5 text-xs text-rose-300">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Rubro</label>
                <select
                  className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200 capitalize"
                  value={form.rubro}
                  onChange={(event) =>
                    handleInputChange("rubro", event.target.value)
                  }
                >
                  <option value="">Seleccionar rubro</option>
                  {RUBROS.map((rubro) => (
                    <option key={rubro} value={rubro}>
                      {rubro}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. Suprema de pollo"
                  className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                  value={form.nombre}
                  onChange={(event) =>
                    handleInputChange("nombre", event.target.value)
                  }
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales..."
                  className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                  value={form.descripcion}
                  onChange={(event) =>
                    handleInputChange("descripcion", event.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Unidad</label>
                  <select
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200 capitalize"
                    value={form.unidad_medida}
                    onChange={(event) =>
                      handleInputChange("unidad_medida", event.target.value)
                    }
                  >
                    <option value="">Seleccionar</option>
                    {UNIDADES.map((unidad) => (
                      <option key={unidad} value={unidad}>
                        {unidad}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Costo (Compra)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white placeholder-stone-700 focus:border-stone-700 outline-none transition duration-200"
                    value={form.precio_compra}
                    onChange={(event) =>
                      handleInputChange("precio_compra", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 py-1">
                <input
                  id="oferta-activa"
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-800 bg-stone-950/60 text-[#CAED4E] focus:ring-0 focus:ring-offset-0"
                  checked={form.es_oferta}
                  onChange={(event) =>
                    handleInputChange("es_oferta", event.target.checked)
                  }
                />
                <label htmlFor="oferta-activa" className="text-sm font-semibold text-stone-300 select-none">
                  Oferta activa
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Inicio oferta</label>
                  <input
                    type="date"
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200"
                    value={form.fecha_inicio_oferta}
                    onChange={(event) =>
                      handleInputChange("fecha_inicio_oferta", event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Fin oferta</label>
                  <input
                    type="date"
                    className="mt-2 rounded-xl border border-stone-800 bg-stone-950/60 p-2.5 text-sm text-white focus:border-stone-700 outline-none transition duration-200"
                    value={form.fecha_fin_oferta}
                    onChange={(event) =>
                      handleInputChange("fecha_fin_oferta", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button
                  type="submit"
                  className="w-full rounded-xl px-4 py-3 text-sm font-semibold bg-[#CAED4E] text-black hover:opacity-90 transition duration-200"
                >
                  {editingId ? "Actualizar Producto" : "Crear Producto"}
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
