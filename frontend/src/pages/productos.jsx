import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { createProducto, deleteProducto, getProductos, updateProducto } from "../services/api/productos";

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
  const [productos, setProductos] = useState([]);
  const [preciosEditables, setPreciosEditables] = useState({});
  const [nombreFiltro, setNombreFiltro] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
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
    <div className="mx-auto mt-2 w-full max-w-lg lg:max-w-none p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Productos</h2>
      <p className="mt-1 text-sm text-gray-600">
        Gestion de productos y precios base.
      </p>

      <form
        className="mt-4 grid grid-cols-3 gap-3 rounded-xl pedidos-shadow p-4 text-left"
        onSubmit={handleBuscar}
      >
        <div className="flex flex-col col-span-3">
          <label className="text-sm font-medium text-gray-700">Buscar</label>
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
          Crear producto
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

      <div className="mt-4 rounded-xl pedidos-shadow p-4 text-left">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800">
            Edicion masiva de precio de compra
          </h3>
          <div className="flex gap-2">
            <label className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300 cursor-pointer">
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
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
              onClick={resetPreciosEditables}
              disabled={isSavingBulk}
            >
              Descartar cambios
            </Button>
            <Button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
              onClick={handleGuardarPreciosMasivo}
              disabled={isSavingBulk}
            >
              {isSavingBulk ? "Guardando..." : "Guardar precios"}
            </Button>
          </div>
        </div>
        {bulkError ? <p className="mb-2 text-sm text-red-600">{bulkError}</p> : null}
        {bulkSuccess ? <p className="mb-2 text-sm text-green-700">{bulkSuccess}</p> : null}
        <p className="mb-2 text-xs text-gray-600">
          Formato CSV sugerido: columnas <strong>id</strong> o <strong>nombre</strong> y <strong>precio_compra</strong>.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-gray-700">
                <th className="px-2 py-2">Producto</th>
                <th className="px-2 py-2">Rubro</th>
                <th className="px-2 py-2">Unidad</th>
                <th className="px-2 py-2">Precio compra</th>
                <th className="px-2 py-2">Minorista</th>
                <th className="px-2 py-2">Mayorista</th>
                <th className="px-2 py-2">Mayorista exclusivo</th>
                <th className="px-2 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-2 py-4 text-center text-gray-600">
                    Cargando productos...
                  </td>
                </tr>
              ) : null}
              {!isLoading && filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-4 text-center text-gray-600">
                    No hay registros para mostrar.
                  </td>
                </tr>
              ) : null}
              {!isLoading && filteredProductos.map((producto) => (
                <tr key={producto.id} className="border-b border-gray-200 align-top">
                  <td className="px-2 py-2 font-medium text-gray-800">{producto.nombre}</td>
                  <td className="px-2 py-2 text-gray-700 capitalize">{producto.rubro}</td>
                  <td className="px-2 py-2 text-gray-700">{producto.unidad_medida}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-32 rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-300"
                      value={preciosEditables[producto.id] ?? ""}
                      onChange={(event) => handlePrecioChange(producto.id, event.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2 text-gray-700">{formatArs(producto.precio_minorista)}</td>
                  <td className="px-2 py-2 text-gray-700">{formatArs(producto.precio_mayorista)}</td>
                  <td className="px-2 py-2 text-gray-700">{formatArs(producto.precio_mayorista_exclusivo)}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                        onClick={() => handleEdit(producto)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
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
              {editingId ? "Editar producto" : "Nuevo producto"}
            </h3>
            <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
              {formError ? (
                <p className="text-sm text-red-600">{formError}</p>
              ) : null}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Rubro</label>
                <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                  <select
                    className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
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
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                  value={form.nombre}
                  onChange={(event) =>
                    handleInputChange("nombre", event.target.value)
                  }
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Descripcion</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                  value={form.descripcion}
                  onChange={(event) =>
                    handleInputChange("descripcion", event.target.value)
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Unidad</label>
                  <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                    <select
                      className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
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
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Precio compra</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.precio_compra}
                    onChange={(event) =>
                      handleInputChange("precio_compra", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="oferta-activa"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.es_oferta}
                  onChange={(event) =>
                    handleInputChange("es_oferta", event.target.checked)
                  }
                />
                <label htmlFor="oferta-activa" className="text-sm font-medium text-gray-700">
                  Oferta activa
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Inicio oferta</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.fecha_inicio_oferta}
                    onChange={(event) =>
                      handleInputChange("fecha_inicio_oferta", event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">Fin oferta</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                    value={form.fecha_fin_oferta}
                    onChange={(event) =>
                      handleInputChange("fecha_fin_oferta", event.target.value)
                    }
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
              >
                {editingId ? "Actualizar producto" : "Crear producto"}
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




