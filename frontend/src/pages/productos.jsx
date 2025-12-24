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
  const [nombreFiltro, setNombreFiltro] = useState("");
  const [useFiltro, setUseFiltro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
      setProductos(data || []);
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
    <div className="mx-auto mt-2 w-full max-w-lg p-4 text-center">
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

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-600">Cargando productos...</p>
        ) : null}
        {!isLoading && filteredProductos.length === 0 ? (
          <p className="text-sm text-gray-600">No hay registros para mostrar.</p>
        ) : null}
        {filteredProductos.map((producto) => (
          <div
            key={producto.id}
            className="neuro-shadow-div p-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                {producto.nombre}
              </span>
              <span className="text-xs rounded-full bg-neutral-300 px-2 py-1 text-gray-700">
                {producto.unidad_medida}
              </span>
            </div>
            <p className="text-sm text-gray-700">Rubro: {producto.rubro}</p>
            <p className="text-sm text-gray-700">
              Precio compra: {formatArs(producto.precio_compra)}
            </p>
            <p className="text-sm text-gray-700">
              Precio minorista: {formatArs(producto.precio_minorista)}
            </p>
            <p className="text-sm text-gray-700">
              Precio mayorista: {formatArs(producto.precio_mayorista)}
            </p>
            {producto.es_oferta ? (
              <p className="text-sm text-green-700">
                Oferta activa: {formatArs(producto.precio_oferta)}
              </p>
            ) : null}
            {producto.fecha_inicio_oferta ? (
              <p className="text-xs text-gray-600">
                Inicio oferta: {producto.fecha_inicio_oferta}
              </p>
            ) : null}
            {producto.fecha_fin_oferta ? (
              <p className="text-xs text-gray-600">
                Fin oferta: {producto.fecha_fin_oferta}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleEdit(producto)}
              >
                Editar
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
                onClick={() => handleDelete(producto.id)}
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



